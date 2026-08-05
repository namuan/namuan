# Smoke test specs — `qa-smoke.mjs`

A smoke test is a short, spec-driven walk of the critical user journey. The
goal is not exhaustive coverage — it's catching "the app is broken" in seconds.

## Spec shape

```json
{
  "url": "http://localhost:5173",
  "timeout": 30000,
  "viewport": { "width": 1440, "height": 900 },
  "dialogs": "accept",
  "steps": [ ]
}
```

- `timeout` — default wait timeout (per-step `timeout` overrides)
- `dialogs` — `"accept"` or `"dismiss"` to auto-handle browser dialogs
  (confirm()/alert()). Omit it to leave them to Playwright's default (dismiss).

## Steps

| Step | Shape | Notes |
|---|---|---|
| goto | `{ "url": … }` | if present, the first step; spec-level `url` does this automatically |
| wait | `{ "wait": ".selector" }` | `waitForSelector`, default or per-step timeout |
| waitText | `{ "waitText": "Visible label" }` | shorthand for `text=` selector |
| click | `{ "click": "button:has-text(\"Save\")" }` | Playwright selector, `text=` works |
| fill | `{ "fill": { "sel": ".search", "value": "Noori" } }` | |
| press | `{ "press": { "sel": ".input", "key": "Enter" } }` | |
| sleep | `{ "sleep": 500 }` | milliseconds — for settling async renders |
| screenshot | `{ "screenshot": "/tmp/shots/01.png", "fullPage": true }` | |
| expect | see below | every expect prints a PASS/FAIL line |

## Expect forms

```json
{ "expect": { "label": "optional readable name", "count": { "sel": ".row", "eq": 8 } } }
{ "expect": { "count": { "sel": ".row", "gt": 8 } } }     // also gte, lt, lte
{ "expect": { "visible": ".detail" } }
{ "expect": { "hidden": ".spinner" } }
{ "expect": { "text": { "sel": ".title", "contains": "Noori" } } }
{ "expect": { "text": { "sel": ".title", "eq": "Exact" } } }
{ "expect": { "noErrors": true } }        // console + page errors so far (favicon noise filtered)
{ "expect": { "noOverflow": true } }      // horizontal overflow anywhere in the page
```

## Recipe: the 8-step app check

The pattern that caught real bugs on the Liveshelf prototype — reuse the shape:

1. `wait` for the app's primary content selector (boot screen gone)
2. `expect count` — the seeded/initial dataset is present (e.g. 8 rows)
3. `fill` a search field, `expect count` narrowed to 1
4. `click` the primary CTA, `wait` for its result panel
5. `click` the confirm action, `expect count` grew
6. open a detail view, `fill` + `press Enter` to commit a value, `expect` it rendered
7. exercise the persistence/sync path (push/pull/export)
8. `expect noErrors` — this one catches the silent bugs (stale state, IDB
   collisions, "key already exists") that "it loaded fine" misses

## Selector tips

- **`text=` matches substrings and can match multiple elements.** If a toolbar
  button and a confirm button both say "Import", Playwright clicks the first in
  DOM order — which is usually the wrong one. Scope with
  `.preview__foot .btn--primary` or `button:has-text("Import 3")`.
- **Prefer stable classes over brittle text** for elements that move around.
- **Verify state changes, not just visibility.** `expect count` after an action
  proves reactivity; `visible` only proves rendering.
