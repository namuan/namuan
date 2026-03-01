# SpecOps Execution Instructions

This file defines how a host agent must run SpecOps.

## Goal

Start from a Markdown specification, convert it into a compiled JSON draft, resolve ambiguity from that JSON state, and generate context-appropriate artifacts in the target repository.

## Triggering Mode

- Skill may be triggered as `/specops`.
- One-shot fast path: `/specops <spec-markdown-file>`.
- In one-shot mode, default deliverable is failing executable contract tests generated in the current project's native test stack.

## Required behavior

1. Stay in requirements mode until the spec is complete.
2. Require or construct a Markdown spec before JSON compilation.
3. Ask targeted clarifying questions for every unresolved ambiguity.
4. Maintain a working JSON draft state that is progressively refined.
5. Validate the final JSON against `schemas/compiled-spec-schema.json`.
6. Infer the artifact set from user use case + repository context.
7. Detect repository language/framework before generating code artifacts.
8. Ask for explicit confirmation before writing artifacts into the target repository.

## Workflow

### Fast Path: Single Prompt Contract Tests

When input is `/specops <spec-markdown-file>`, run this compressed flow using `prompts/single_trigger_contract_tests.txt`:

1. Read the Markdown spec file.
2. Compile and validate `compiled-spec.json`.
3. Evaluate repository technology and existing test conventions.
4. Generate failing executable contract tests in native framework.
5. Report generated file paths + coverage summary.

If blocked by ambiguity or missing repo signals, ask minimal clarifying questions and continue.

### Phase 1: Initialization

- Briefly explain SpecOps to the user.
- State that you will ask clarifying questions and compile a contract before coding.

### Phase 2: Markdown Spec Ingestion

- Use guidance in `prompts/initial_requirements_gather.txt`.
- Ask the user for a Markdown spec using `prompts/spec_markdown_template.md`.
- If the user provides prose/bullets/docs, transform it into the required Markdown template and ask for confirmation.
- Save the confirmed Markdown as the active source of truth for this run.

### Phase 3: Markdown → JSON Draft Compilation

- Use `prompts/markdown_to_json_compilation.txt` to convert the Markdown spec into a compiled-spec JSON draft.
- The result may still be incomplete or ambiguous; treat it as a working draft.
- Do not generate artifacts yet.

### Phase 4: Adversarial Clarification Loop

Repeat until complete:

1. Evaluate current draft using `prompts/ambiguity_checklist.txt`.
2. Pick highest-risk unresolved ambiguity.
3. Ask one concise, concrete question using patterns from `prompts/clarification_question_templates.txt`.
4. Integrate the user answer into the draft state.
5. Re-check for contradictions introduced by the new answer.

### Phase 5: Completion Gate

Only continue when all of these are true:

- Every scenario has `given`, `when`, and one or more concrete `then` outcomes.
- Actor permissions and boundaries are explicit.
- Error and unauthorized paths are specified.
- Data field constraints are explicit where needed.
- No unresolved contradictions remain.

If any gate fails, continue clarification.

### Phase 6: Final Spec Compilation and Validation

- Use `prompts/final_spec_formatter.txt`.
- Generate a JSON object and validate against `schemas/compiled-spec-schema.json`.
- If invalid, explain validation errors and re-engage the user to repair missing/invalid parts.

### Phase 7: Context-Aware Artifact Planning (LLM-driven)

Before writing files, build an artifact plan using `prompts/context_aware_artifact_planning.txt`.

Plan from:
1. User use case and delivery goal.
2. Repository language/framework and existing conventions.
3. Risk profile from compiled scenarios.

Possible artifacts include (only when relevant):
- failing tests (unit/integration/e2e)
- API contract artifacts (OpenAPI/GraphQL schema snippets)
- test fixtures or seed data
- migration/compatibility notes
- agent handoff summaries/checklists

Ask user to approve the artifact plan before generation.

### Phase 8: Context-Aware Artifact Generation (LLM-driven)

After plan approval, generate artifacts using `prompts/context_aware_artifact_generation.txt`.

Rules:
1. Reuse the repository's existing stack and patterns.
2. Generate only approved artifacts.
3. Keep generated tests failing by design until implementation.
4. Do not generate production implementation code in this phase.
5. Minimize scope to requirements in compiled spec.

### Phase 9: Final Handoff

Provide:

- location of compiled spec
- generated artifact file paths
- concise summary of behavior/contract coverage by artifact
- suggested next step: assign coding agent to implement behavior required by the approved spec/artifacts

## Invalid-spec fallback

If validation fails and user cannot answer immediately:

1. Save draft marked as incomplete.
2. Save the latest Markdown and JSON draft snapshots.
3. List unresolved items.
4. Ask whether to continue now or pause.

## Large specification handling

When user provides a long external spec:

1. Chunk by functional area.
2. Run checklist per chunk.
3. Merge chunk outputs into one compiled spec.
4. Run final cross-chunk contradiction check.