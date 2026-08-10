---
name: image-to-threejs
description: Turn a reference image into a code-only procedural Three.js model in one self-contained HTML file, with a built-in wipe-comparison viewer for checking against the reference. Use for quick image-to-3D jobs — props, tools, furniture, vehicles, stylized characters, low-poly game objects.
version: 1.0.0
license: Apache-2.0
---

# image-to-threejs — image → procedural Three.js, no pipeline

Stripped to the loop that matters:

**Look → Build → Compare → Fix (max 3 rounds) → Ship one HTML file.**

No Python scripts, no state files, no spec JSON, no gates. Agent vision does the judging; Three.js does the rendering.

## When to use

- The user attaches/points at an image and wants a Three.js model quickly.
- Props, tools, furniture, vehicles, stylized characters, low-poly game objects, concept shapes.
- The full staged pipeline (quality contracts, PBR evidence extraction, rig validation) is overkill for the request.

## When NOT to use

- Photorealistic likeness, CS2 skin matching, multi-view reconstruction, animation-ready rigs — the single-pass loop and primitive-only geometry cannot reach those bars.
- Jobs that need external AI generation services or game-engine import pipelines.

## Workflow

### 1. Look (before writing any code)

1. Name the object class and intended style.
2. List the parts — 3–10 named components.
3. Note proportions (width/height ratios, where parts sit relative to each other).
4. Note materials: color, glossy/matte, metal/plastic/wood/glass.
5. State what the single view hides (back, underside, inside) — those will be guessed. Say so in the final report.

### 2. Build

1. Copy `templates/viewer.html` next to the reference image. Point it at the image with `?img=your-photo.jpg` (or edit the `<img>` src).
2. Implement `createModel(scene)` only. Lights, camera, ground, orbit controls, and the wipe-comparison divider already work.
3. Rules:
   - Primitives + `Shape` extrude + `LatheGeometry` + `TubeGeometry` only. No downloaded models or texture packs.
   - One named Group per part (`body`, `handle`, `wheels`, …); give meshes names too, so `root.getObjectByName("handle")` works.
   - Rough real-world units (meters).
   - Build blockout first — big shapes at correct proportions — then add detail. Never perfect one part before the others exist.
   - Seed any procedural noise/texture generation deterministically.

### 3. Compare & fix

1. Open the HTML in a browser, screenshot it.
2. Drag the wipe divider to compare model vs. reference directly, edge to edge.
3. List what differs; fix the biggest mismatch first; re-screenshot.
4. Max 3 fix rounds. After that, stop and report honestly what still doesn't match.

## Rules (non-negotiable)

- **Honesty**: you only saw one view. Never claim the back/underside is correct — label guesses ("underside approximated").
- **Named parts**: never merge two visibly distinct parts into one mesh.
- **Reconstruction by code**: don't paste the image onto a box. Projecting the photo onto a surface is allowed only when the surface IS the picture (pattern/decal) — and must be disclosed.
- **Stop at the limit**: if the image is unsuitable (blurry, multiple objects, organic forms needing likeness), say so and ask for a better/clearer image rather than grinding.

## Output

One self-contained `.html` file that opens in any browser: 3D model + reference with a wipe slider, orbit controls, auto-rotate. Deliverable = file path + a 3-bullet report: what was built, what was guessed, what still differs.

## Install

Symlink this folder into your skills directory (e.g. `~/.agents/skills/image-to-threejs` or `~/.claude/skills/image-to-threejs`) and keep one canonical checkout.
