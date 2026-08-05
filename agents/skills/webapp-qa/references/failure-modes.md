# Failure modes — real bugs these scripts catch, and how

Collected from the session that produced this skill. Each entry is a bug that
actually shipped past "it looks fine" and needed a browser check to surface.

## Rendering

### 1. Template-literal braces leak into the UI
**Symptom:** visible text contains something like `source--{t.source}`.

**Cause:** `className={\`source--${t.source}\`}` written as
`className={\`source--{t.source}\`}` — the interpolation is missing its `$`.

**Detection:** `qa-audit.mjs` `noArtifacts` (regex `[A-Za-z0-9_'"-]+\{...\}` over
the rendered text). `qa-smoke.mjs` `noErrors` won't catch this — nothing throws.

### 2. Dark mode is broken but light mode is fine
**Symptom:** colors/contrast collapse only under `prefers-color-scheme: dark`.

**Detection:** `qa-audit.mjs` runs every check in both schemes by default.
The classic culprit is a hardcoded light-theme color used in dark mode — e.g. a
dark-on-light text color on a dark background. Use theme-aware variables and let
CSS overrides handle text color.

## State / reactivity

### 3. IndexedDB "Key already exists in the object store"
**Symptom:** the second sync/pull fails with this error; data never arrives.

**Cause:** a record was written using a key that collides with an auto-increment
keyPath. Real case: pulled events carried their *origin device's* `seq` (the
local auto-increment key), which collided on append. Local orderings must be
regenerated on ingest, never reused.

**Pattern:** if your app is multi-device or pull-based, exercise the pull path
in the smoke test — single-device testing never hits this.

### 4. "All green" but the UI is stale (reactive store not invalidating)
**Symptom:** the app loads, actions "succeed", but rows never update.

**Real case:** the store notified subscribers with a `Set`, but the subscriber
called `.some()` on it → every re-render threw, so the UI froze at its initial
state. Nothing failed loudly; only a `noErrors`-style check at the end surfaced it.

**Pattern:** end the smoke test with `expect noErrors`. If your UI is
subscription/reactive, add a "count changed after action" assertion — that
proves the invalidation pipeline end-to-end.

### 5. Promise-returning API returns the wrong object
**Symptom:** `all.sort is not a function` or `Failed to read the 'result'
property from 'IDBRequest'` at odd times.

**Real case:** a `withTx()` helper resolved with the raw `IDBRequest` object
instead of awaiting its `result`. The async wrapper only resolved *after* the
transaction completed, so reads sometimes worked and sometimes didn't — a
classic "works locally, breaks in production" bug.

## Selectors & timing

### 6. `text=Import` clicks the wrong button
Playwright `text=` matches substrings and clicks the first DOM match. When a
toolbar button and a confirm button both contain "Import", the top one wins.
Scope with structure: `.preview__foot .btn--primary`.

### 7. WASM / IndexedDB apps need long first-load timeouts
sql.js (SQLite in WASM) + IndexedDB boot can take 10-30s on first load. A 5s
`waitForSelector` fails spuriously. Give the first `wait` 30s, later steps the
default. `waitUntil: 'domcontentloaded'` + explicit `waitForSelector` beats
`networkidle` (which never fires if the app keeps connections open).

### 8. Benign console noise looks like failures
- `/favicon.ico` 404 — always noise; filtered automatically
- React DevTools "download the React DevTools" info line — not an error
- CORS warnings — real, investigate
- `Failed to load resource` for an actual asset — real, investigate

When in doubt, look at the *page errors* (`PAGEERROR:`) — those are always real.
