---
name: pi-background-tab-bridge
description: Use the local Pi Background Tab Bridge to inspect and interact with the user's explicitly approved Chrome tab without activating it. Use for browser tasks through this project's bridge, including snapshots, form entry, clicks, navigation, and checking connection or permissions.
---

# Pi Background Tab Bridge

Use this skill whenever browser work should happen in the user's approved Chrome tab through the local bridge. Keep all work within the currently approved tab. Do not open or control other tabs unless the user explicitly approves them.

## Bridge lifecycle, files, and authentication

Manage the bridge for each browser task from any working directory:

1. Check `pi-background-tab-bridge health` and `pi-background-tab-bridge status` before starting anything.
2. If health reports `connected: true`, reuse the bridge and do not stop it when done; it may be owned by the user or another task.
3. If health reports `connected: false`, the bridge is already running. Do not start a second server; ask the user to reconnect/approve the extension tab.
4. If the global command is unavailable, install it once from `/Users/nnn/workspace/browser-works` using `npm run setup:global`. If `node_modules` is missing, run `npm ci` first.
5. If the health request cannot connect, start the bridge with `bg_run` using `pi-background-tab-bridge start`. Save the returned job ID and stop only that job with `bg_kill` after the browser task is complete. Do not launch it with `&`, `nohup`, or a polling shell loop.
6. Startup reuses `.pi-bridge-token`, so a restart normally retains extension pairing.

The bridge creates `.pi-bridge-token` with owner-only permissions. The token file is git-ignored. `client.mjs` reads it and authenticates requests. When the user needs to pair the extension, run `pi-background-tab-bridge token`, show that current token in a user-facing setup message, and ask them to paste it into the extension popup and click **Allow Pi to use this tab**. Ask them to confirm when done, then verify `pi-background-tab-bridge status`. If they also need cross-site control, ask them to click **Allow Pi on all websites** and accept Chrome's prompt. Only display the token for this pairing step; do not repeat it in unrelated output.

Check the connection with:

```sh
pi-background-tab-bridge status
```

A connected response includes `connected: true` and the approved tab ID. The unauthenticated health endpoint only reports connection state:

```sh
curl -s http://127.0.0.1:43127/health
```

Send a bridge command through the client:

```sh
pi-background-tab-bridge command '{"type":"snapshot"}'
pi-background-tab-bridge command '{"type":"inspect"}'
```

If the bridge says there is no approved tab, or status says disconnected, use the pairing flow above. After the user confirms and status reports a connected approved tab, ask what browser task they want to continue with unless they already stated it. The extension stores the selected tab ID and automatically reconnects; a heartbeat keeps its service worker connection alive.

## Website permissions

Approving a tab selects which tab the bridge targets. Website host permissions are separate. The extension requests optional access to all sites only after the user clicks **Allow Pi on all websites** in the popup and accepts Chrome's permission prompt. This broad host permission does not change the bridge's approved-tab-ID restriction. Chrome internal pages and protected pages remain unavailable.

If access to a site is denied, check the permission state with the user and request the appropriate extension permission. Do not try to bypass Chrome's permission prompt. After extension code or manifest changes, the user must reload the unpacked extension at `chrome://extensions`.

## Supported commands

Commands are JSON objects passed to the global command with the `command` subcommand:

- `snapshot`: return page title, URL, and visible body text.
- `inspect`: list interactive controls with visible text and accessibility attributes. Prefer stable IDs or `aria-label` selectors; generated `nth-of-type` selectors may not be reliable.
- `click`: click a CSS selector.
- `clickText`: click one button or role-button with exact visible text. It errors if the match is ambiguous.
- `type`: enter text in a CSS-selected input or textarea.
- `navigate`: navigate the approved tab to an HTTP or HTTPS URL without intentionally activating it.
- `evaluate`: accepts JavaScript source, but has returned `null` in testing. Do not rely on it for results until verified in the current extension build; use `snapshot` and `inspect` instead.

Examples:

```sh
pi-background-tab-bridge command '{"type":"clickText","text":"Search"}'
pi-background-tab-bridge command '{"type":"type","selector":"textarea[placeholder*=\"Search\"]","text":"example query"}'
pi-background-tab-bridge command '{"type":"navigate","url":"https://example.com"}'
```

## Page navigation and loading

A successful `navigate` response confirms that navigation was requested, not that the destination finished loading. Immediately taking a snapshot can return the previous page or an intermediate loading state. Verify the snapshot URL and title. For slow search sites, wait before checking again and require an explicit final state such as results, a result count, or “No matching results found.” Do not conclude that there are no results from an early snapshot that still says “Loading.”

Use the supported `type` and `click` commands to operate the page. Prefer named or accessible controls over positional selectors. After changing filters, inspect the resulting page and confirm each requested constraint is active before reporting matches. Report prices as displayed, distinguish per-person from total, and include relevant fees or availability caveats when shown.

## Safety and interaction boundaries

Only operate the currently approved tab and only perform the browser actions the user requested. Do not book, purchase, send, or submit high-impact actions without clear user authorization. At the end of the browser task, stop the bridge with `bg_kill` only if this skill started it. Only reveal the bearer token in the requested extension-pairing step. Never include it in unrelated output or summaries. The bridge is bound to loopback, but its token authorizes page control; treat the ignored token file as sensitive local state.
