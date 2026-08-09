---
name: webapp-shots
description: Spec-driven screenshot capture for any web project — full-page, element-clipped, and responsive viewport sets in light/dark color schemes, retina DPR, and device-emulated mobile views, all with an auto-generated HTML contact sheet for visual review. Use when asked to "screenshot", "capture screenshots", "take a screenshot of the app", "show me what the UI looks like", "visual check", or before declaring a UI done. Scripts take a URL + a small JSON spec, so they work against any project (dev server, preview deploy, or file).
---

# Webapp Shots — screenshot any web UI

Spec-driven screenshot capture, built on the same principles as webapp-qa:
JSON specs instead of browser code, real Chromium, no global install, and
useful output you can actually review. Where webapp-qa *asserts* behavior,
this skill *records* pixels — a full-page view, a clipped element, a
responsive set at several widths, retina, light/dark, or an emulated phone —
and drops an HTML contact sheet next to the PNGs so the results are
one glance (or one browser tab) away.

## Requirements

- `node` ≥ 20
- A chromium build somewhere on disk. Discovery is automatic:
  1. `$PLAYWRIGHT_CHROMIUM` env var / `--executable <path>` flag
  2. Playwright's browser cache (`~/Library/Caches/ms-playwright`,
     `~/.cache/ms-playwright`, or Windows equivalent) — newest build wins
  3. playwright's default registry (if `playwright` is installed)
- `playwright-core`. Resolved automatically from, in order: `$PLAYWRIGHT_CORE_PATH`,
  `<project>/node_modules/playwright-core`, `<skill>/scripts/node_modules/playwright-core`
  (one-time `cd scripts && npm i playwright-core`), sibling skill installs,
  then a bare import. No global install needed.

## Commands

All scripts live in `scripts/`. They share `lib.mjs` (playwright-core
resolution, chromium discovery, device-aware page creation, contact-sheet
writer) — import it in your own custom scripts.

| Script | Purpose | Invocation |
|---|---|---|
| `capture.mjs` | The whole job: run the spec, write PNGs + manifest + contact sheet | `node scripts/capture.mjs shots.json` |
| `gallery.mjs` | Regenerate the HTML contact sheet from an existing manifest (no re-capture) | `node scripts/gallery.mjs <outDir>` |

Both accept `--headed` (visible browser) and `--executable <path>` (pin a
specific chromium). `capture.mjs` also accepts `--out <dir>`.

## Workflow

1. **Confirm the app is reachable.** If it's a dev server, start it. If it's a
   file, serve it (`python3 -m http.server`) — file:// URLs break ES module +
   CDN loads.
2. **Write the shots spec.** List the views worth a second look: the landing
   view, the detail view after a click, the empty state, mobile widths. Start
   from `references/examples/example-shots.json`. Full DSL in
   `references/shots-spec.md`.
3. **Run.** `node scripts/capture.mjs shots.json`. Every PNG path prints on
   its own line as it lands.
4. **Review.** Open `<out>/index.html` — thumbnail grid, name filter (`/` to
   focus), click any card for the full image. Iterate on the app, re-run, and
   eyeball the diffs side by side.

## Reading the output

- One PNG per capture. Multi-viewport shots get a `--WxH` suffix
  (`01-home--390.png`); subdirectories in `name` are created automatically.
- `manifest.json` records every capture (file, viewport, color scheme,
  fullPage/element) — feed it to your own tooling or regenerate the gallery.
- `index.html` is a self-contained dark contact sheet — open it in any browser.
- Console errors are reported at the end as warnings, not failures (screenshots
  don't assert) — but they're worth a look, since a noisy console often means
  the shot is of a broken state. Favicon 404 noise is filtered.

## Capture quality (learned the hard way)

- **Fonts load late.** Every capture waits for `document.fonts.ready` before
  shooting, so the typography in the PNG matches the settled app.
- **Animations ruin shots.** `reducedMotion` is on by default and screenshots
  disable CSS animations — no half-finished transitions.
- **Cursors and spinners.** Carets are hidden; unstable regions (spinners,
  live tickers) can be pinked out with `mask`.
- **Dark mode is a different app.** Capture key views in both schemes —
  `"colorScheme": "dark"` per shot or spec.
- **Mobile is not just a narrower window.** Use `"device": "iPhone 13"` for
  the real viewport, DPR, touch behavior, and UA — or `deviceScaleFactor: 2`
  for retina-crisp desktop shots.
- **`text=…` selectors click the wrong element** when text appears twice.
  Scope with `.preview__foot .btn--primary`.
- **WASM/IndexedDB apps need generous timeouts** on first `wait` (20-30s)
  while the runtime boots.
- **A click without a wait shoots the wrong frame.** Always follow an
  interaction with a `wait` for the result surface, then a `sleep`/`settle`
  for async renders.

## Extending

The spec DSL covers navigation, waits, and capture options; if you need
something it doesn't, write a short custom script that imports from
`lib.mjs` (`loadPlaywright`, `launchBrowser`, `newPage`, `writeGallery`,
`readSpec`, `parseArgs`). The `newPage` helper takes a device descriptor,
viewport, and color scheme, so custom captures stay consistent with spec
runs.
