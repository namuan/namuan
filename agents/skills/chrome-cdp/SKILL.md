---
name: chrome-cdp
description: Interact with local Vivaldi browser session via CDP (Chrome DevTools Protocol). Primary browser is Vivaldi, but also supports Chrome/Chromium/Brave/Edge. Use for inspecting, debugging, or interacting with pages.
---

# Vivaldi CDP

Lightweight Chrome DevTools Protocol CLI for Vivaldi (primary) and other Chromium-based browsers. Connects directly via WebSocket — no Puppeteer, works with 100+ tabs, instant connection.

## Prerequisites

- **Vivaldi** (primary) with remote debugging enabled: open `vivaldi://inspect/#remote-debugging` and toggle the switch
- Node.js 22+ (uses built-in WebSocket)
- Auto-detects browser port file in: `~/Library/Application Support/Vivaldi/` (macOS), `~/.config/vivaldi/` (Linux)
- For other browsers or custom paths, set `CDP_PORT_FILE` to the full path of `DevToolsActivePort`

### Vivaldi-Specific Notes

- Vivaldi exposes only the browser-level WebSocket (no `/json` HTTP endpoint)
- Auto-detection searches Vivaldi first, then Chrome/Chromium/Brave/Edge
- Each new tab requires one-time "Allow debugging" approval (persistent via background daemon)
- Daemons auto-exit after 20 minutes of inactivity

## Commands

All commands use `scripts/cdp.mjs`. The `<target>` is a **unique** targetId prefix from `list`; copy the full prefix shown in the `list` output (for example `6BE827FA`). The CLI rejects ambiguous prefixes.

### List open pages

```bash
scripts/cdp.mjs list
```

### Take a screenshot

```bash
scripts/cdp.mjs shot <target> [file]    # default: screenshot-<target>.png in runtime dir
```

Captures the **viewport only**. Scroll first with `eval` if you need content below the fold. Output includes the page's DPR and coordinate conversion hint (see **Coordinates** below).

### Accessibility tree snapshot

```bash
scripts/cdp.mjs snap <target>
```

### Evaluate JavaScript

```bash
scripts/cdp.mjs eval <target> <expr>
```

> **Watch out:** avoid index-based selection (`querySelectorAll(...)[i]`) across multiple `eval` calls when the DOM can change between them (e.g. after clicking Ignore, card indices shift). Collect all data in one `eval` or use stable selectors.

### Other commands

```bash
scripts/cdp.mjs html    <target> [selector]   # full page or element HTML
scripts/cdp.mjs nav     <target> <url>         # navigate and wait for load
scripts/cdp.mjs net     <target>               # resource timing entries
scripts/cdp.mjs click   <target> <selector>    # click element by CSS selector
scripts/cdp.mjs clickxy <target> <x> <y>       # click at CSS pixel coords
scripts/cdp.mjs type    <target> <text>         # Input.insertText at current focus; works in cross-origin iframes unlike eval
scripts/cdp.mjs loadall <target> <selector> [ms]  # click "load more" until gone (default 1500ms between clicks)
scripts/cdp.mjs evalraw <target> <method> [json]  # raw CDP command passthrough
scripts/cdp.mjs open    [url]                  # open new tab (each triggers Allow prompt)
scripts/cdp.mjs stop    [target]               # stop daemon(s)
```

## Event Capture

Record a full debug session (console, network, exceptions, WebSocket) to a JSONL file while browsing:

```bash
scripts/capture.mjs <target> [options]
```

**Options:**
- `--output <file>` — JSONL output (default: `cdp-<target>-<timestamp>.jsonl`)
- `--no-bodies` — skip request/response bodies
- `--max-body <bytes>` — max body size to capture (default: 1MB)
- `--domains <list>` — comma-separated CDP domains (default: Network,Runtime,Console,Page,Log,Debugger)

**Example:**
```bash
# Start capture in background
scripts/capture.mjs ABC123 --output debug.jsonl &

# Browse in Vivaldi...

# Stop capture (prints summary)
kill %1
```

**Captured events:**
- Console logs (`console.log`, errors)
- Network requests/responses (URLs, headers, **bodies**)
- WebSocket frames
- JavaScript exceptions (with stack traces)
- Page lifecycle events (navigation, load, DOMContentLoaded)

**Analyze captures:**
```bash
# Quick summary (recommended)
scripts/capture-summary.mjs debug.jsonl

# Or use jq for custom queries
# Count events by type
jq -r '.type' debug.jsonl | sort | uniq -c

# Show console messages
jq -r 'select(.type == "console") | .params.args[0].value' debug.jsonl

# List all network requests
jq -r 'select(.type == "network_request") | "\(.params.request.method) \(.params.request.url)"' debug.jsonl
```

## Coordinates

`shot` saves an image at native resolution: image pixels = CSS pixels × DPR. CDP Input events (`clickxy` etc.) take **CSS pixels**.

```
CSS px = screenshot image px / DPR
```

`shot` prints the DPR for the current page. Typical Retina (DPR=2): divide screenshot coords by 2.

## Tips

- Prefer `snap --compact` over `html` for page structure.
- Use `type` (not eval) to enter text in cross-origin iframes — `click`/`clickxy` to focus first, then `type`.
- Vivaldi shows an "Allow debugging" modal once per tab on first access. A background daemon keeps the session alive so subsequent commands need no further approval. Daemons auto-exit after 20 minutes of inactivity.
- For long debugging sessions, use `capture.mjs` to record all events to JSONL, then analyze offline.
- Vivaldi's DevToolsActivePort is at `~/Library/Application Support/Vivaldi/DevToolsActivePort` on macOS.
