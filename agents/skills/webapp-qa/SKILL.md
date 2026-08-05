---
name: webapp-qa
description: Automated browser QA for any web project via reusable Playwright scripts — spec-driven end-to-end smoke tests, design-system audits (fonts/colors/overflow/template-brace artifacts), responsive viewport checks, and screenshot capture. Use when asked to "verify", "test", "audit", "QA", or "screenshot" a web app, or before declaring a UI done. Scripts take a URL + a small JSON spec, so they work against any project (dev server, preview deploy, or file).
---

# Webapp QA — verify any web UI in a browser

A small toolkit that turns ad-hoc browser checks into repeatable, spec-driven
verification. Born from a session where ad-hoc Playwright scripts caught real
bugs (a stale reactive UI, an IndexedDB key collision) before the user ever saw
them. Every script runs a real Chromium, captures console errors + uncaught page
errors, and prints PASS/FAIL lines.

## Requirements

- `node` ≥ 20
- A chromium build somewhere on disk. Discovery is automatic:
  1. `$PLAYWRIGHT_CHROMIUM` env var / `--executable <path>` flag
  2. Playwright's browser cache (`~/Library/Caches/ms-playwright`,
     `~/.cache/ms-playwright`, or Windows equivalent) — newest build wins
  3. playwright's default registry (if `playwright` is installed)
- `playwright-core`. Resolved automatically from, in order: `$PLAYWRIGHT_CORE_PATH`,
  `<project>/node_modules/playwright-core`, `<skill>/scripts/node_modules/playwright-core`
  (one-time `cd scripts && npm i playwright-core`), then a bare import.
  No global install needed.

## Commands

All scripts live in `scripts/`. They share `qa-lib.mjs` (browser resolution,
reporter, overflow/artifact detectors) — import it in your own custom scripts.

| Script              | Purpose                                                                                                   | Invocation                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `qa-smoke.mjs`      | End-to-end walk of the critical user journey, PASS/FAIL per step                                          | `node scripts/qa-smoke.mjs spec.json`                        |
| `qa-audit.mjs`      | Verify the design system is _applied_: colors, fonts, overflow, artifacts, errors — in light **and** dark | `node scripts/qa-audit.mjs audit.json`                       |
| `qa-responsive.mjs` | Overflow + sticky-nav checks at 390/768/1024/1440px                                                       | `node scripts/qa-responsive.mjs <url> [widths] [--sel .toc]` |
| `qa-shots.mjs`      | Screenshot key views for visual inspection                                                                | `node scripts/qa-shots.mjs shots.json`                       |

All scripts accept `--headed` (visible browser) and `--executable <path>`
(pin a specific chromium).

## Workflow

1. **Confirm the app is reachable.** If it's a dev server, start it. If it's a
   file, serve it (`python3 -m http.server`) — file:// URLs break ES module + CDN
   loads.
2. **Write the smoke spec.** Focus on the core user journey: boot → seed/load →
   primary action → secondary action → persistence check. See
   `references/smoke-spec.md` and `references/examples/liveshelf-smoke.json`.
3. **Write the audit spec.** Capture 3-6 computed-style checks that encode the
   design system (page bg, primary accent, heading font, a component surface).
   See `references/examples/liveshelf-audit.json`.
4. **Run.** `node scripts/qa-smoke.mjs spec.json` and
   `node scripts/qa-audit.mjs audit.json`. Fix whatever FAILs, then re-run.
5. **Responsive + screenshots** once the primary flow is green.

## Reading the output

- Every check prints `PASS  <label>` or `FAIL  <label>` with the actual value
  on failure. A trailing `summary()` line shows totals and sets a non-zero exit
  code if anything failed — pipe to CI if you like.
- **Benign console noise is filtered:** favicon 404s are ignored. Anything else
  that looks like a console error is a real finding.
- Page errors (`PAGEERROR:`) are always real — treat them as failures.

## Common failure modes (learned the hard way)

See `references/failure-modes.md` for the full list. The short version:

- **`text=…` selectors click the wrong element** when text appears twice (e.g. a
  toolbar button and a confirm button). Use precise selectors
  (`.preview__foot .btn--primary`).
- **"All green" but the UI is stale** → verify a reactive-UI assertion (a count
  that changes after an action) rather than just "page loaded".
- **WASM/IndexedDB apps need generous timeouts** on first `waitForSelector`
  (20-30s) while the runtime boots.
- **Theme bugs hide in dark mode** — every audit should run both color schemes.

## Extending

The scripts are deliberately generic: your app's flow lives in the JSON spec,
not in code. If you need a check the DSL doesn't cover, add a short custom
script that imports from `qa-lib.mjs` (`launchBrowser`, `captureErrors`,
`makeReporter`, `measureOverflow`), following the pattern in `qa-smoke.mjs`.
