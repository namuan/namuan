# Authoring a graph document

This page is the whole shape, and what a schema cannot tell you besides: which parts matter, and where documents actually go wrong. `references/example.graph.json` is one document that validates, if you would rather read than be told.

This page is the whole contract: the shape `references/render.md` draws, and the rules a shape cannot express.

Every schema here is **strict**: an unknown key is a rejection, not a warning. A field with a default may be left out.

## The document

```json
{
  "schemaVersion": "0.1.0",
  "kind": "graph",
  "title": "Batch broadcast sending through Postmark",
  "summary": "One paragraph answering: what does this change do?",
  "lenses": ["architecture", "data-flow"],
  "generatedAt": "2026-08-19T18:24:00.000Z",
  "provenance": { "repo": { "owner": "…", "name": "…" }, "base": { "sha": "…", "ref": "…" }, "head": { "sha": "…", "ref": "…" } },
  "lanes": [],
  "nodes": [],
  "edges": [],
  "flows": [],
  "stats": {},
  "views": []
}
```

The empty arrays above are a skeleton, not a valid document: the limits below are the contract (`lanes` 1–16, `nodes` 1–256).

`lenses` declares what the document carries enough detail to draw: `architecture`, `data-flow`, or both. A document carrying flows must declare `data-flow`.

`provenance` is where the document came from: the repository (`owner`, `name`, and optionally `host`, which defaults to `github.com` and anchors the permalinks), the base and head commit `sha`s (lowercase hex, 7-40 characters, never the same commit, optionally each carrying a `ref`), optionally a `pullRequest` (`number`, `title`, `url`) and a `generator`. Fill them from the repository with git; do not invent them. `generatedAt` is an optional ISO-8601 timestamp of generation; it is informational and never rendered.

## Ids

`^[A-Za-z0-9][A-Za-z0-9._:/-]*$`, at most 128 characters, unique across the whole document: lanes, nodes, edges, flows, views and flow steps share one id space. An id ends up in an SVG id and a URL fragment in one self-contained page, so a collision between a node and a view is a broken page, not a style choice. Use readable kebab-case: `broadcast-sender`, not `n1`.

## Deltas

Every node, edge, flow and flow step declares one: `added`, `modified`, `removed`, `unchanged`.

`unchanged` is not padding. It is the neighbouring code the change touches, and it is what turns a diagram into a blast radius. A document whose every element is `added` describes a change nobody can place.

## Lanes

1 to 16. Every node belongs to exactly one.

```json
{ "id": "functions", "label": "Cloud Functions", "subtitle": "Node 20", "order": 1 }
```

`order` (0-64) places lanes left to right; ties fall back to array order. Give a lane a `delta` only when the lane itself is new or gone: `added` or `removed`.

## Nodes

1 to 256.

```json
{
  "id": "send-broadcast-bulk",
  "label": "sendBroadcastBulk",
  "kind": "function",
  "delta": "added",
  "lane": "functions",
  "group": "broadcast-lib",
  "subtitle": "(broadcastId) => Promise<void>",
  "summary": "Claims the broadcast, builds one bulk payload and posts it.",
  "files": [{ "path": "functions/src/broadcast/sendBroadcastBulk.ts", "startLine": 1, "endLine": 142 }],
  "badges": ["retry"]
}
```

`kind` is one of `service app module function route job queue datastore cache external ui config test package other`. It drives the card's icon and shape and nothing else; when in doubt, `other` still renders.

`group` clusters nodes inside a lane: a package, a folder that means something. `files` (up to 64) become diff permalinks. `badges` (up to 6) are extra chips; the delta badge is drawn for you, so do not restate it.

## Edges

Up to 512.

```json
{
  "id": "bulk-to-postmark",
  "from": "send-broadcast-bulk",
  "to": "postmark",
  "kind": "http",
  "delta": "added",
  "label": "POST /email/bulk",
  "emphasis": "hero",
  "animated": true
}
```

`kind` is one of `call http rpc event queue data dependency render other`. `emphasis` is `normal` (default), `hero` or `muted`. More than one or two heroes and the emphasis stops meaning anything. `from` and `to` must be node ids you declared and must be distinct: a node talking to itself is a flow `self` message, not an edge. This is the single most common failure. `animated` defaults to `false`; set `true` when the edge carries a pulse. `summary` is optional; it renders in the view's section like a node summary.

## Flows

Up to 16, for the data-flow lens.

```json
{
  "id": "send-pipeline",
  "title": "Sending a broadcast",
  "delta": "modified",
  "summary": "The path a queued broadcast takes now, from enqueue to per-message results.",
  "participants": [
    { "node": "queue-route", "label": "queue route" },
    { "node": "send-broadcast-bulk" },
    { "node": "postmark" }
  ],
  "messages": [
    { "id": "enqueue", "from": "queue-route", "to": "send-broadcast-bulk", "label": "enqueue job", "kind": "async", "delta": "modified" },
    { "id": "send", "from": "send-broadcast-bulk", "to": "postmark", "label": "POST /email/bulk", "kind": "sync", "delta": "added", "repeat": 4, "note": "One request per 500 recipients." },
    { "id": "accepted", "from": "postmark", "to": "send-broadcast-bulk", "label": "200 Accepted", "kind": "return", "delta": "added", "animated": false }
  ]
}
```

- 2 to 12 distinct participants, ordered by array position; each names a node id, and may carry a `label` that replaces the node's label for this flow.
- 1 to 64 messages. **Step order is array order**: there is no step number field, so a document cannot disagree with its own animation.
- `kind` is `sync`, `async`, `return` or `self`. `self` requires `from === to`, and no other kind may have them equal.
- Both endpoints must be participants of that flow, not merely nodes of the document.
- `repeat` says a step happens more than once per run — an integer of 2 or more, e.g. 4 batched requests.
- `animated` defaults to `true`: the data-flow clock animates every step. Set `false` to keep one step static.
- `note` is optional; it renders muted beside the step's label.
- `summary` is optional; it renders under the flow's title in the data-flow lens.

## Stats

```json
{ "filesChanged": 27, "additions": 1979, "deletions": 1370, "chips": [{ "label": "Postmark calls", "value": "500× fewer", "tone": "hero" }] }
```

`stats` may be omitted. When present: `filesChanged`, `additions` and `deletions` are non-negative integers; `chips` up to 8, `label` within the label limit, `value` within the chip-value limit, `tone` one of `neutral added modified removed hero`. Per-delta element counts are deliberately absent from the schema: they are derivable from the document, and a stored copy can only go stale.

## Views

The drill-down tree of the page: up to 32 at the root, nesting up to 32 children each. A document with no views renders as one picture and nothing else.

```json
{
  "id": "the-new-path",
  "title": "The new batch path",
  "lens": "architecture",
  "summary": "What replaced the per-recipient loop.",
  "defaultOpen": false,
  "scope": { "kind": "selection", "nodes": ["send-broadcast-bulk", "postmark"] },
  "children": []
}
```

`scope` is either `{ "kind": "all" }` (the default) or a selection naming at least one lane, node, edge or flow. The two are distinct states on purpose: removing the last element a view pointed at can never quietly turn it into a view of everything. A view's `lens` must be one the document declares.

### Choosing architecture views

Treat the architecture tree as a set of decisions, not a quota:

1. Ask whether the change affects a user, an external system or a system boundary. If it does, start with a system-context view. If it does not, leave that level out.
2. Show affected applications, services, jobs, data stores and runtimes in a container view. Make it the root when there is no useful context view; otherwise make it a child of that context.
3. Add a component child only when the internals of an affected container matter to the change. Components may be modules, routes or functions, but the view should explain their responsibilities and relationships rather than mirror folders.
4. Stop at components unless someone explicitly asks for code-level detail.

One architecture view may be the right answer for a small change. Each child must move down exactly one level and cover a materially narrower scope. Skip a level when it would be empty, speculative or a repeat of its parent. Do not create two views with substantially the same nodes and edges, and do not infer a boundary from a folder name alone. Keep unchanged direct neighbours when they make the blast radius clear.

Set `defaultOpen: true` on the highest useful architecture view. Lower levels should normally stay collapsed. A data-flow view describes an ordered sequence, so keep it as a separate root instead of placing it inside the architecture hierarchy.

This compact fragment shows the shape. The selected ids refer to elements declared elsewhere in the document:

```json
{
  "views": [
    {
      "id": "checkout-context",
      "title": "Checkout in its environment",
      "lens": "architecture",
      "defaultOpen": true,
      "scope": {
        "kind": "selection",
        "nodes": ["shopper", "commerce-platform", "payment-provider", "fulfilment-system"],
        "edges": ["shopper-to-commerce", "commerce-to-payment", "commerce-to-fulfilment"]
      },
      "children": [
        {
          "id": "checkout-containers",
          "title": "Checkout containers",
          "lens": "architecture",
          "scope": {
            "kind": "selection",
            "nodes": ["storefront", "checkout-api", "orders-db", "payment-provider"],
            "edges": ["storefront-to-checkout", "checkout-to-orders", "checkout-to-payment"]
          },
          "children": [
            {
              "id": "checkout-components",
              "title": "Checkout API components",
              "lens": "architecture",
              "scope": {
                "kind": "selection",
                "nodes": ["checkout-route", "order-service", "payment-client"],
                "edges": ["route-to-orders", "orders-to-payment-client"]
              }
            }
          ]
        }
      ]
    },
    {
      "id": "place-order-flow",
      "title": "Placing an order",
      "lens": "data-flow",
      "scope": { "kind": "selection", "flows": ["place-order"] }
    }
  ]
}
```

## Layout

```json
{ "direction": "right", "laneOrder": ["api", "functions", "external"], "rank": { "send-broadcast-bulk": 2 } }
```

`direction` is one of `right`, `left`, `top` or `bottom` (default `right`). `laneOrder`, when present, must list every declared lane exactly once, and wins over each lane's `order`. `rank` maps node ids to non-negative integers as a placement hint.

Hints, not instructions: the renderer owns final placement, so a diagram stays deterministic and a stale hint cannot break it. Absolute coordinates are not expressible. Omitting `layout` entirely is normal.

## File references

```json
{ "path": "functions/src/broadcast/sendBroadcastBulk.ts", "startLine": 1, "endLine": 142, "revision": "head" }
```

Repository-relative POSIX paths: no leading `/`, no drive letter, no backslash, no `..` segment. Lines are 1-based, `endLine` requires `startLine` and may not precede it. `revision` defaults to `head`; use `base` when the path exists only at the base commit — a removed element's refs, or the old side of a move (one node carrying the old path with `"revision": "base"` and the new path without one).

## Length limits

| Field | Limit |
| --- | --- |
| ids | 128 characters |
| labels, titles, subtitles, groups, participant labels, chip labels | 120 characters |
| summaries and notes | 2000 characters |
| chip values, badge text | 32 characters |

They are display fields: a label that needs 120 characters is a label the diagram cannot draw. The validator enforces every limit above.

## Then check it

Run `python3 references/validate.py .diagram/graph.json` on the draft, and again on `drawn.graph.json` once the overlay is applied. The validator enforces every shape and reference rule on this page, and reports the judgment calls it can detect as warnings. The four failures that account for nearly everything are all validator errors:

| What fails | How it shows |
| --- | --- |
| Referential integrity | an edge, a flow step or a view names an id you never declared |
| Strict keys | an invented field; unknown keys are rejected |
| Duplicate ids | any two elements sharing an id |
| Version | `schemaVersion` is not the contract version this skill ships |

The rules a schema alone could not express are plain checks in the validator: referential integrity, a line range that ends before it starts, a `self` message whose endpoints disagree, and a patch whose two commits are the same.

What stays yours: labels that restate the delta badge, hero edges that stopped meaning anything, two views carrying substantially the same nodes and edges, stats that do not match the real diff, and measures the validator only warns on. Find every problem, not just the first. Fix them all; do not "work around" one by deleting the element it names.
