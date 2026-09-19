---
name: diagram-diff
description: Draw a code change as animated architecture and data-flow diagrams. Author a graph document from a diff, check it against the contract, and render it as one self-contained HTML page; or correct a repository's map in .github/diagram-map.yml. Use when asked to diagram, visualise or explain the shape of a change, when attaching a diagram to a pull request you opened, or when an existing diagram names things wrongly.
disable-model-invocation: true
---

# Diagramming a diff

A diff becomes one JSON document (lanes, nodes, edges, ordered flows), and that document renders as a single self-contained HTML page of animated diagrams — both lenses, both themes, the stats row and the drill-down tree in one file that opens from disk. The document is the whole contract: if it passes every rule, it renders.

You are the model and the tooling. Read the diff, write the document, check it against the contract yourself, and draw the page yourself. Nothing on this path needs a model key or a package; the validator needs only a Python 3 interpreter. Everything is in the reference pages and the example beside this one.

## The loop

1. **Read the diff** by the analysis contract in `references/analysis.md`: choose the input the user named (default: `git diff --find-renames <base>...<head>`, where base is the merge base), inspect it read-only, inventory the change, chunk when it does not fit, and settle moves before you write anything.
2. **Write the document** to `.diagram/graph.json`, following `references/graph-document.md` for the shape and `references/analysis.md` for what it may claim. `references/graph-document.md` is the whole shape: every field, every enum, every limit, and the rules a field list cannot express. `references/example.graph.json` is a document that passes every rule — three lanes, all four delta states, a hero edge, a seven-step flow, a nested drill-down tree. Read it before you write your first one; it is quicker than reading the reference.
3. **Check it.** Run `python3 references/validate.py .diagram/graph.json` and fix every error before rendering. Read the warnings, then re-read `references/graph-document.md` for the rules only a reader can judge. Do not "work around" a failure by deleting the element it names.
4. **Render.** Follow `references/render.md` to draw the diagrams and `references/html.md` for the page around them, and produce the final output yourself: **one self-contained HTML page** per document — both lenses, both themes, the stats row and the drill-down tree in a single file that opens from disk with no network. Name it `<slug>.html` (the document title in kebab-case) and write it, plus `drawn.graph.json` (the document with any corrections applied — the picture must match the `.github/diagram-map.yml` overlay, not your first draft; validate it the same way), into `.diagram/`, and add `.diagram/` to the repository's `.gitignore`. Do not commit any of it: these files are a preview, rebuilt from the diff whenever anyone wants them again; the HTML page is the thing you are making.
5. **Hand it over.** Open the page (`open .diagram/<slug>.html` on macOS) and read it as a reviewer would before anyone else does — one diagram at a time, drill-downs working, both themes readable, pulses moving. Then run the verification checklist in `references/analysis.md` and send the one file wherever the review happens. The rule: the page must describe only what the diagrams show.


## What makes a document worth reading

- **Include what did not change.** A diagram of only the changed nodes says nothing about blast radius. The unchanged neighbours a change touches are the context; mark them `delta: "unchanged"`.
- **Lanes are the reader's mental model** (a runtime, a tier, a boundary), not the folder tree.
- **One hero edge**, two at the outside: the connection the change is really about.
- **Add a flow only when there is a sequence** worth animating. One good flow beats three thin ones.
- **Attach file refs**: they become the permalinks a reviewer clicks.
- **There is no findings lens.** This is the comprehension layer, not a review bot. There is no field for a bug, a risk or a security note, and a document that invents one is invalid rather than trimmed.

## Choosing architecture views

Treat architecture views as a C4-inspired decision tree, not a checklist. One useful view is enough for a small change. Start with system context when the change affects a user, an external system or a system boundary. Use a container view for the affected applications, services, jobs, data stores and runtimes. Add a component child only when an affected container's internals matter. Do not add code-level views by default.

Every child moves down one level and covers a materially narrower scope. Skip empty, repetitive or speculative levels, and do not infer architecture from folder names alone. Two views should not carry substantially the same nodes and edges. Keep the unchanged direct neighbours that explain blast radius.

Keep data-flow views as separate roots rather than nesting them in the architecture tree. Set `defaultOpen: true` on the highest useful architecture view. Lower levels should normally keep the default, `false`.

## The four rules that catch nearly everything

Run `python3 references/validate.py .diagram/graph.json` on the draft and again on `drawn.graph.json`. Every rule below is a validator error:

| What fails | How it shows |
| --- | --- |
| Referential integrity | an edge, a flow step or a view names an id you never declared |
| Strict keys | an invented field; the shape is strict, unknown keys are rejected |
| Duplicate ids | any two elements sharing an id |
| Version | `schemaVersion` is not the contract version this skill ships |

The validator also checks what a shape cannot: line ranges that end before they start, `self` messages whose endpoints disagree, patches whose two commits are the same — and reports the judgment calls it can detect (more than two hero edges, a document whose every node is added, a declared data-flow lens with no flows) as warnings. The judgment calls it cannot detect — delta words restated in labels, duplicate-feeling views, stats that do not match the diff — are still yours. Always check.

## Fixing a map instead of writing one

When someone says the diagram is wrong (a node is misnamed, a folder should not be on it, something sits in the wrong lane), do not edit the generated document. It is regenerated on every run. Write the correction into `.github/diagram-map.yml`, which is an overlay applied over fresh inference every time:

```yaml
schemaVersion: 0.1.0
map:
  rename:
    - match: functions/src/broadcast/sendBroadcastBulk.ts
      to: Broadcast sender
  exclude:
    - "**/*.test.ts"
  lane:
    - match: packages/broadcast-lib/**
      lane: functions
```

`references/config.md` has the full format and the recipes. Check it the same way you check the document: walk each selector against the file paths, apply the overlay, and confirm every correction changes something about the diagram. A `match` beginning with `id:` addresses one node exactly; anything else is a path glob matched against a node's file paths. Prefer the glob, because it keeps holding when the next run names the node differently. A lane pin may name a lane the document never declared: the band is created, and takes the id for its label, so give it one a reader would want to see. A correction that matched nothing is usually one whose file moved or was deleted — not an error, but worth fixing, because a correction that matches nothing is a correction nobody is getting.

## What ships with this skill

Everything you need is beside this page. Nothing here asks you to install a package first.

| | |
| --- | --- |
| `references/analysis.md` | the analysis contract: choosing the diff input, read-only inspection, inventory and chunking, moves, and what the document may claim |
| `references/graph-document.md` | the document, field by field: enums, limits, and where documents actually go wrong |
| `references/render.md` | the picture, measurement by measurement: palettes, lanes, cards, edges, pulses |
| `references/html.md` | the page: the self-contained HTML contract, its structure and its checks |
| `references/config.md` | `.github/diagram-map.yml`, the correction overlay, in full |
| `references/example.graph.json` | one complete document that passes every rule, to read and to copy the shape of |
| `references/validate.py` | the offline validator — `python3 references/validate.py <document>`: every shape and reference rule, plus the judgment calls it can detect as warnings |