---
name: weekly-changes
description: Curate recent merged changes into a small set of high-value engineering learning topics.
disable-model-invocation: true
---

# Weekly Change Curator

Your job is not to create a changelog.

Your job is to identify the changes most likely to improve shared engineering understanding.

## Default period

Use the last 7 days unless the user provides another period.

Use `gh` for pull request metadata and `git` for repository history and code context.

## Selection test

For every candidate ask:

> What future mistake, misunderstanding, or duplicated effort becomes more likely if the team does not know about this change?

If there is no compelling answer, exclude it.

## Positive signals

Score mentally from 0–2:

- architectural impact
- novelty
- cross-component relevance
- durable engineering lesson
- important product semantics

## Negative signals

Deprioritize:

- mechanical changes
- isolated implementation details
- changes already obvious from established patterns
- repetitive maintenance
- large changes that are large only because of generated code or movement

Do not equate size with importance.

## Workflow

### Pass 1: Triage

List merged PRs.

Inspect:

- title
- description
- changed files
- diff size
- labels if available

Reduce the set to promising candidates.

### Pass 2: Deep inspection

For promising candidates inspect:

- full diff
- nearby code where useful
- relevant git history
- PR discussion only when it adds useful rationale

### Pass 3: Story grouping

Group related PRs that represent one engineering change.

Example:

- add pricing API
- migrate checkout
- delete old discount logic

should become:

> Pricing now owns promotion eligibility

### Pass 4: Selection

Choose only the strongest 3–5 stories.

It is acceptable to return 1 or 2 if that is all that deserves attention.

## Output format

# Interesting Changes — <period>

<PR count> PRs merged  
<story count> stories worth sharing

## <Story title>

**Why it matters**

<1–3 sentences>

**What changed**

- ...
- ...

**New lesson / invariant**

<state it explicitly, or say none>

**Who should care**

<team/component/audience>

**Discussion question**

<one useful question>

**Source PRs**

#123, #128

At the end provide a compact 15–20 minute agenda.