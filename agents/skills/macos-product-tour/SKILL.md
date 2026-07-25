---
name: macos-product-tour
description: Create annotated product-tour screenshots for any running macOS desktop application. Use when the user asks to generate a product tour, walkthrough, feature overview, or annotated screenshots of a macOS app.
---

# macOS Product Tour Generator

Create annotated product-tour screenshots for any running macOS desktop application.

## Philosophy

- **Stage 1 — read-only**: capture only what is visible on screen. No clicks, no state changes.
- **One feature per image**: a full-screen shot with a single colored outline and a description overlaid at the bottom. Avoids overlapping annotations entirely.
- **Reproducible**: wrap everything in a single bash script so the tour can be regenerated in one step.

## Workflow

### 1. Survey the app's end-user features

Read the source code or README to build a feature inventory. Focus on **what the user sees and uses**, not internal architecture. For each feature note:
- Its on-screen label or visual identity.
- Which UI column/region it lives in.
- Whether it's a toolbar button, a list, a bar, a panel, etc.

Produce a flat list of ~8–12 features. Example categories:
- Toolbar buttons, search fields, lists/outlines, status bars, action buttons, the main content area, launcher strips.

### 2. Map the on-screen layout via the Accessibility tree

Use `osascript` (AppleScript or JXA) to read AX element positions. The accessibility tree gives you **logical points** (the same coordinate space as the window's `bounds`).

#### Read all visible labels with positions

```bash
osascript -l JavaScript -e '
const p = Application("System Events").processes.byName("APP_NAME");
function g(fn) { try { return fn() } catch(_) { return null } }
const out = [];
function walk(el, depth) {
  if (depth > 10) return;
  const role = g(() => el.role());
  const val  = g(() => el.value());
  const pos  = g(() => el.position());
  if (role === "AXStaticText" && val)
    out.push(JSON.stringify({ val, pos }));
  (g(() => el.uiElements()) || []).forEach(c => walk(c, depth + 1));
}
walk(p.windows[0], 0);
console.log(out.join("\n"));
'
```

#### Read all buttons with positions

Same pattern, filtering for `AXButton`. SwiftUI often exposes button descriptions as generic `"button"` — in that case the button's child `AXStaticText` often holds the label.

#### Position-based pruning (solves timeouts)

Deep AX traversal can time out on complex UIs (terminals, large lists). Prune subtrees whose bounding rect is entirely outside your region of interest:

```js
function walk(el, depth) {
  const q = g(() => el.position()), z = g(() => el.size());
  if (!q || !z) return;
  // Skip subtrees totally outside the band we care about
  if (q[0] + z[0] < BAND_X0 || q[0] > BAND_X1 ||
      q[1] + z[1] < BAND_Y0 || q[1] > BAND_Y1) return;
  // ... inspect + recurse
}
```

### 3. Relate pixel coordinates to logical coordinates

macOS Retina displays use a `SCALE` factor (usually 2). For a full-screen capture:

```
pixel = logical_point × SCALE
```

- Find the scale: capture the full screen, divide screenshot pixel-width by the display logical width from `system_profiler`, or assume 2 for Retina.
- The window's AX `position` and `bounds` are in **logical points**. Multiply by SCALE to get screenshot pixel coordinates.
- Author annotation boxes in **logical window-relative** coordinates, then add the window's live `(position.x, position.y) × SCALE` as an offset. This makes the boxes track the window even if the user moves it.

### 4. Design the annotation style

#### Proven pattern (from multiple iterations)

- **Full-screen** image (the whole app, not a crop). Users want spatial context.
- **One feature per image** — no overlapping boxes, no map/legend to cross-reference.
- **Colored rectangle** around the feature: `-stroke HEAT_COLOR -strokewidth 8..10 -fill none -draw "rectangle ..."`.
- **Description bar at the bottom**: a tinted semi-transparent strip (`rgba(28,28,30,0.85)`) the full width of the image, with large white text.
- **Centered text** in the banner: `-gravity Center` is cleaner than left-align when there's one annotation.
- **No numbers on the image** — unnecessary with one annotation per shot.

#### Dimensions (for a 3600×2338 Retina screenshot)

| Element | Value |
|---------|-------|
| Banner height | 260 px |
| Font size | 60 pt |
| Stroke width | 10 px |
| Font | `/System/Library/Fonts/Helvetica.ttc` (must be explicit on macOS) |

### 5. Produce the markdown

A `PRODUCT_TOUR.md` file that mirrors the images. Each feature gets:
- A section heading (feature name, no number).
- An inline `![name](fXX-name.png)` reference.
- The same description text from the image banner.

### 6. Bundle as a reproducible script (JSON-driven)

Keep the coordinates and descriptions in a **single editable JSON file**; the script just reads it and renders. Never edit the script once it's set up — only edit the JSON.

**`product-tour/annotations.json`** — the only file you touch:

```json
{
  "appName": "MyApp",
  "defaultWinX": 0, "defaultWinY": 39,
  "scale": 2,
  "screenWidth": 3600,
  "bannerHeight": 260,
  "fontSize": 60,
  "font": "/System/Library/Fonts/Helvetica.ttc",
  "features": [
    {
      "file": "f01-toolbar",
      "title": "Toolbar",
      "color": "#FF3B30",
      "x": 180, "y": 78, "width": 430, "height": 104,
      "desc": "Filter Active, Add Project — one-line description."
    }
  ]
}
```

Each feature entry:
- `file` — output PNG basename (no `.png`).
- `title` — section heading in the generated `PRODUCT_TOUR.md`.
- `color` — hex outline color.
- `x`, `y`, `width`, `height` — screen-pixel rectangle around the feature.
- `desc` — banner text on the image **and** body text in the markdown.

**`scripts/generate-product-tour.sh`** reads `annotations.json` with `jq`, loops `.features[]`, and calls `magick` once per feature. It also regenerates `PRODUCT_TOUR.md` from the same JSON. To adapt for a new app you only change the top-level metadata and the `features` array.

See [`scripts/generate-product-tour.sh`](scripts/generate-product-tour.sh) for the working template (requires `jq`).

### 7. Live GUI editor (optional but recommended)

Keep the JSON single-source-of-truth, but let the user edit it visually with [`assets/editor.html`](assets/editor.html) — one self-contained file, no build step, opens in any browser:

- Auto-loads `source.png` and `annotations.json` from the same folder when served (e.g. `python3 -m http.server` in `product-tour/`). From `file://` it falls back to **Load screenshot…** / **Load annotations.json…** buttons.
- Drag a box to move it; drag a corner handle to resize; or edit x/y/w/h/title/color/description in the side panel — all update the preview live.
- **Save annotations.json** downloads the edited file; re-run the render script to regenerate the PNGs.

Workflow: edit in `editor.html` → save → `bash scripts/generate-product-tour.sh`.

## ImageMagick reference

### caption vs annotate

| Need | Use |
|------|-----|
| Multi-line, wrapping text | `caption:"text"` as an **input coder** (no leading dash) |
| Single-line text at known XY | `-annotate +X+Y "text"` |

### Explicit font is required on macOS

```bash
magick ... -font "/System/Library/Fonts/Helvetica.ttc" caption:"hello" out.png
```

Omitting `-font` causes `"unable to read font"` errors in some IM builds.

### Avoid output filename collisions

Always use `mktemp` for intermediate files. Writing to a hard-coded name like `extended.png` can trigger IM's sequence naming (`extended-0.png`) — typically a red herring from a prior failed draw.

### Composite banner onto bottom

```bash
magick image.png banner.png -gravity South -composite output.png
```

The banner image must be the same width as the main image.

## AX / osascript cheat sheet

| Task | Command |
|------|---------|
| Activate app | `osascript -e 'tell application "APP_NAME" to activate'` |
| Get window position | `tell process "APP_NAME" to get position of window 1` |
| Get window size | `tell process "APP_NAME" to get size of window 1` |
| Get element at point | `tell process "APP_NAME" to click at {X, Y}` (the result is the element) |
| Dump all static text | JXA recursive walk filtered on `AXStaticText` |
| Dump all buttons | JXA recursive walk filtered on `AXButton` |
| Prune traversal for speed | Check element rect before recursing children |

## Common pitfalls

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `screencapture` says "could not create image from display" | Terminal doesn't have Screen Recording permission | Grant in System Settings → Privacy & Security |
| `osascript` says "not allowed assistive access" | Terminal doesn't have Accessibility permission | Grant in System Settings → Privacy & Security |
| AX recursion times out (no output) | Too many elements (terminal cells) | Prune by band; limit depth to 8–10 |
| AX search finds no text for known labels | SwiftUI may not expose `Label` text to AX | Fall back to button positions; confirm via hit-test |
| `rectangle` draw primitive "non-conforming" | Variable expanded to empty string in loop | Use explicit per-feature calls instead of array-indexed loops in zsh |
| Image files get renamed `file-0.png` | IM sequence-naming from a pre-existing stale file | Use `mktemp` for intermediates |
| `caption:` unrecognized option | Using `-caption:` (with dash) instead of `caption:` (input coder) | Remove the dash |
| Banner hides feature on short crops | Crop height < banner height | Pad short crops vertically (min height 300) — or use full-screen capture |
| Window moved → boxes misaligned | Hard-coded coordinates assuming window at (0,39) | Read live window position via AX; apply offset |

## Color palette

A small palette keeps the tour consistent:

| # | Color | Hex |
|---|-------|-----|
| 1 | Red | `#FF3B30` |
| 2 | Orange | `#FF9500` |
| 3 | Yellow | `#FFCC00` |
| 4 | Green | `#34C759` |
| 5 | Teal | `#00C7BE` |
| 6 | Cyan | `#30B0C7` |
| 7 | Blue | `#007AFF` |
| 8 | Purple | `#5856D6` |
| 9 | Magenta | `#AF52DE` |
| 10 | Pink | `#FF2D55` |

## Deliverable checklist

- [ ] Source-code or README survey → feature list (8–12 items).
- [ ] AX tree dump → precise pixel coordinates for each feature.
- [ ] Full-screen screenshot of the running app (no clicks).
- [ ] `annotations.json` — the single editable metadata file (coordinates, colors, descriptions).
- [ ] `assets/editor.html` — optional single-file GUI to drag/resize boxes and edit text live, then export `annotations.json`.
- [ ] `scripts/generate-product-tour.sh` — reads the JSON, captures/re-renders/md-regenerates in one step.
- [ ] One annotated image per feature: colored outline + centered bottom caption (number-free, white on tinted grey).
- [ ] `PRODUCT_TOUR.md` referencing each image with the same description.
- [ ] Script handles window-position offset for reproducibility.
- [ ] Old artifact files from earlier approaches removed.
