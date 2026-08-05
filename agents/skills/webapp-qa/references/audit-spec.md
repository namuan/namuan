# Audit specs — `qa-audit.mjs`

Design systems are *written* in CSS but only exist if the browser *applies*
them. The audit asserts the applied reality: computed styles, not source.

## Spec shape

```json
{
  "url": "http://localhost:5173",
  "colorSchemes": ["light", "dark"],
  "waitFor": ".app",
  "settle": 600,
  "checks": [
    { "label": "body bg is warm paper, not white", "css": "body", "prop": "backgroundColor", "ne": "rgb(255, 255, 255)" },
    { "label": "body bg is warm paper", "css": "body", "prop": "backgroundColor", "eq": "rgb(246, 241, 231)" },
    { "label": "heading font is serif", "css": ".page__title", "prop": "fontFamily", "contains": "Fraunces" },
    { "label": "body font is a real stack", "css": "body", "prop": "fontFamily", "ne": "system-ui" }
  ],
  "noOverflow": true,
  "noArtifacts": true,
  "noErrors": true
}
```

- `colorSchemes` — runs the whole audit once per scheme. **Always include both**;
  theme bugs are invisible in a single scheme. Default `["light", "dark"]`.
- `waitFor` — selector to wait for before measuring (default `body`).
- `settle` — ms to sleep after load (fonts/animations).

## Matchers (exactly one per check)

| Matcher | Meaning |
|---|---|
| `eq` | computed value equals exactly |
| `ne` | computed value differs (great for "not white", "not default font") |
| `contains` | substring present (fonts: `"contains": "Fraunces"`) |
| `match` | regex tested against the value |

`prop` is any CSS property name as accepted by `getComputedStyle`, e.g.
`backgroundColor`, `color`, `fontFamily`, `fontSize`, `borderColor`,
`letterSpacing`, `padding`, `borderRadius`.

## Encoding the design system as checks

Turn the design tokens into assertions:

1. **Background** — page bg is the brand color, NOT pure white/black
2. **Fonts** — heading family, body family, mono family each contain their font
3. **Accent** — a primary button or link uses the accent color
4. **Surfaces** — a card/sidebar uses the surface color (catches unstyled DOM)
5. **Contrast sanity** — text color ≠ bg color
6. **Presence** — key selectors exist at all (`css` matches nothing → FAIL with `(no element)`)

## Automatic checks (no config needed)

- **`noOverflow`** — nothing renders wider than the viewport (grid/flex children
  that fail to shrink, non-wrapping code, fixed-width images).
- **`noArtifacts`** — template-literal braces leaked into visible text
  (`source--{t.source}` when a `${}` was forgotten).
- **`noErrors`** — zero console errors + page errors (favicon 404 filtered).
