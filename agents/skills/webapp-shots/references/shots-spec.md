# Screenshot specs — `capture.mjs`

A screenshot spec describes *what to capture and how to reach it* — never
*browser code*. The same spec works against a dev server, a preview deploy, or
a statically served build.

## Spec shape

```json
{
  "url": "http://localhost:5173",
  "out": "shots",
  "viewport": { "width": 1440, "height": 900 },
  "viewports": [390, 768, 1440],
  "device": "iPhone 13",
  "deviceScaleFactor": 2,
  "colorScheme": "light",
  "settle": 400,
  "fullPage": false,
  "timeout": 30000,
  "shots": []
}
```

| Key | Meaning |
|---|---|
| `url` | base URL every shot starts from (**required**) |
| `out` | output dir (default `./shots`; `--out` overrides) |
| `viewport` | default viewport for all shots |
| `viewports` | array of widths — capture **every** shot at each; entries are numbers (`390`, height 900), `{width,height}`, or `"390x844"` |
| `device` | Playwright device descriptor name (e.g. `"iPhone 13"`, `"iPad mini"`, `"Pixel 7"`) — real viewport, DPR, touch, UA |
| `deviceScaleFactor` | retina capture (2 = crisp on HiDPI screens) |
| `colorScheme` | `light` (default) \| `dark` \| `no-preference` |
| `settle` | ms to wait after the page settles, before each capture |
| `fullPage` | default for all shots (false) |
| `timeout` | default wait timeout (30s) |
| `reducedMotion` | `true` (default) — disables CSS/JS animations for deterministic captures |

## Shots

Each shot is `{ "name": …, … }`. `name` becomes the PNG filename; a relative
subdirectory is created automatically (`"gallery/01-home"`). Multi-viewport
shots get a `--WxH` suffix (`01-home--390.png`).

### Actions — `steps` array (preferred)

Run in order; every step runs in every viewport of the shot.

```json
{ "steps": [
  { "goto": "/library" },                     // relative to spec.url, or absolute
  { "wait": ".track__row" },                  // waitForSelector
  { "waitText": "Recently added" },           // text= shorthand
  { "click": ".track__row" },
  { "fill": { "sel": ".search", "value": "Noori" } },
  { "press": { "sel": ".search", "key": "Enter" } },
  { "sleep": 500 }                            // settle ms
] }
```

### Flat keys (shorthand)

`goto`, `click`, `fill`, `press`, `wait`, `waitText`, `sleep`/`delay` as
top-level keys. They run in that fixed order — interactions first, then
waits, then settle.

### Capture options

| Key | Meaning |
|---|---|
| `fullPage` | capture the whole scrollable page (default from spec) |
| `element` | clip to the first match of a selector; adds `padding` px around it |
| `mask` | `[" .spinner"]` — pink-out unstable regions (Playwright's native mask) |
| `background` | set page background color before capture (e.g. `"#0b0f19"`) |
| `transparent` | `true` — capture PNG with alpha (`omitBackground`) |
| `viewport` / `viewports` / `device` / `deviceScaleFactor` / `colorScheme` | per-shot overrides |

`element` and `fullPage` are mutually exclusive (element wins, with a warning).

## Output

- one PNG per capture
- `manifest.json` — machine-readable record of every capture (file, viewport,
  scheme, fullPage, element)
- `index.html` — dark contact sheet: thumbnail grid, name filter (`/` to
  focus), click to open the full image

Regenerate the sheet from an existing manifest without re-capturing:
`node scripts/gallery.mjs <outDir>`.
