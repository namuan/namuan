---
name: webapp-qa
description: Automated browser QA for any web project via reusable Playwright scripts — spec-driven end-to-end smoke tests, design-system audits (fonts/colors/overflow/template-brace artifacts), and responsive viewport checks. Use when asked to "verify", "test", "audit", or "QA" a web app, or before declaring a UI done. Scripts take a URL + a small JSON spec, so they work against any project (dev server, preview deploy, or file). For screenshots and visual review, use the sibling webapp-shots skill.
disable-model-invocation: true
---

# Webapp QA — verify any web UI in a browser

A small toolkit that turns ad-hoc browser checks into repeatable, spec-driven
verification. Born from a session where ad-hoc Playwright scripts caught real
bugs (a stale reactive UI, an IndexedDB key collision) before the user ever saw
them. Every script runs a real Chromium, captures console errors + uncaught page
errors, and prints PASS/FAIL lines.

Screenshots are **not** handled here — the sibling **webapp-shots** skill owns
all capture work (full-page, element, responsive sets, device emulation,
light/dark, HTML contact sheets). See "Screenshots" below.

## Requirements

- `node` ≥ 20
- A chromium build somewhere on disk. Discovery is automatic and lives in the
  sibling webapp-shots skill's `lib.mjs` (the single copy of the browser
  plumbing). Order: `$PLAYWRIGHT_CHROMIUM` env var / `--executable <path>`
  flag, then the Playwright browser cache (`~/Library/Caches/ms-playwright`,
  `~/.cache/ms-playwright`, or Windows equivalent), then playwright's default
  registry. Headless runs prefer a headless-shell build.
- `playwright-core`. Resolved by webapp-shots' `lib.mjs` from, in order:
  `$PLAYWRIGHT_CORE_PATH`, `<project>/node_modules/playwright-core`,
  `<webapp-shots>/scripts/node_modules/playwright-core` (already installed
  there), then a bare import. No global install needed.

## Commands

All scripts live in `scripts/`. They share `qa-lib.mjs` (which re-exports the
browser plumbing from webapp-shots and adds the QA-specific helpers:
error capture, reporter, overflow/artifact detectors) — import it in your own
custom scripts.

| Script | Purpose                                                                                                   | Invocation                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `qa-smoke.mjs`      | End-to-end walk of the critical user journey, PASS/FAIL per step                                          | `node scripts/qa-smoke.mjs spec.json`                        |
| `qa-audit.mjs`      | Verify the design system is _applied_: colors, fonts, overflow, artifacts, errors — in light **and** dark | `node scripts/qa-audit.mjs audit.json`                       |
| `qa-responsive.mjs` | Overflow + sticky-nav checks at 390/768/1024/1440px                                                       | `node scripts/qa-responsive.mjs <url> [widths] [--sel .toc]` |

All scripts accept `--headed` (visible browser) and `--executable <path>`
(pin a specific chromium).

## Screenshots

For screenshots, use the sibling **webapp-shots** skill:

```
node <webapp-shots>/scripts/capture.mjs shots.json
```

It captures full-page, element-clipped, responsive multi-width, and
device-emulated views in light/dark, writes an HTML contact sheet, and reuses
the same playwright-core + chromium discovery. The webapp-qa `qa-shots.mjs`
script was removed in favor of it — don't recreate it here.

The smoke-test DSL keeps one inline `screenshot` step (in `qa-smoke.mjs`) for
capturing evidence mid-run; bulk capture is webapp-shots' job.

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
5. **Responsive** once the primary flow is green. When you need visual review
   (screenshots, contact sheets), switch to the `webapp-shots` skill.

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
