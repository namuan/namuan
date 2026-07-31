#!/usr/bin/env node
// Analyze a CDP capture JSONL file and produce a formatted summary report.
// Usage: capture-summary.mjs <file.jsonl>

import { readFileSync } from 'fs';
import { resolve } from 'path';

const file = process.argv[2];
if (!file) {
  process.stderr.write('Usage: capture-summary.mjs <file.jsonl>\n');
  process.exit(1);
}

const lines = readFileSync(resolve(file), 'utf8').trim().split('\n');
const events = lines.map(l => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

if (events.length === 0) {
  process.stdout.write('No events found.\n');
  process.exit(0);
}

// Basic stats
const startTime = events[0].ts;
const endTime = events[events.length - 1].ts;
const durationMs = new Date(endTime) - new Date(startTime);
const durationSec = (durationMs / 1000).toFixed(1);

// Event type breakdown
const typeCounts = {};
events.forEach(e => {
  typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
});

// CDP method breakdown
const methodCounts = {};
events.forEach(e => {
  if (e.method) methodCounts[e.method] = (methodCounts[e.method] || 0) + 1;
});

// Network analysis
const networkRequests = events.filter(e => e.type === 'network_request');
const networkResponses = events.filter(e => e.type === 'network_response');
const networkBodies = events.filter(e => e.type === 'body' && e.direction === 'response');
const networkFailures = events.filter(e => e.type === 'network_failure');

// Unique domains
const domains = new Set();
networkRequests.forEach(e => {
  const url = e.params?.request?.url;
  if (url) {
    try {
      const u = new URL(url);
      domains.add(u.hostname);
    } catch {}
  }
});

// Status codes
const statusCounts = {};
networkResponses.forEach(e => {
  const status = e.params?.response?.status;
  if (status) statusCounts[status] = (statusCounts[status] || 0) + 1;
});

// Largest bodies
const sortedBodies = networkBodies
  .filter(b => b.size && b.url)
  .sort((a, b) => b.size - a.size)
  .slice(0, 10);

// Console messages
const consoleMsgs = events.filter(e => e.type === 'console');

// Exceptions
const exceptions = events.filter(e => e.type === 'exception');

// Log entries
const logEntries = events.filter(e => e.type === 'log');

// WebSocket activity
const wsEvents = events.filter(e => e.type === 'websocket');

// Output report
process.stdout.write(`## Capture Summary\n\n`);
process.stdout.write(`**File**: ${resolve(file)}\n`);
process.stdout.write(`**Duration**: ${durationSec}s (${startTime} → ${endTime})\n`);
process.stdout.write(`**Total events**: ${events.length}\n\n`);

process.stdout.write(`### Event Breakdown\n\n`);
process.stdout.write(`| Type | Count |\n|---|---|\n`);
Object.entries(typeCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    process.stdout.write(`| ${type} | ${count} |\n`);
  });

process.stdout.write(`\n### Network Activity\n\n`);
process.stdout.write(`- **Requests**: ${networkRequests.length}\n`);
process.stdout.write(`- **Responses**: ${networkResponses.length}\n`);
process.stdout.write(`- **Bodies captured**: ${networkBodies.length}\n`);
process.stdout.write(`- **Failures**: ${networkFailures.length}\n`);
process.stdout.write(`- **Unique domains**: ${domains.size}\n\n`);

if (domains.size > 0) {
  process.stdout.write(`**Domains contacted**:\n`);
  [...domains].sort().slice(0, 20).forEach(d => {
    process.stdout.write(`- ${d}\n`);
  });
  if (domains.size > 20) process.stdout.write(`- ... and ${domains.size - 20} more\n`);
  process.stdout.write(`\n`);
}

if (Object.keys(statusCounts).length > 0) {
  process.stdout.write(`**Response status codes**:\n`);
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      process.stdout.write(`- HTTP ${status}: ${count}\n`);
    });
  process.stdout.write(`\n`);
}

if (sortedBodies.length > 0) {
  process.stdout.write(`### Largest Downloads\n\n`);
  sortedBodies.forEach((b, i) => {
    const sizeMB = (b.size / 1024 / 1024).toFixed(2);
    const sizeKB = (b.size / 1024).toFixed(1);
    const sizeStr = b.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
    process.stdout.write(`${i + 1}. **${sizeStr}** — ${b.url.slice(0, 80)}\n`);
  });
  process.stdout.write(`\n`);
}

if (consoleMsgs.length > 0) {
  process.stdout.write(`### Console Messages (${consoleMsgs.length})\n\n`);
  consoleMsgs.slice(0, 10).forEach(e => {
    const args = e.params?.args || [];
    const val = args[0]?.value ?? args[0]?.description ?? '(complex)';
    process.stdout.write(`\`${val.toString().slice(0, 80)}\`\n`);
  });
  if (consoleMsgs.length > 10) process.stdout.write(`... and ${consoleMsgs.length - 10} more\n`);
  process.stdout.write(`\n`);
}

if (exceptions.length > 0) {
  process.stdout.write(`### Exceptions (${exceptions.length})\n\n`);
  exceptions.slice(0, 5).forEach(e => {
    const text = e.params?.exceptionDetails?.text ?? 'Unknown';
    process.stdout.write(`- ${text}\n`);
  });
  if (exceptions.length > 5) process.stdout.write(`... and ${exceptions.length - 5} more\n`);
  process.stdout.write(`\n`);
}

if (logEntries.length > 0) {
  process.stdout.write(`### Log Entries (${logEntries.length})\n\n`);
  logEntries.slice(0, 10).forEach(e => {
    const entry = e.params?.entry;
    if (entry) {
      process.stdout.write(`- **${entry.level}**: ${entry.text?.slice(0, 80) ?? ''}\n`);
    }
  });
  if (logEntries.length > 10) process.stdout.write(`... and ${logEntries.length - 10} more\n`);
  process.stdout.write(`\n`);
}

if (networkFailures.length > 0) {
  process.stdout.write(`### Network Failures (${networkFailures.length})\n\n`);
  networkFailures.slice(0, 10).forEach(e => {
    const errorText = e.params?.errorText ?? 'Unknown';
    const blockedReason = e.params?.blockedReason ?? '';
    process.stdout.write(`- ${errorText}${blockedReason ? ` (${blockedReason})` : ''}\n`);
  });
  if (networkFailures.length > 10) process.stdout.write(`... and ${networkFailures.length - 10} more\n`);
  process.stdout.write(`\n`);
}

if (wsEvents.length > 0) {
  const wsCreated = wsEvents.filter(e => e.method === 'Network.webSocketCreated').length;
  const wsSent = wsEvents.filter(e => e.method === 'Network.webSocketFrameSent').length;
  const wsReceived = wsEvents.filter(e => e.method === 'Network.webSocketFrameReceived').length;
  process.stdout.write(`### WebSocket Activity\n\n`);
  process.stdout.write(`- Connections created: ${wsCreated}\n`);
  process.stdout.write(`- Frames sent: ${wsSent}\n`);
  process.stdout.write(`- Frames received: ${wsReceived}\n\n`);
}

process.stdout.write(`---\n`);
process.stdout.write(`**Full capture**: ${resolve(file)} (${events.length} events)\n`);
