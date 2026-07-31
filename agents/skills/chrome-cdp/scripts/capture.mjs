#!/usr/bin/env node
// CDP event capture — streams console, network, page, log, and exception
// events from a single tab to a JSONL file. Run in background while you
// browse; Ctrl-C to stop (writes a summary to stderr).
//
// Usage:
//   capture.mjs <targetId> [--output file.jsonl] [--no-bodies] [--max-body N]
//
// Env:
//   CDP_PORT_FILE   path to DevToolsActivePort (auto-detects Chrome/Vivaldi/Brave/Edge)

import { readFileSync, createWriteStream, existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

function help() {
  process.stderr.write(`
Usage: capture.mjs <targetId> [options]

Options:
  --output <file>     JSONL output (default: cdp-<targetId>-<timestamp>.jsonl in cwd)
  --no-bodies         Skip capturing request/response bodies
  --max-body <bytes>  Max body size to capture (default: 1048576 = 1MB)
  --domains <list>    Comma-separated domains to enable
                      (default: Network,Runtime,Console,Page,Log,Debugger)
  --help

Output: one JSON object per line.
Stop with Ctrl-C. A summary is printed to stderr on exit.
`);
  process.exit(0);
}

// ---------- args ----------
const args = process.argv.slice(2);
if (args.includes('--help')) help();

function idx(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? i : -1;
}

const flagTakesValue = new Set(['--output', '--max-body', '--domains']);
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--') && flagTakesValue.has(args[i])) { i++; continue; }
  if (!args[i].startsWith('--')) positional.push(args[i]);
}
const targetPrefix = positional[0];
if (!targetPrefix) { process.stderr.write('Error: targetId required\n'); help(); }

const captureBodies = !args.includes('--no-bodies');
const maxBody = parseInt(args[idx('--max-body') ?? -1] || '1048576', 10);
const outputFile = args[idx('--output') >= 0 ? idx('--output') + 1 : -1]
  || `cdp-${targetPrefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;

const defaultDomains = ['Network', 'Runtime', 'Console', 'Page', 'Log', 'Debugger'];
const domainListIdx = idx('--domains');
const domains = domainListIdx >= 0
  ? args[domainListIdx + 1].split(',').map(s => s.trim()).filter(Boolean)
  : defaultDomains;

// ---------- resolve browser WS URL ----------
function findPortFile() {
  if (process.env.CDP_PORT_FILE && existsSync(process.env.CDP_PORT_FILE)) return process.env.CDP_PORT_FILE;
  const home = homedir();
  const candidates = [
    'Google/Chrome', 'Vivaldi', 'BraveSoftware/Brave-Browser',
    'Microsoft Edge', 'Chromium',
  ].flatMap(b => [
    resolve(home, 'Library/Application Support', b, 'DevToolsActivePort'),
    resolve(home, 'Library/Application Support', b, 'Default/DevToolsActivePort'),
    resolve(home, '.config', b, 'DevToolsActivePort'),
  ]);
  const found = candidates.find(p => existsSync(p));
  if (!found) throw new Error('No DevToolsActivePort found. Enable remote debugging in your browser.');
  return found;
}

function getBrowserWsUrl() {
  const portFile = findPortFile();
  const lines = readFileSync(portFile, 'utf8').trim().split('\n');
  if (lines.length < 2 || !lines[0] || !lines[1]) throw new Error(`Invalid DevToolsActivePort: ${portFile}`);
  const host = process.env.CDP_HOST || '127.0.0.1';
  return { wsUrl: `ws://${host}:${lines[0]}${lines[1]}`, port: lines[0] };
}

const { wsUrl: browserWsUrl } = getBrowserWsUrl();

// ---------- CDP client ----------
class CDP {
  #ws; #id = 0; #pending = new Map(); #eventHandlers = new Map(); #closeHandlers = [];
  async connect(url) {
    return new Promise((res, rej) => {
      this.#ws = new WebSocket(url);
      this.#ws.onopen = () => res();
      this.#ws.onerror = (e) => rej(new Error('WebSocket error: ' + (e.message || e.type)));
      this.#ws.onclose = () => this.#closeHandlers.forEach(h => h());
      this.#ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.id && this.#pending.has(msg.id)) {
          const { resolve, reject } = this.#pending.get(msg.id);
          this.#pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else if (msg.method) {
          const handlers = this.#eventHandlers.get(msg.method);
          if (handlers) for (const h of [...handlers]) h(msg.params || {}, msg);
          // Also fire wildcard
          const allHandlers = this.#eventHandlers.get('*');
          if (allHandlers) for (const h of [...allHandlers]) h(msg.params || {}, msg);
        }
      };
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      this.#ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (this.#pending.has(id)) {
          this.#pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, 30000);
    });
  }
  onEvent(method, handler) {
    if (!this.#eventHandlers.has(method)) this.#eventHandlers.set(method, new Set());
    this.#eventHandlers.get(method).add(handler);
    return () => this.#eventHandlers.get(method)?.delete(handler);
  }
  onClose(handler) { this.#closeHandlers.push(handler); }
  close() { this.#ws.close(); }
}

// ---------- main ----------
const cdp = new CDP();
try {
  await cdp.connect(browserWsUrl);
} catch (e) {
  process.stderr.write(`Cannot connect to browser: ${e.message}\n`);
  process.exit(1);
}

// Find target by prefix
const { targetInfos } = await cdp.send('Target.getTargets');
const upper = targetPrefix.toUpperCase();
const matches = targetInfos.filter(t => t.targetId.toUpperCase().startsWith(upper));
if (matches.length === 0) {
  process.stderr.write(`No target matches prefix "${targetPrefix}". Available:\n`);
  for (const t of targetInfos.filter(t => t.type === 'page')) {
    process.stderr.write(`  ${t.targetId.slice(0, 12)}  ${t.url?.slice(0, 80) ?? ''}\n`);
  }
  cdp.close();
  process.exit(1);
}
if (matches.length > 1) {
  process.stderr.write(`Ambiguous prefix "${targetPrefix}" — matches ${matches.length} targets.\n`);
  for (const t of matches) process.stderr.write(`  ${t.targetId}  ${t.url}\n`);
  cdp.close();
  process.exit(1);
}
const target = matches[0];

// Attach to target
let sessionId;
try {
  const res = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  sessionId = res.sessionId;
} catch (e) {
  process.stderr.write(`Attach failed: ${e.message}\n`);
  cdp.close();
  process.exit(1);
}

// ---------- output ----------
const out = createWriteStream(resolve(outputFile), { flags: 'a' });
let seq = 0;
const writeLine = (obj) => {
  seq++;
  obj.seq = seq;
  obj.ts = obj.ts || new Date().toISOString();
  out.write(JSON.stringify(obj) + '\n');
};

const counters = {
  events: 0, console: 0, networkRequests: 0, networkResponses: 0,
  networkBodies: 0, wsFrames: 0, pageNavigations: 0, exceptions: 0, logEntries: 0,
};
const requestIds = new Map(); // requestId -> { url, method }
let pendingBodies = 0;

process.stderr.write(`✓ attached to target ${target.targetId}\n`);
process.stderr.write(`  title: ${target.title ?? '(none)'}\n`);
process.stderr.write(`  url:   ${target.url ?? '(none)'}\n`);
process.stderr.write(`  writing to: ${resolve(outputFile)}\n`);
process.stderr.write(`  bodies: ${captureBodies ? `on (max ${maxBody} bytes)` : 'off'}\n`);
process.stderr.write(`  domains: ${domains.join(', ')}\n\n`);

writeLine({ type: 'session_start', targetId: target.targetId, url: target.url, title: target.title, domains });

// Enable domains on the session
for (const d of domains) {
  const params = d === 'Network' ? { maxResourceBufferSize: 10 * 1024 * 1024, maxTotalBufferSize: 50 * 1024 * 1024 } : {};
  try {
    await cdp.send(`${d}.enable`, params, sessionId);
  } catch (e) {
    process.stderr.write(`! failed to enable ${d}: ${e.message}\n`);
  }
}

process.stderr.write('✓ all domains enabled. capturing events… (Ctrl-C to stop)\n\n');

// Listen for all events, filter by sessionId
cdp.onEvent('*', (params, msg) => {
  if (msg.sessionId && msg.sessionId !== sessionId) return; // not our target
  if (!msg.sessionId && !['Target.targetDestroyed', 'Target.targetCreated', 'Target.targetInfoChanged'].includes(msg.method)) return;

  counters.events++;
  const { method } = msg;

  switch (method) {
    case 'Runtime.consoleAPICalled':
      counters.console++;
      writeLine({ type: 'console', method, params });
      break;
    case 'Log.entryAdded':
      counters.logEntries++;
      writeLine({ type: 'log', method, params });
      break;
    case 'Runtime.exceptionThrown':
      counters.exceptions++;
      writeLine({ type: 'exception', method, params });
      break;
    case 'Network.requestWillBeSent':
      counters.networkRequests++;
      if (params.request) requestIds.set(params.requestId, { url: params.request.url, method: params.request.method });
      writeLine({ type: 'network_request', method, params });
      if (captureBodies && params.request?.postData && params.request.postData.length <= maxBody) {
        writeLine({
          type: 'body', direction: 'request', requestId: params.requestId,
          url: params.request?.url, mimeType: params.request?.headers?.['content-type'] ?? '',
          size: params.request.postData.length, data: params.request.postData, base64Encoded: false,
        });
        counters.networkBodies++;
      }
      break;
    case 'Network.responseReceived':
      counters.networkResponses++;
      writeLine({ type: 'network_response', method, params });
      break;
    case 'Network.loadingFinished':
      if (!captureBodies) break;
      const info = requestIds.get(params.requestId);
      pendingBodies++;
      cdp.send('Network.getResponseBody', { requestId: params.requestId }, sessionId)
        .then(result => {
          const size = result.base64Encoded
            ? Math.round((result.body?.length ?? 0) * 3 / 4)
            : (result.body?.length ?? 0);
          if (size > maxBody) {
            writeLine({ type: 'body', direction: 'response', requestId: params.requestId, url: info?.url, mimeType: params.mimeType ?? '', size, truncated: true, reason: 'exceeds max-body' });
          } else {
            writeLine({ type: 'body', direction: 'response', requestId: params.requestId, url: info?.url, mimeType: params.mimeType ?? '', size, data: result.body, base64Encoded: !!result.base64Encoded });
          }
          counters.networkBodies++;
        })
        .catch(err => {
          writeLine({ type: 'body', direction: 'response', requestId: params.requestId, url: info?.url, error: err.message });
        })
        .finally(() => {
          pendingBodies--;
          if (stopping && pendingBodies === 0) finalize();
        });
      break;
    case 'Network.loadingFailed':
      writeLine({ type: 'network_failure', method, params });
      break;
    case 'Network.webSocketCreated':
    case 'Network.webSocketWillSendHandshakeRequest':
    case 'Network.webSocketHandshakeResponseReceived':
    case 'Network.webSocketFrameSent':
    case 'Network.webSocketFrameReceived':
    case 'Network.webSocketFrameError':
    case 'Network.webSocketClosed':
      counters.wsFrames++;
      writeLine({ type: 'websocket', method, params });
      break;
    case 'Page.frameNavigated':
      counters.pageNavigations++;
      writeLine({ type: 'page', method, params });
      break;
    case 'Page.loadEventFired':
    case 'Page.domContentEventFired':
    case 'Page.javascriptDialogOpening':
    case 'Page.javascriptDialogClosed':
    case 'Page.lifecycleEvent':
      writeLine({ type: 'page', method, params });
      break;
    default:
      writeLine({ type: 'event', method, params });
  }
});

// ---------- shutdown ----------
let stopping = false;
function finalize() {
  out.end(() => {
    process.stderr.write(`\n=== capture summary ===\n`);
    process.stderr.write(`file:          ${resolve(outputFile)}\n`);
    process.stderr.write(`total events:  ${counters.events}\n`);
    process.stderr.write(`  console:     ${counters.console}\n`);
    process.stderr.write(`  log:         ${counters.logEntries}\n`);
    process.stderr.write(`  exceptions:  ${counters.exceptions}\n`);
    process.stderr.write(`  net request: ${counters.networkRequests}\n`);
    process.stderr.write(`  net response:${counters.networkResponses}\n`);
    process.stderr.write(`  net bodies:  ${counters.networkBodies}\n`);
    process.stderr.write(`  ws frames:   ${counters.wsFrames}\n`);
    process.stderr.write(`  page navs:   ${counters.pageNavigations}\n`);
    process.exit(0);
  });
}

function stop() {
  if (stopping) return;
  stopping = true;
  process.stderr.write('\n— stopping (Ctrl-C again to force) —\n');
  try { cdp.close(); } catch {}
  setTimeout(() => {
    process.stderr.write('force-exiting after 3s\n');
    finalize();
  }, 3000).unref();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
cdp.onClose(() => {
  if (!stopping) {
    process.stderr.write('\n— browser disconnected —\n');
    stop();
  }
});
