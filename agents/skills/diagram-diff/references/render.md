# Rendering a graph document

A checked document becomes one self-contained HTML page, drawn by you with no tooling between the document and the picture. Four rules up front:

- **Deterministic.** Same document in, byte-identical page out. No randomness, no clock, no object-iteration order: draw in the document's array order.
- **Self-contained.** Everything the diagrams need lives in the one page this skill produces: styles inline, system font stacks, SMIL and CSS animation only. Both themes live in the same page, switched by `prefers-color-scheme`; every colour resolves from a CSS custom property defined by the page, never hard-coded in a diagram.
- **Stable lanes.** Lane width is a constant, never content-derived: adding a card with a long name to one lane must not slide the cards of the lanes beside it. A reviewer comparing two pushes must never see cards teleport.
- **Animated only where it means something.** Pulses say traffic; a static diagram is the default.

## Palettes

GitHub's own colour language, painted per theme. These values become the page's custom properties (`--background`, `--card`, `--edge`, `--added`, …) — defined for light mode on `:root`, overridden in the dark media query; `references/html.md` pins the names. Every stroke, fill and pulse in every diagram resolves from a property.

| Role | Light | Dark |
| --- | --- | --- |
| background | `#ffffff` | `#0d1117` |
| lane band | `#f6f8fa` | `rgba(110,118,129,.07)` |
| card | `#ffffff` | `#1c2128` |
| card border | `#d1d9e0` | `#3d444d` |
| foreground | `#1f2328` | `#e6edf3` |
| muted | `#59636e` | `#9198a1` |
| edge | `#8c959f` | `#6e7681` |
| added | `#1a7f37` | `#3fb950` |
| added fill | `#dafbe1` | `rgba(46,160,67,.15)` |
| added border | `rgba(31,136,61,.4)` | `rgba(63,185,80,.4)` |
| modified | `#9a6700` | `#d29922` |
| modified fill | `#fff8c5` | `rgba(187,128,9,.15)` |
| modified border | `rgba(154,103,0,.35)` | `rgba(210,153,34,.4)` |
| removed | `#d1242f` | `#f85149` |
| removed fill | `#ffebe9` | `rgba(248,81,73,.12)` |
| removed border | `rgba(209,36,47,.35)` | `rgba(248,81,73,.4)` |
| neutral fill | `#f6f8fa` | `rgba(110,118,129,.18)` |
| shadow | `rgba(31,35,40,.14)` | `rgba(0,0,0,.28)` |

Delta colouring: a card's border and fill come from the delta (added, modified, removed) or neutral-fill for unchanged; edge strokes take the delta colour; labels use the delta colour for prominent delta words. The delta badge on every card is drawn for you, so never restate a delta inside a label or summary.

Font stacks: sans `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`; mono `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`.

## Canvas and lanes

Diagram margin 16. Every lane: constant content width **372**, radius 12, left padding 16, gap 20 between lanes, bottom padding 20. Header: 44 tall, label baseline 68, label 10px with 0.12 tracking in the muted colour. Content starts at y 92.

Place lanes left to right by `layout.laneOrder` when the document carries one (it lists every lane exactly once), otherwise by `order` (ties fall back to array order); `layout.direction` says which way the graph reads (default `right`). `layout.rank` is a node-placement hint: prefer its order within a lane when the edges do not fight it. These are hints, not instructions: you own final placement, and a stale hint must never break the picture.

## Node cards

A card is a rounded rect (radius 10), height 52 — 62 when there is a subtitle — with 14px horizontal padding, 12px gap between cards in a row, rows 52px apart. An icon chip (26px, radius 7) sits at the left of the card and says "what sort of thing is this" at a glance — the kind enum is coarse on purpose, and every kind draws something. The glyphs, centred on the chip:

| kind | glyph |
| --- | --- |
| `service` | rounded square with a centre dot |
| `app` | box with a title bar |
| `module` | `{ }` in mono |
| `function` | italic ƒ |
| `route` | a filled chevron (right-pointing triangle) |
| `job` | circle with a play wedge |
| `queue` | three stacked horizontal lines |
| `datastore` | a cylinder (ellipse lid over a rounded body) |
| `cache` | a lightning bolt |
| `external` | a box with a chevron beneath its top edge |
| `ui` | a box with a vertical divider |
| `config` | two lines, each with a knob dot |
| `test` | a check mark |
| `package` | a 3D box (parallelogram lid) |
| `other` | three dots |

Title 13px (small step 11.5, floor 10.5 — step the title down a size before cutting its tail), subtitle 9.5px muted, all in the foreground colour; a card narrower than 200px dispenses with the chip. Up to six badges: pills 16px tall, 9px padding, 8.5px text with 0.06 tracking, 8px radius, sitting above the card's top edge with an 8px rise. A card's `summary` and `files` render in the view's section of the page, not on the card.

## Edges

Orthogonal routing between card edges, one elbow at a time. Edges sharing a run separate into parallel tracks (6px clearance, pitch between 10 and 16px) so crossings happen inside corridors and read as wiring, not spaghetti. A label (pill: 15px tall, 8px padding, 9.5px text) sits on the middle of the run, clear of every line. An arrowhead marks the end.

Emphasis changes the stroke, never the geometry: `hero` is thicker and carries the animated train; `muted` is thinner and recessive so context recedes; `normal` is in between. One hero, two at the outside — the emphasis stops meaning anything beyond that. Delta colours apply as above; an `animated: true` edge carries a pulse. An edge's `summary` renders in the view's section of the page, beside the node summaries — it is where "the change in one edge" claims belong.

## Animation

A pulse is a `circle` riding the edge's path with SMIL `animateMotion`, `repeatCount="indefinite"`; its fill resolves from a page custom property, never a literal:

```xml
<circle r="2.6" fill="var(--edge)">
  <animateMotion dur="1.6s" path="…" repeatCount="indefinite"/>
</circle>
```

A hero edge runs a train: three dots of radius 3, spread evenly around the 2.1s turn. For a shared cycle — the data-flow clock — every message's pulse shares one duration, and each step lags behind the drawing's clock by its place in the queue: `begin = (lag + duration/count × i) % duration`, written as a **negative** `begin` when non-zero (so the dot is already mid-flight at load; a positive delay would park the waiting dot at the path origin, in the corner, in full view, for the first seconds). One dot crosses one arrow at a time, in the order the steps happen, and the next arrow lights as the last dot lands.

## The data-flow lens

Participants are real node cards across the top in array order — a participant's `label` replaces the node's label for that flow — with lifelines (the muted border colour) dropping from them; only waited-on work lights an activation bar. Messages in array order, which is also the animation order — there is no step number field, so the document cannot disagree with its own animation:

- `sync` — filled arrowhead; the called lifeline shows an activation bar while the caller waits.
- `async` — open arrowhead; fire-and-forget, no activation bar.
- `return` — dashed line, no head.
- `self` — a loop back to the same lifeline.
- `repeat` — the step happens more than once per run; show the count (e.g. ×4) by the label.
- `note` — renders muted beside the step's label.
- `animated: false` — keeps one step static while the shared clock runs the others.

## The final page

The deliverable is one HTML file, never separate SVGs. The page (`references/html.md`) embeds each diagram once as inline SVG and draws both themes from its CSS custom properties — one diagram, two palettes, no duplicated geometry.

Write the page from `drawn.graph.json` — the document with the `.github/diagram-map.yml` overlay applied, the only document the page may describe — and name it `<slug>.html`, the slug the document title in kebab-case. `drawn.graph.json` sits beside it in `.diagram/`; add `.diagram/` to `.gitignore`. The page must open from disk, with no network, and describe only what the diagrams show.