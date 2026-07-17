---
name: browser-screenshots
description: Take full-page screenshots of web pages using Playwright via a uv script. Use when the user asks to screenshot a URL for documentation, READMEs, or visual reports — whether live sites or local static HTML files.
---

# Browser Screenshots

Take full-page PNG screenshots of any web page — live sites or local static HTML — using Playwright. No global installs or browser management; `uv` handles everything.

## Usage

```bash
scripts/screenshot.py https://example.com output.png
scripts/screenshot.py docs/report.html docs/report.png
scripts/screenshot.py https://a.com a.png https://b.com b.png
scripts/screenshot.py -v https://site.com out.png
```

Each argument pair is a URL (or local path) followed by the output filename. URLs can be `https://`, `http://`, `file:///`, or relative/absolute local paths.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--width` | 1280 | Viewport width in pixels |
| `--height` | 900 | Viewport height in pixels |
| `-v` | — | INFO logging |
| `-vv` | — | DEBUG logging |

## Notes

- `full_page=True` captures the entire scrollable content, not just the viewport
- `wait_until="networkidle"` ensures CSS, fonts, and images load before capture
- On first run `uv` installs Playwright and downloads Chromium; subsequent runs are instant
- For GitHub Pages sites, use the live URL (e.g. `https://user.github.io/repo/page.html`)
