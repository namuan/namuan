---
name: panel
description: Use to gather independent perspectives from multiple configured panelists and, when requested, synthesize them without forcing consensus.
---

# Panel

## Preconditions

Run from the main thread because panelists cannot spawn additional panelists.

The prompt is mandatory. If it is missing, fail loudly rather than infer it.

## Usage

`/panel <prompt>`

The prompt may request independent perspectives only, or may also ask for a synthesis after the perspectives have been collected.

## Goal

Get independent perspectives on a topic from multiple panelists. A panelist is any model or agent invocation supported by the host. Use panelists supplied by the caller or project configuration. If none are supplied, use two available panelists selected by the host, preferring distinct models when possible.

If fewer than two panelists can be dispatched, fail loudly rather than silently substituting or skipping one.

## 1. Prepare the prompt

If the prompt invokes a skill using an explicit `/name` reference, inline that skill's `SKILL.md` after the instruction. Do not expand bare skill names in prose or diagrams. Recurse into explicit `/name` references found in the inlined skill, but inline each skill at most once to prevent cycles and unnecessary bloat.

Resolve referenced skills from the host's installed skill directories or the project's skill directory.

Append this instruction to the prepared prompt:

> Answer directly and honestly. Do not hedge or soften to be agreeable. If your honest answer differs substantively from what the prompt seems to expect, give that one.

## 2. Collect perspectives

Spawn one subagent per configured panelist in parallel using the host's native delegation mechanism. Give every panelist the same prepared prompt and instruct it to return only its independent perspective; synthesis happens after all perspectives are collected. Do not assume a provider, model family, model name, alias, or provider-specific command.

If a requested panelist is unavailable, fail loudly; do not substitute or skip it.

Write each response to `/tmp/panel-<timestamp>-<slot>.md`.

## 3. Deliver the perspectives

Present every response verbatim and attribute it to its configured panelist label. If no labels are available, use stable generic labels such as Panelist 1 and Panelist 2. Include the path to each raw response.

If the caller requested perspectives only, stop here. Keep the raw responses unchanged even when a synthesis is requested.

## 4. Synthesize when requested

When the caller asks for a synthesis in the panel prompt, combine the collected perspectives into one answer using the original prompt as the source of truth. Re-read the original prompt first and flag any perspective content that violates, ignores, or goes beyond its instructions.

Do not force consensus. Unresolved disagreements are meaningful signals and should remain visible in the synthesis.

Evaluate each point using this rubric:

| Pattern | Treatment |
|---|---|
| Agreement (at least two perspectives concur) | Treat as high confidence and carry it into the synthesis directly. |
| Unique to one perspective | Re-examine it against the original prompt; keep it if valid and discard it if speculative. |
| Contradiction | Assess the evidence quality on each side and decide on the substance rather than voting. |
| Gap (no perspective catches it) | Flag it as a limitation of the panel. |

Present the synthesis separately from the verbatim perspectives. Do not edit, reconcile, or conceal the raw responses.
