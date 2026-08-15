---
name: superlearn
description: Research a topic deeply and produce an auditable Markdown learning dossier. Use when the user wants to learn, study, understand, investigate, or survey a subject in depth; asks for a research brief, learning guide, literature map, or source-grounded explanation.
---

# Superlearn: deep research dossier

Turn a topic into a complete, source-grounded learning dossier. This is a research skill, not an interactive app: the deliverable is a readable Markdown guide plus the research trail that supports it.

## Output

Create a topic-specific workspace in the user's current project:

```text
.superlearn/<topic-slug>/
├── plan.md                 # scope, audience, questions, and completed checklist
├── evidence/               # one Markdown capture per source or research pass
├── notes/                  # synthesized notes for each subtopic
└── dossier.md              # final, cited learning guide
```

Use the template at [`references/templates/research-dossier.md`](references/templates/research-dossier.md) for `dossier.md`. The workspace is user-owned: on later requests, preserve it and update only the relevant plan, evidence, notes, and dossier sections.

## Core rules

- Run every bundled reference script with `uv run`; never invoke `python` or `python3` directly.
- Research before writing. Do not present unsupported claims as established fact.
- Use live web research tools available to you. Prefer primary sources, official documentation, standards, peer-reviewed papers, respected textbooks, and authoritative institutions.
- Save source evidence locally. Each evidence file records the URL, title, access date, key extracts or a faithful detailed summary, and which questions it supports.
- Cite claims in the dossier using numbered references (`[1]`, `[2]`, …). Include every cited source in **Sources and further reading** with its URL and a short reason it is useful.
- Explain rather than merely list: give definitions, mechanisms, concrete examples, trade-offs, failure modes, and connections between ideas.
- Clearly label uncertainty, disagreement, weak evidence, estimates, and areas where sources conflict.
- Never invent citations, URLs, quotations, paper metadata, statistics, or video IDs. If research tools are unavailable, say so and provide only clearly labelled general background.
- Do not add quizzes, streaks, gamification, or filler.

## Workflow

### 1. Establish scope

Derive a short kebab-case topic slug. Determine the learner's goal and prior knowledge from the request. Ask one concise question only when the topic or intended depth is genuinely ambiguous; otherwise state your assumed audience in `plan.md`.

Inspect `.superlearn/sources/` first, if it exists. Read all relevant user-provided files and write `notes/00-user-sources.md`, identifying each source file and how it shapes the research.

Create `plan.md` with:

- a short framing and audience assumption
- 4–6 subtopics for a narrow topic, or 8–12 for a broad topic, ordered foundations to advanced material
- 3–6 research questions per subtopic
- a checklist, initially unchecked
- the intended dossier shape (for example, explanatory guide, technical reference, interview preparation, or literature survey)

### 2. Research broadly, then deeply

For each subtopic:

1. Search from at least two angles: an authoritative/primary source and an explanation, application, limitation, or competing view.
2. Read the strongest sources rather than relying on search snippets.
3. Save one or more evidence files under `evidence/` with a descriptive numeric name such as `03-rfc-architecture.md`.
4. Write a dense subtopic note in `notes/` covering:
   - the essential ideas and vocabulary
   - mechanism or causal chain
   - a concrete example or worked scenario
   - misconceptions, limitations, or trade-offs
   - how it connects to the preceding and following subtopics
   - source reference numbers and URLs
5. Mark that subtopic complete in `plan.md` only when it has enough evidence to teach accurately.

For paper-heavy topics, use the optional official arXiv helper:

```bash
uv run <skill-directory>/references/scripts/scrape_arxiv.py "<topic>" \
  --limit 10 --out .superlearn/<topic-slug>/evidence/arxiv.json
```

The script is an aid for finding literature, not evidence by itself: read the relevant papers or their official abstracts before making claims.

### 3. Check coverage

Before writing the dossier, verify that:

- every planned subtopic is checked and has a notes file
- foundational terms are defined before they are used
- important factual claims have citations
- the research includes primary/official sources where practical, not only tertiary explainers
- open questions and credible disagreements are represented rather than flattened

Research more if any of these are weak. Do not compress the work merely to make it short.

### 4. Write the dossier

Create `.superlearn/<topic-slug>/dossier.md` from the supplied template. Tailor its headings to the topic while retaining these essential parts:

1. scope and learner assumptions
2. executive overview
3. prerequisite concepts and vocabulary
4. a structured explanation from foundations through advanced material
5. examples, applications, and/or worked reasoning
6. pitfalls, trade-offs, and limitations
7. open questions or current frontier, when relevant
8. a practical learning path
9. sources and further reading

Use explanatory prose first. Use tables only where comparison genuinely helps. Include equations, diagrams, or code only when they clarify the topic; code must be labelled with its language and should be runnable or explicitly marked as illustrative.

### 5. Validate and hand over

Run the included structural check:

```bash
uv run <skill-directory>/references/scripts/validate_dossier.py \
  .superlearn/<topic-slug>/dossier.md
```

Resolve every error. Warnings require judgement, but do not ignore missing citations or sources.

Tell the user where the dossier and research trail were saved, summarize the coverage, and call out the most important uncertainty or next step. On a follow-up such as “go deeper on X,” add evidence and update the relevant dossier section rather than regenerating the entire workspace.
