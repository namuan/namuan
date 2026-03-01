---
name: specops
description: Adversarial requirements engineering skill that compiles ambiguous feature requests into a validated JSON spec, then instructs the LLM to generate context-appropriate artifacts in the target repository's native stack. Use when users ask to define, clarify, or formalize software requirements before implementation.
compatibility: Requires file read/write access to the target repository where artifacts will be generated.
metadata:
  author: namuan
  version: "0.1.0"
---

# SpecOps

SpecOps is a shift-left specification skill. It helps an agent turn vague requirements into a machine-checkable contract before any implementation coding starts.

## Triggering

- Trigger this skill with `/specops`.
- Preferred one-shot invocation format:
  - `/specops <path-to-spec-markdown-file>`

When invoked with a Markdown file path, run end-to-end toward failing executable contract tests in the current project while respecting repository technology and conventions.

## When to use this skill

- The user asks to define a new feature but requirements are still ambiguous.
- The user wants failing tests generated from agreed behavior.
- The team wants an intermediate contract between natural language and code.

## Operating workflow

1. Run the interaction loop in [instructions.md](./instructions.md).
2. Start with a Markdown specification using `prompts/spec_markdown_template.md`.
3. Convert the Markdown into a compiled-spec JSON draft using `prompts/markdown_to_json_compilation.txt`.
4. Resolve ambiguity and produce a final compiled spec that validates against [compiled-spec-schema.json](./schemas/compiled-spec-schema.json).
5. Build and confirm a context-aware artifact plan from user use case + repository context.
6. Only after explicit user approval, generate the approved artifacts in the target repository's native stack.

## Single-Prompt Contract Test Mode

If user triggers `/specops <spec-markdown-file>`, default to this mode:

1. Load Markdown spec file from provided path.
2. Compile and validate `compiled-spec.json`.
3. Evaluate current project technology (language/framework/test stack) from repository signals.
4. Generate failing executable contract tests in the detected native stack.
5. Return generated file paths + scenario coverage summary.

Only ask additional questions if blocked by ambiguity or missing repository signals.

## Safety and trust requirements

- Do not write or modify target-repository files without explicit user confirmation.
- Do not treat unresolved ambiguity as acceptable; keep clarifying until completion criteria are met.
- If schema validation fails, return to clarification and repair the spec.

## Outputs

- `compiled-spec.json` (schema-valid)
- Context-appropriate artifact set generated in the target repository (for example failing tests, API contract files, fixtures, handoff summary)
- Agent-optimized Markdown handoff summary

See [instructions.md](./instructions.md) for strict execution details.