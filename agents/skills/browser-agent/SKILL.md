---
name: browser-agent
description: Drive a real Chromium browser from the command line and capture everything the DevTools protocol exposes (network, console, logs, exceptions, websockets, dialogs, downloads, performance). Use when an agent needs to (1) capture a full DevTools-style record of a URL for later analysis, (2) steer a web page step by step via JSON commands and observe live results, or (3) open a visible browser so a human can drive it while the agent records everything and polls until the window is closed.
---

# Browser Agent — Drive & Observe

`scripts/agent_browser.py` is a single-file, uv-based CLI that launches a real
Chromium browser (via Playwright) and relays every DevTools event back to the
caller as JSON. No global installs; `uv` handles the dependency.

Three usage modes:

1. **One-shot capture** — open a URL, settle, dump everything.
2. **Interactive drive** — agent sends JSON commands on stdin, reads events/results as NDJSON on stdout.
3. **Watch / session** — agent opens a visible browser, a human drives it, everything is recorded, and the agent polls until the window is closed.

## Requirements

- `uv` — https://docs.astral.sh/uv/
- Once per machine: `uvx playwright install chromium` (Chromium is the browser; CDP capture is Chromium-only)

## Mode 1 — One-shot capture

```bash
scripts/agent_browser.py -u https://example.com -o traffic.json
scripts/agent_browser.py -u https://example.com --stream
scripts/agent_browser.py -u https://example.com -o traffic.json --capture-bodies --settle 5
```

- With `-o`: full JSON dump written to the file; summary printed to stderr.
- Without `-o`: full JSON dump printed to stdout (agent can capture it).
- `--stream`: every DevTools event printed live as NDJSON on stdout.
- `--capture-bodies`: fetch response bodies via the CDP Network domain (capped by `--max-body-bytes`).

## Mode 2 — Interactive drive

```bash
scripts/agent_browser.py -i
```

The agent sends one JSON command per line on stdin and receives NDJSON events
plus command results on stdout. Commands are correlated by an incrementing
`id` in the `result` events.

```json
{"cmd": "navigate", "url": "https://example.com"}
{"cmd": "snapshot"}
{"cmd": "type", "selector": "#search", "text": "uv rocks"}
{"cmd": "click", "selector": "#btn"}
{"cmd": "extract", "selector": "#output"}
{"cmd": "evaluate", "expression": "document.title"}
{"cmd": "close"}
```

Result shape: `{"event": "result", "id": N, "cmd": "...", "ok": true, "data": {...}}`.
Errors come back as `{"event": "result", "id": N, "ok": false, "error": "..."}` —
never an unparsable crash. Any captured event can interleave between results.

### Command reference

| Command | Fields | Returns |
|---|---|---|
| `navigate` (alias `goto`) | `url`, `timeout` (s) | final url, title, status, error |
| `snapshot` | `max_chars` | url, title, body text |
| `status` | — | current url + title |
| `click` | `selector`, `timeout_ms` | selector, url |
| `type` | `selector`, `text` | selector, chars |
| `press` | `key` | key |
| `evaluate` | `expression` | result or error |
| `extract` | `selector`, `attribute` | text, attribute |
| `content` | `max_chars` | page HTML |
| `wait` | `ms` | waited_ms |
| `wait_for` | `selector`, `timeout_ms` | found bool |
| `screenshot` | `path`, `full_page` | path |
| `scroll` | `x`, `y` | x, y |
| `select` | `selector`, `value`/`label`/`index` | selected values |
| `check` | `selector`, `checked` | checked |
| `reload` / `back` / `forward` | — | url |
| `cookies` | — | all context cookies |
| `close` | — | ends session |

## Mode 3 — Watch / session (human drives the browser)

```bash
scripts/agent_browser.py --watch -u https://example.com --session demo
```

A visible browser opens for a human to drive. Every DevTools event streams to
stdout as NDJSON and is persisted under `<tmpdir>/agent_browser_sessions/<name>/`:

| File | Contents |
|---|---|
| `session.json` | manifest: status (`running`/`closed`/`timeout`/`error`), timings, event summary, console error list |
| `events.ndjson` | every event as it happened (live append, includes a trailing `session.ended` marker) |
| `dump.json` | full DevTools dump (same structure as one-shot output) |

The session ends automatically when the user closes the browser window, when
the last tab/window is closed, or when `--max-duration <seconds>` elapses.
Dialogs are recorded but left for the human (not auto-dismissed).

Query commands (no browser launched):

```bash
scripts/agent_browser.py --list-sessions                 # all manifests as JSON
scripts/agent_browser.py --show-session demo            # full dump.json as JSON
scripts/agent_browser.py --show-session demo | jq '.events[] | select(.event=="console")'
```

Sessions are stored under `<tmpdir>/agent_browser_sessions/` by default
(override with `--sessions-dir DIR`). The script never writes into the
caller's working directory. When a session starts, the path is printed to
stderr as `[session] <name> -> <path>` so the agent can discover it.
`--session NAME` also works with one-shot and interactive modes. Reusing an
existing session name errors (exit 2) instead of overwriting. `--watch` and
`-i` are mutually exclusive (exit 2).

## Agent workflow: open, let the user drive, process after close

This is the pattern for "agent starts a session, a human drives the browser,
the agent gets all DevTools data afterward":

1. **Start the session** (background it if the agent must keep running):
   `scripts/agent_browser.py --watch -u <url> --session <name>`
   Confirm it is up: `--list-sessions` shows `status: running`.
2. **Ask the user to drive** the visible browser; tell them to close the window when done.
3. **Poll until close** — check every few seconds, sleeping between checks:
   ```bash
   for i in $(seq 1 20); do
     sess=$(scripts/agent_browser.py --list-sessions 2>/dev/null | python3 -c "
   import json,sys
   s=[x for x in json.load(sys.stdin) if x['id']=='<name>']
   print(s[0]['status'] if s else 'not_found')")
     [ "$sess" = "running" ] || { echo "closed: $sess"; break; }
     sleep 5
   done
   ```
4. **Process the output** after close: read `--show-session <name>` (or
   `<tmpdir>/agent_browser_sessions/<name>/dump.json`) and analyse
   `events` + `summary`; the manifest's `console.errors` gives a quick
   error list.

## Interpreting the dump

Top-level dump shape: `meta` (command, mode, session, timings), `summary`
(counts per event type), `events[]` (ordered DevTools events), `performance`
(getMetrics + metric events), `final` (url, title, capped HTML).

Key event types: `network.request` / `network.response` (url, method, status,
headers, timing, cache flags), `network.body` / `network.body_error` (captured
bodies), `network.failed` (load failures), `network.request_extra` /
`network.response_extra` (full headers, cookies), `websocket.*`, `console`
(level, text, location, typed args), `log` (browser-side logs),
`pageerror`, `runtime.exception`, `dialog`, `popup`, `download`,
`session.started` / `session.ended`.

## Gotchas

- `net::ERR_ABORTED` failures are **navigation aborts** — in-flight requests
  cancelled when the page navigates or the browser closes. Normal, not errors.
- `network.body_error` ("No data found for resource...") happens for
  redirects, 204/beacon responses and some cached responses. Expected CDP
  behavior; the tool records it as a structured event.
- Some sites (e.g. GitHub) emit **zero console messages** on a clean load —
  empty console data is a valid result, not a capture failure.
- Beacon/telemetry requests (e.g. `collector.github.com`, HTTP 204) may show
  more requests than responses; they are still in flight when the window ends.
- Default is headless; `--headed` shows a window. `--watch` always forces a
  visible window (a human must drive it).
- URLs without a scheme default to `https://`.
