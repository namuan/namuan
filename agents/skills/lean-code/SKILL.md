---
name: lean-code
description: Solve coding, debugging, research, and planning work with the smallest verified result — use when asked for "lean-code", fewer tokens or less code, or to stop over-engineering.
disable-model-invocation: true
---

# /lean-code

## Preamble

Solve agentic work with the smallest verified result: maximize verified progress per unit of code,
time, tokens, and cost, and stop when done. The rules below are complete; the verification reference
ships alongside as `references/verification.md`.

## Non-negotiables

- Define observable completion conditions before substantial work.
- Prefer repository evidence, authoritative sources, schemas, compilers, and tests over confidence.
- Preserve explicit requirements, security controls, trust-boundary validation, accessibility
  basics, and error handling that prevents data loss.
- Never repeat an unchanged failed action. Change the hypothesis, input, tool, or scope.
- Never claim verification that did not run or pass.

## Solution ladder

Stop at the first rung that fully satisfies the request:

1. Existing behavior or deletion
2. Configuration
3. Existing project component, helper, pattern, or interface
4. Native platform or standard-library primitive
5. Already-installed dependency
6. Smallest custom implementation

Inspect only enough code to find the relevant flow and one compatible pattern. Do not add a
dependency, abstraction, fallback, compatibility layer, generalized API, or refactor without
demonstrated need. If two solutions work, choose fewer changed source lines; if tied, choose fewer
files and less state.

## Delivery boundary

Derive the output boundary literally from the named artifact:

- **Component:** one standalone reusable component. No mounting, route changes, app-data binding,
  global listeners, or invented entries unless named. Expose neutral props and callbacks.
- **Underspecified interaction:** the named primary interaction and accessible native fallback only.
  No secondary keyboard navigation, global shortcuts, selection state, hover/drag decoration, empty
  states, or responsive variants unless named.
- **Native form control:** transparently wrap the project's existing input and set its native
  `type`. Forward existing props.
- **Endpoint:** the route and smallest necessary backend schema/query change.
- **Capability:** the lowest existing layer that makes it callable.
- **Bug fix:** repair the shared root cause in place after checking its callers.

A short feature noun does not imply animations, previews, persistence, shortcuts, alternate modes,
elaborate styling, or product-specific policy. Mention possible extensions instead of implementing
them. Before editing, record the chosen ladder rung and delivery boundary. After editing, remove
every source block and changed file that cannot be mapped to an explicit requirement, required
interface, or correctness/safety condition.

## Effort route

- **Direct:** canonical path, low risk. One targeted inspection, one edit, one decisive check.
- **Probe:** uncertain cause. At most three live hypotheses; run the smallest check that separates
  them.
- **Explore:** multiple consequential solutions remain or two distinct probes failed. Compare at
  most three candidates; deepen only the best.
- **Guarded:** security, money, privacy, destructive operations, migrations, authentication, or
  public compatibility. Normal route plus one compact adversarial boundary check.

Escalate only after contradiction, failed verification, or a newly discovered requirement. Combine
compatible reads and checks. Do not reread unchanged files or rerun a passing check.

## Correctness contract

- Multiple requirements: preserve every qualifier; derive one assertion per independent condition;
  run the assertions together against the artifact.
- Parsers, transformations, graphs, schedulers, caches, state machines: validate applicable
  full-output invariants — format, completeness, domains, ordering, uniqueness, reachability,
  conservation, referential integrity, boundaries. Use a tiny obvious reference model for complex
  deterministic logic.
- Bulk transformations: derive the complete dimension set from input/schema; represent rules as
  data; produce the full artifact early; scan every output; group failures by rule; never silently
  skip unresolved dimensions; never fabricate labels, conversions, or values.
- Classification: assign a known label only from explicit lexical, structural, or contextual
  evidence tied to the allowed taxonomy; derive confidence from the same evidence; use the specified
  unknown label when support is insufficient.

## Verification

Choose the smallest decisive executable check from the table in `references/verification.md`.
Evidence hierarchy: deterministic executable verifier > authoritative spec or primary source >
independent implementation or measurement > static analysis > model judgment. A model review is
supporting evidence, never proof when an executable check exists.

After failure, repair only the evidenced defect and rerun the narrow check before any broader
suite. Never weaken or bypass a valid verifier. Stop when completion conditions pass; do not add
speculative improvements.

## Reporting

Report the outcome, decisive verification, and any limitation. Keep routine completion to three
short lines. Say `not verified` when verification was unavailable.

## Output

The smallest verified implementation, plus a ≤3-line report of outcome, decisive verification, and
any limitation (or `not verified`).
