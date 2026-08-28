# The final output: one self-contained HTML page

The deliverable is a single HTML file. It carries both lenses, both themes, the stats row and the drill-down tree in one artifact that opens from disk with no network, no installed fonts and no build step. Generate the page from `drawn.graph.json` — the document with the `.github/diagram-map.yml` overlay applied — never from the draft.

## Why one file

- One artifact to open, send or attach; the diagrams and the page around them stop being separate things.
- `prefers-color-scheme` switches the theme natively, and SMIL animation inside inline SVG keeps running from `file://`.

## The page contract

- Valid HTML5: `<!doctype html>`, `<meta charset="utf-8">`, a `<title>` from the document title.
- **No external resources of any kind.** No stylesheet links, no image URLs, no webfonts. Everything is inline: one `<style>`, the diagrams as inline `<svg>`.
- Works with JavaScript disabled. A `<script>`, if one is used at all, must be inline and enhance-only.
- Both themes live in the one page: the palette (values in `references/render.md`, "Palettes") becomes CSS custom properties on `:root`, overridden inside `@media (prefers-color-scheme: dark)`. A diagram never hard-codes a colour; every stroke and fill resolves from a property. A page, unlike a proxied image, can do this.
- Deterministic: same document in, byte-identical page out.

## Structure of the page

- Header: the document `title`, the `summary` paragraph, then the stats row — files changed, additions, deletions, then the chips as pills.
- Architecture lens: the root view's diagram first, then each remaining view as `<details><summary>view title</summary>…</details>` with that view's diagram inside. A `defaultOpen: true` view renders open, everything else closed. A view's `summary` goes under its title.
- Data-flow lens: the flow diagrams in flow order, each in its own section with its title.
- File refs become permalinks in their view's section (repository-relative paths against the `provenance` repo).
- A short footer from `provenance`: base → head shas, or the pull request link when the document carries one. Nothing else.

## Naming and where it goes

`<slug>.html` — the document title in kebab-case — written to `.diagram/` next to `drawn.graph.json`, both covered by the `.gitignore` entry the skill adds. Treat them as scratch: the page is rebuilt from the diff on demand.

## Check before you hand it over

- Open it from disk (`open .diagram/<slug>.html`), cold, and read it as a reviewer would: root diagram first, drill-downs opening and closing, dark and light both readable, pulses moving.
- The page must render with JavaScript disabled; if anything needs the network, it is not self-contained — fix it.
- The page must describe only what the diagrams show: no findings, no invented text.