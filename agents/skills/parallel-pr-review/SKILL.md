---
name: parallel-pr-review
description: Review a code change with independent, narrowly scoped AI reviewers launched through the multi-agent skill, then validate and consolidate their findings. Use when reviewing a diff or pull request with a multi-agent workflow.
---

# Parallel PR review

Review the requested change using the `multi-agent` skill as the reviewer dispatcher. This skill coordinates review passes; it does not post to GitHub or edit the code.

## Workflow

1. Read the `multi-agent` skill and follow its instructions for starting and collecting agents. Use its `Explore` profile for read-only review work. If that profile is unavailable, use another read-only profile; do not launch a reviewer with write access.
2. Establish the review scope from the user's request and the repository state. Inspect the diff, identify changed files and the PR's stated intent if available. Review the change against its base, not unrelated pre-existing issues.
3. Start independent reviewers in parallel. Give each a self-contained prompt with the review scope, changed paths, and a single focus. Do not include another reviewer's output in a prompt.
4. Use the applicable passes below. Skip a pass only when its subject is clearly irrelevant to the change. Keep the number of agents proportional to the change; use at least a baseline pass and a validation pass.
5. Collect all reviewer results. Deduplicate reports that describe the same root cause, retaining the clearest evidence and covering other affected locations where useful.
6. Start a separate read-only validator after collecting the candidates. Give it the candidate findings and ask it to inspect the source independently. Keep only findings it can substantiate from the changed code and relevant surrounding code. If no findings survive, report that.
7. Return concise findings first, ordered by severity. For each finding include severity, file and line, the concrete failure scenario, and why it is caused by this change. If no actionable finding survives, say so. Note any important review limitations separately.

## Review passes

Use one agent for each selected focus:

- **Baseline correctness:** trace changed behavior through callers and relevant surrounding code; look for concrete bugs, regressions, and missing edge cases.
- **Tests and intent:** compare behavior to the request, PR description, and existing tests; identify missing or misleading tests only when they leave a real regression unguarded.
- **Security and data safety:** inspect trust boundaries, authorization, secrets, input handling, persistence, and destructive or irreversible effects.
- **Compatibility and contracts:** inspect public interfaces, callers, serialized data, configuration, and upgrade or backward-compatibility behavior.
- **Concurrency and bounds:** inspect asynchronous ordering, shared state, retries, resource limits, boundary values, and malformed or unusually large inputs.
- **Production and rollout:** inspect failure handling, observability, deployment/configuration implications, and changes that can break existing installations.

Avoid spending a pass on a category the diff cannot affect. A pass should not report style preferences, speculative risks, or issues unrelated to the change.

## Reviewer prompt contract

Each reviewer must:

- Inspect the actual diff and enough surrounding source to verify a candidate.
- Return only actionable defects introduced by the change, or explicitly return no findings.
- For each candidate, give a one-line title, severity (`blocker`, `high`, `medium`, or `low`), exact file and line, a reproducible scenario, and code-based evidence.
- Avoid duplicating another pass's scope, proposing fixes, or modifying files.
- Treat uncertain claims as questions or omit them rather than presenting them as defects.

The validator must check each candidate against the actual code, reject unsupported or pre-existing issues, verify the location and scenario, and state a reason for every keep or reject decision. The validator does not need to preserve a finding merely because multiple reviewers reported it.
