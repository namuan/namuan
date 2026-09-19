---
name: topic-simulation-builder
description: >
  Research a topic, build and independently verify a foundational knowledge base,
  translate the topic into an interactive low-poly RollerCoaster Tycoon-like simulation,
  make it responsive and controllable, then publish it to a new GitHub repository
  with GitHub Pages enabled.
disable-model-invocation: true
---

# Topic Simulation Builder

## Purpose

Use this skill when the user wants to **learn a topic by building an interactive simulation of it**, rather than receiving only a textual explanation.

The workflow is:

1. Build foundational knowledge.
2. Audit and correct that knowledge.
3. Design the simulation model.
4. Build an interactive low-poly visualization.
5. Add usable controls and responsive UX.
6. Validate the simulation against the knowledge base.
7. Publish to a new GitHub repository.
8. Enable GitHub Pages and verify the deployed site.

The output should be an educational artifact that is:
- factually defensible,
- visually understandable,
- interactive,
- responsive,
- easy to pause and inspect,
- self-contained enough to run as a static web app,
- deployable through GitHub Pages.

---

## Invocation

Typical user request:

> Build me an interactive simulation for **[TOPIC]** using the topic-simulation workflow.

Optional inputs:

- `topic`: subject to explain and simulate.
- `audience`: beginner, intermediate, expert, children, students, professionals, etc.
- `simulation_depth`: conceptual, moderately realistic, high-fidelity.
- `visual_style`: defaults to low-poly, colorful, RollerCoaster Tycoon-like.
- `preferred_stack`: optional. If omitted, choose a lightweight static-web stack suitable for GitHub Pages.
- `repo_name`: optional.
- `github_owner`: optional.
- `constraints`: accessibility, device support, performance limits, offline use, etc.

If details are missing, choose sensible defaults and continue unless the missing information would fundamentally change the simulation.

---

# Operating Principles

## 1. Separate facts from simulation choices

Never present a convenient simulation mechanic as if it were a real-world fact.

Maintain three explicit categories during the work:

- **Established knowledge** — supported factual claims.
- **Simplifications** — intentional reductions in complexity.
- **Creative visualization choices** — aesthetic or pedagogical devices.

If a simulation mechanic materially departs from reality, disclose it in the app.

## 2. Research before implementation

Do not begin coding the simulation until the foundational model is coherent enough to answer:

- What are the important entities?
- What state does each entity have?
- What causes state to change?
- What flows between entities?
- Which variables matter most?
- Which relationships are causal versus merely correlated?
- What assumptions are safe to simplify?
- What would make the simulation misleading?

## 3. Verification is a separate phase

Do not merely reread the first research pass.

Perform an adversarial review that tries to find:

- factual errors,
- missing mechanisms,
- outdated claims,
- oversimplifications,
- category errors,
- hidden assumptions,
- disputed claims presented as settled,
- equations or causal links that do not hold.

Correct the knowledge base before using it as the implementation specification.

## 4. Prefer legibility over realism

The simulation exists to teach.

Prefer:
- visible flows,
- clear state changes,
- labeled entities,
- readable motion,
- explanatory overlays,
- inspectable variables,

over visually impressive but opaque animation.

## 5. Static hosting is the default

Unless the topic truly requires a backend, build a static application compatible with GitHub Pages.

Avoid server-only dependencies.

---

# Phase 1 — Foundational Knowledge

Create a structured knowledge base for the topic.

## Required sections

### A. One-paragraph mental model

Explain the topic in a compact conceptual model that a newcomer can hold in their head.

### B. Core entities

For each entity identify:

- name,
- role,
- relevant state,
- inputs,
- outputs,
- interactions.

### C. Processes and flows

Describe:
- what moves,
- what changes,
- what triggers change,
- where feedback loops exist,
- what limits or bottlenecks exist.

### D. Important variables

Create a table or equivalent structure containing:

- variable,
- meaning,
- unit where applicable,
- typical range where defensible,
- what it influences,
- whether it should be user-adjustable.

### E. Causal model

Describe the main causal relationships as:

`A increases/decreases B because ...`

Do not use vague arrows where the mechanism is unknown.

### F. Edge cases

Document cases where the normal mental model breaks.

### G. Simulation candidates

Identify which mechanisms are:
- essential,
- optional,
- too complex to model faithfully,
- better represented symbolically.

### H. Source ledger

Track the strongest sources used for important claims.

Prefer primary or authoritative sources where available.

---

# Phase 2 — Accuracy Audit

Review the knowledge base as a skeptical domain reviewer.

For each important claim assign one of:

- `verified`
- `verified-with-caveat`
- `disputed`
- `simplified`
- `unsupported`

Then:

1. Correct factual errors.
2. Remove unsupported claims.
3. Add missing caveats.
4. Resolve contradictions.
5. Mark uncertainty.
6. Identify anything that should **not** be simulated literally.
7. Produce a final **simulation-safe knowledge model**.

## Accuracy gate

Do not proceed until:

- no foundational claim is knowingly unsupported,
- disagreements are represented honestly,
- critical quantities have defensible meanings,
- every major simulation rule maps back to the audited knowledge model.

---

# Phase 3 — Simulation Design

Translate the audited knowledge into a simulation specification.

## A. Learning objective

State what the user should understand after interacting with the simulation.

## B. World model

Define:

- entities,
- state variables,
- update rules,
- time step,
- event rules,
- resource flows,
- constraints,
- feedback loops,
- termination/reset conditions.

## C. Visual metaphor

Use a low-poly, miniature-management-game aesthetic inspired by classic isometric simulation games.

Characteristics:

- simple geometric models,
- readable silhouettes,
- isometric or slightly elevated camera,
- miniature-world feel,
- restrained texture complexity,
- animated flows,
- distinct zones,
- clear labels and overlays.

Do not reproduce copyrighted game assets, UI, logos, characters, maps, or exact visual designs.

## D. Mapping table

For every major visual element define:

| Real concept | Simulation representation | Simplification |
|---|---|---|
| Concept | Visual/mechanical equivalent | What is intentionally omitted |

## E. Interaction model

At minimum support:

- play,
- pause,
- reset,
- simulation-speed control,
- ability to inspect the current state,
- clear explanation of what is happening.

Add topic-specific controls where useful.

Potential controls:

- sliders,
- toggles,
- scenario presets,
- step-forward,
- camera controls,
- show/hide labels,
- show/hide flows,
- compare scenarios.

## F. Explainability layer

The simulation should expose cause and effect.

Useful UI:

- live metrics,
- hover/click inspection,
- event log,
- annotations,
- before/after state,
- charts where genuinely useful,
- “Why did this happen?” explanations.

---

# Phase 4 — Technical Plan

Choose the smallest reliable stack that supports the experience.

Default preference:

- TypeScript or JavaScript,
- Vite,
- Three.js or another lightweight browser rendering library when 3D is useful,
- HTML/CSS for UI,
- static assets,
- no backend.

For simpler topics, use SVG, Canvas, or DOM animation instead of 3D.

## Architecture

Prefer a clean separation:

```text
src/
  simulation/
    model.*
    rules.*
    scenarios.*
  rendering/
    scene.*
    entities.*
    effects.*
  ui/
    controls.*
    inspector.*
    metrics.*
  content/
    explanations.*
    sources.*
  app.*
```

The simulation engine should not depend on rendering code.

This allows the logical model to be tested independently from the animation.

---

# Phase 5 — Build

Implement in this order:

1. Core simulation state.
2. Deterministic update loop.
3. Testable rules.
4. Basic rendering.
5. Visual polish.
6. Controls.
7. Explanatory UI.
8. Responsive layout.
9. Accessibility improvements.
10. Performance tuning.

## Determinism

Where practical:

- use seeded randomness,
- make scenarios reproducible,
- provide predictable reset behavior.

## Simulation controls

The user must be able to stop the flow at any time.

Required:

- pause/resume,
- reset,
- speed adjustment.

Preferred:

- single-step while paused,
- keyboard shortcut for pause,
- persistent visible simulation status.

Never make critical controls available only on hover.

---

# Phase 6 — Responsive UX

The app must work on both large and small screens.

## Large screens

Prefer:
- simulation as primary canvas,
- persistent control panel or sidebar,
- metrics visible without obstructing the scene.

## Small screens

Prefer:
- full-width simulation area,
- controls in a bottom sheet, drawer, or compact toolbar,
- touch-friendly hit targets,
- reduced visual density,
- collapsible explanatory panels.

## Requirements

Validate at representative widths such as:

- ~360 px,
- ~768 px,
- ~1280 px,
- large desktop.

Avoid:

- clipped controls,
- fixed-width UI,
- unreadably small text,
- essential hover-only interactions,
- accidental page scrolling while manipulating the scene.

Respect reduced-motion preferences where feasible.

---

# Phase 7 — Validation

Validate both **software correctness** and **conceptual correctness**.

## A. Model tests

Test the rules independently from rendering.

Include:

- expected state transitions,
- boundary values,
- reset behavior,
- paused behavior,
- speed behavior,
- important invariants.

## B. Knowledge-to-code audit

For each important simulation rule answer:

- Which audited claim supports this rule?
- Is the relationship represented correctly?
- Is magnitude meaningful or merely illustrative?
- Is the timing meaningful or merely compressed?
- Could a user infer something false from this behavior?

Fix misleading mechanics.

## C. UX validation

Check:

- pause works immediately,
- reset restores a known state,
- controls remain usable on mobile,
- labels remain readable,
- simulation does not become incomprehensible at high speed,
- explanatory content is discoverable.

## D. Performance

Target smooth interaction on ordinary laptops and modern phones.

Prefer:
- low polygon counts,
- reused geometry/materials,
- instancing for repeated objects,
- bounded particle counts,
- modest shadow usage,
- limited expensive post-processing.

---

# Phase 8 — Educational Content

Include a concise in-app explanation covering:

1. What the user is looking at.
2. What each major visual element represents.
3. Which controls matter.
4. What the simulation simplifies.
5. What conclusions the user should **not** draw from it.
6. Sources or further reading.

Include an explicit section:

## “What this simulation simplifies”

This is mandatory.

---

# Phase 9 — Repository Preparation

Before publishing, ensure the repository contains:

```text
README.md
LICENSE                  # if appropriate
package.json
src/
public/
.github/                  # if needed for deployment workflow
```

## README requirements

The README should contain:

- project title,
- one-sentence description,
- screenshot or preview if available,
- learning objective,
- simulation controls,
- local development instructions,
- build instructions,
- explanation of simplifications,
- key sources,
- deployment URL.

## Repository hygiene

Do not commit:

- secrets,
- API keys,
- tokens,
- local credentials,
- private research notes,
- build caches,
- unnecessary large assets.

Use an appropriate `.gitignore`.

---

# Phase 10 — GitHub Publishing

If GitHub tooling and credentials are available:

1. Create a new repository.
2. Initialize git if needed.
3. Commit the working application.
4. Set the default branch.
5. Push to GitHub.
6. Configure the app for its GitHub Pages base path.
7. Enable GitHub Pages.
8. Deploy.
9. Verify the public URL loads successfully.
10. Confirm assets resolve correctly from the Pages subpath.

If direct GitHub access is unavailable, produce the exact commands and configuration the user needs to run.

Never invent a successful deployment.

---

# GitHub Pages Guidance

Prefer one of these patterns:

## Option A — GitHub Actions deployment

Use when the app requires a build step.

The workflow should:

1. checkout,
2. install dependencies,
3. build,
4. upload Pages artifact,
5. deploy to Pages.

Ensure the application base URL works under:

`/<repo-name>/`

rather than assuming `/`.

## Option B — Static branch/folder

Use only for applications that can be served directly without a build pipeline.

---

# Final Verification Gate

The task is complete only when all applicable checks pass.

## Knowledge

- [ ] Foundational model exists.
- [ ] Accuracy audit completed.
- [ ] Important claims are sourced.
- [ ] Simplifications are identified.

## Simulation

- [ ] Core entities and flows match the audited model.
- [ ] Play/pause works.
- [ ] Reset works.
- [ ] Speed control works.
- [ ] State can be inspected.
- [ ] Misleading mechanics have been corrected or disclosed.

## UX

- [ ] Usable on small screens.
- [ ] Usable on large screens.
- [ ] Touch interactions work where applicable.
- [ ] Critical controls are always reachable.
- [ ] Reduced-motion behavior is considered.

## Engineering

- [ ] Simulation logic is separated from rendering.
- [ ] Core rules have tests.
- [ ] Production build succeeds.
- [ ] No secrets are committed.
- [ ] Assets use correct deployment paths.

## Deployment

- [ ] Repository exists.
- [ ] Code pushed successfully.
- [ ] GitHub Pages configured.
- [ ] Public deployment verified.
- [ ] README contains the live URL.

---

# Output During Execution

At the end of each phase, provide a compact checkpoint.

Use this structure:

```text
PHASE N — <NAME>

Completed:
- ...

Key decisions:
- ...

Uncertainties / simplifications:
- ...

Next:
- ...
```

Do not flood the user with implementation details unless they ask.

---

# Failure Handling

## Research uncertainty

If reliable sources disagree:

- describe the disagreement,
- select a defensible simulation assumption,
- make the assumption visible to the user.

## Topic cannot be faithfully simulated

If the phenomenon is too complex, stochastic, social, subjective, dangerous, or poorly understood to model literally:

- build a conceptual visualization instead,
- avoid false precision,
- explain what the model can and cannot show.

## Deployment failure

If GitHub Pages fails:

- inspect build output,
- verify base path,
- verify Pages source/action,
- inspect asset URLs,
- fix deployment configuration,
- re-run validation.

Do not report deployment success until the public site is actually reachable.

---

# Default Completion Deliverable

Return:

1. a short summary of what was learned,
2. the audited knowledge model,
3. the implemented simulation,
4. documented simplifications,
5. test/validation results,
6. repository location,
7. live GitHub Pages URL,
8. any known limitations.

The guiding principle is:

> **Research it, challenge it, model it, make it inspectable, then publish it.**
