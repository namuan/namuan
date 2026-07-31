---
name: browser-agent
description: Drive a real Chromium browser from the command line and capture everything the DevTools protocol exposes (network, console, logs, exceptions, websockets, dialogs, downloads, performance). Use when an agent needs to open a visible browser so a human can drive it while the agent records everything and polls until the window is closed.
---

# Browser Agent — Drive & Observe

`scripts/agent_browser.py` is a single-file, uv-based CLI that launches a real
Chromium browser (via Playwright) and relays every DevTools event back to the
caller as JSON. No global installs; `uv` handles the dependency.

## Usage

```bash
scripts/agent_browser.py -u https://example.com --session demo
```

A visible browser opens for a human to drive. Every DevTools event streams to
stdout as NDJSON and is persisted under `<tmpdir>/agent_browser_sessions/<name>/`.
The session ends automatically when the user closes the browser window, when
the last tab/window is closed, or when `--max-duration <seconds>` elapses.
Dialogs are recorded but left for the human (not auto-dismissed).

## Requirements

- `uv` — https://docs.astral.sh/uv/
- Once per machine: `uvx playwright install chromium` (Chromium is the browser; CDP capture is Chromium-only)

## Anti-Detection (Stealth Mode)

The browser runs with `playwright-stealth` enabled by default to avoid bot detection. This masks automation signals like the `navigator.webdriver` property, randomizes plugins/languages/WebGL, and applies other techniques to make the browser appear more human-like.

Stealth mode is **enabled by default**. To disable it:

```bash
scripts/agent_browser.py -u https://example.com --no-stealth
```

Additional options for sites with strict anti-bot protection:

```bash
# Use a proxy
scripts/agent_browser.py -u https://example.com --proxy "http://proxy:8080"

# Set locale and timezone
scripts/agent_browser.py -u https://example.com --locale "en-US" --timezone "America/New_York"
```

## Mode 1 — Watch / session (default — human drives the browser)

```bash
scripts/agent_browser.py -u https://example.com --session demo
```

No mode flag is needed — watch is the default. A visible browser opens for a
human to drive. Every DevTools event streams to stdout as NDJSON and is
persisted under `<tmpdir>/agent_browser_sessions/<name>/`:

| File | Contents |
|---|---|
| `session.json` | manifest: status (`running`/`closed`/`timeout`/`error`), timings, event summary, console error list |
| `events.ndjson` | every event as it happened (live append, includes a trailing `session.ended` marker) |
| `dump.json` | full DevTools dump (network, console, logs, performance, etc.) |

The session ends automatically when the user closes the browser window, when
the last tab/window is closed, or when `--max-duration <seconds>` elapses.
Dialogs are recorded but left for the human (not auto-dismissed).

## Sessions

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

- A session is always created automatically; if `--session NAME` is omitted,
  a timestamped name is generated.
- Reusing an existing session name errors (exit 2) instead of overwriting.

## Agent workflow: open, let the user drive, process after close

This is the pattern for "agent starts a session, a human drives the browser,
the agent gets all DevTools data afterward":

1. **Start the session** (background it if the agent must keep running):
    `scripts/agent_browser.py -u <url> --session <name>`
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
- The browser always opens in headed mode (visible window) so a human can drive it.
- URLs without a scheme default to `https://`.
