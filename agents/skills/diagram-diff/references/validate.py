#!/usr/bin/env python3
import json
import re
import sys
from datetime import datetime

SCHEMA_VERSION = "0.1.0"
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]*$")
SHA_PATTERN = re.compile(r"^[0-9a-f]{7,40}$")
NODE_KINDS = frozenset(["service", "app", "module", "function", "route", "job", "queue", "datastore", "cache", "external", "ui", "config", "test", "package", "other"])
EDGE_KINDS = frozenset(["call", "http", "rpc", "event", "queue", "data", "dependency", "render", "other"])
MESSAGE_KINDS = frozenset(["sync", "async", "return", "self"])
LANE_DELTAS = frozenset(["added", "removed"])
DELTAS = frozenset(["added", "modified", "removed", "unchanged"])
TONES = frozenset(["neutral", "added", "modified", "removed", "hero"])
EMPHASIS = frozenset(["normal", "hero", "muted"])
REVISIONS = frozenset(["head", "base"])
LENSES = frozenset(["architecture", "data-flow"])
DIRECTIONS = frozenset(["right", "left", "top", "bottom"])

MAX_ID = 128
MAX_LABEL = 120
MAX_SUMMARY = 2000
MAX_CHIP_VALUE = 32
MAX_BADGE = 32

USAGE = """Validates a diagram-diff graph document against references/graph-document.md.

Usage:
    python3 validate.py <graph.json> [<graph.json> ...]

Exit status: 0 when every document has no errors (warnings allowed), 1 otherwise.
"""


class Checker:
    def __init__(self, path):
        self.path = path
        self.errors = []
        self.warnings = []
        self.lane_ids = set()
        self.node_ids = set()
        self.edge_ids = set()
        self.flow_ids = set()
        self.view_ids = set()
        self.all_ids = set()
        self.lenses = set()
        self.hero_edges = 0
        self.node_deltas = []
        self.doc_flows = False
        self.doc_nodes = []

    def error(self, where, message):
        self.errors.append(f"{self.path}: {where}: {message}")

    def warn(self, where, message):
        self.warnings.append(f"{self.path}: {where}: {message}")

    def expect_object(self, value, where):
        if not isinstance(value, dict):
            self.error(where, f"expected an object, got {type(value).__name__}")
            return False
        return True

    def check_keys(self, obj, allowed, where):
        for key in obj:
            if key not in allowed:
                self.error(where, f"unknown key {key!r} (allowed: {', '.join(sorted(allowed))})")

    def require_string(self, value, where, max_len, name):
        if not isinstance(value, str) or not value:
            self.error(where, f"{name} must be a non-empty string")
            return False
        if len(value) > max_len:
            self.error(where, f"{name} is {len(value)} characters, limit is {max_len}")
            return False
        return True

    def optional_string(self, obj, key, where, max_len, name):
        if key in obj:
            self.require_string(obj[key], where, max_len, name)

    def check_id(self, value, where):
        if not isinstance(value, str) or not ID_PATTERN.match(value) or len(value) > MAX_ID:
            self.error(where, f"invalid id {value!r}: must match {ID_PATTERN.pattern}, at most {MAX_ID} characters")
            return False
        if value in self.all_ids:
            self.error(where, f"duplicate id {value!r}")
            return False
        self.all_ids.add(value)
        return True

    def check_flag(self, value, where, name):
        if not isinstance(value, bool):
            self.error(where, f"{name} must be a boolean")

    def check_int(self, value, where, name, minimum, maximum=None):
        if not isinstance(value, int) or isinstance(value, bool):
            self.error(where, f"{name} must be an integer, got {value!r}")
            return False
        if maximum is None:
            ok = value >= minimum
            limit = f">= {minimum}"
        else:
            ok = minimum <= value <= maximum
            limit = f"{minimum}-{maximum}"
        if not ok:
            self.error(where, f"{name} must be an integer {limit}, got {value!r}")
            return False
        return True

    def check_enum(self, value, where, name, allowed):
        if value not in allowed:
            self.error(where, f"{name} must be one of {', '.join(sorted(allowed))}, got {value!r}")
            return False
        return True

    def check_file_refs(self, files, where):
        if files is None:
            return
        if not isinstance(files, list):
            self.error(where, "must be a list of file references")
            return
        if len(files) > 64:
            self.error(where, f"at most 64 file references, found {len(files)}")
        for i, entry in enumerate(files):
            w = f"{where}[{i}]"
            if not self.expect_object(entry, w):
                continue
            self.check_keys(entry, {"path", "startLine", "endLine", "revision"}, w)
            path = entry.get("path")
            if not isinstance(path, str) or not path:
                self.error(f"{w}.path", "must be a non-empty string")
            elif path.startswith("/") or "\\" in path or re.match(r"^[A-Za-z]:", path) or any(seg in ("", ".", "..") for seg in path.split("/")):
                self.error(f"{w}.path", f"{path!r} must be repository-relative POSIX: no leading /, no drive letter, no backslash, no . or .. segments")
            start = entry.get("startLine")
            end = entry.get("endLine")
            if start is not None:
                self.check_int(start, f"{w}.startLine", "startLine", 1)
            if end is not None:
                self.check_int(end, f"{w}.endLine", "endLine", 1)
            if end is not None and start is None:
                self.error(w, "endLine requires startLine")
            elif isinstance(start, int) and not isinstance(start, bool) and isinstance(end, int) and not isinstance(end, bool) and end < start:
                self.error(w, f"line range ends before it starts: {start}..{end}")
            self.check_enum(entry.get("revision", "head"), f"{w}.revision", "revision", REVISIONS)

    def check_badges(self, badges, where):
        if badges is None:
            return
        if not isinstance(badges, list):
            self.error(where, "must be a list of badge strings")
            return
        if len(badges) > 6:
            self.error(where, f"at most 6 badges, found {len(badges)}")
        for i, badge in enumerate(badges):
            self.require_string(badge, f"{where}[{i}]", MAX_BADGE, "badge")

    def check_lanes(self, lanes):
        if not isinstance(lanes, list):
            self.error("document.lanes", "must be a list of lanes")
            return
        if not 1 <= len(lanes) <= 16:
            self.error("document.lanes", f"must carry between 1 and 16 lanes, found {len(lanes)}")
        for i, lane in enumerate(lanes):
            w = f"document.lanes[{i}]"
            if not self.expect_object(lane, w):
                continue
            self.check_keys(lane, {"id", "label", "subtitle", "order", "delta"}, w)
            if self.check_id(lane.get("id"), f"{w}.id"):
                self.lane_ids.add(lane["id"])
            self.require_string(lane.get("label"), f"{w}.label", MAX_LABEL, "label")
            self.optional_string(lane, "subtitle", f"{w}.subtitle", MAX_LABEL, "subtitle")
            if "order" in lane:
                self.check_int(lane["order"], f"{w}.order", "order", 0, 64)
            if "delta" in lane:
                self.check_enum(lane["delta"], f"{w}.delta", "lane delta", LANE_DELTAS)

    def check_nodes(self, nodes):
        if not isinstance(nodes, list):
            self.error("document.nodes", "must be a list of nodes")
            return
        if not 1 <= len(nodes) <= 256:
            self.error("document.nodes", f"must carry between 1 and 256 nodes, found {len(nodes)}")
        for i, node in enumerate(nodes):
            w = f"document.nodes[{i}]"
            if not self.expect_object(node, w):
                continue
            self.check_keys(node, {"id", "label", "kind", "delta", "lane", "group", "subtitle", "summary", "files", "badges"}, w)
            if self.check_id(node.get("id"), f"{w}.id"):
                self.node_ids.add(node["id"])
            self.require_string(node.get("label"), f"{w}.label", MAX_LABEL, "label")
            self.check_enum(node.get("kind"), f"{w}.kind", "kind", NODE_KINDS)
            delta = node.get("delta")
            if self.check_enum(delta, f"{w}.delta", "delta", DELTAS):
                self.node_deltas.append(delta)
            if node.get("lane") not in self.lane_ids:
                self.error(f"{w}.lane", f"{node.get('lane')!r} is not a declared lane id")
            self.optional_string(node, "group", f"{w}.group", MAX_LABEL, "group")
            self.optional_string(node, "subtitle", f"{w}.subtitle", MAX_LABEL, "subtitle")
            self.optional_string(node, "summary", f"{w}.summary", MAX_SUMMARY, "summary")
            self.check_badges(node.get("badges"), f"{w}.badges")
            self.check_file_refs(node.get("files"), f"{w}.files")

    def check_edges(self, edges):
        if not isinstance(edges, list):
            self.error("document.edges", "must be a list of edges")
            return
        if len(edges) > 512:
            self.error("document.edges", f"at most 512 edges, found {len(edges)}")
        for i, edge in enumerate(edges):
            w = f"document.edges[{i}]"
            if not self.expect_object(edge, w):
                continue
            self.check_keys(edge, {"id", "from", "to", "kind", "delta", "label", "emphasis", "animated", "summary"}, w)
            if self.check_id(edge.get("id"), f"{w}.id"):
                self.edge_ids.add(edge["id"])
            frm = edge.get("from")
            to = edge.get("to")
            if frm not in self.node_ids:
                self.error(f"{w}.from", f"{frm!r} is not a declared node id")
            if to not in self.node_ids:
                self.error(f"{w}.to", f"{to!r} is not a declared node id")
            if frm == to:
                self.error(w, "from and to must be distinct nodes; a self-loop is a flow self message, not an edge")
            self.check_enum(edge.get("kind"), f"{w}.kind", "kind", EDGE_KINDS)
            self.check_enum(edge.get("delta"), f"{w}.delta", "delta", DELTAS)
            self.optional_string(edge, "label", f"{w}.label", MAX_LABEL, "label")
            emphasis = edge.get("emphasis", "normal")
            if self.check_enum(emphasis, f"{w}.emphasis", "emphasis", EMPHASIS) and emphasis == "hero":
                self.hero_edges += 1
            if "animated" in edge:
                self.check_flag(edge["animated"], f"{w}.animated", "animated")
            self.optional_string(edge, "summary", f"{w}.summary", MAX_SUMMARY, "summary")

    def check_flows(self, flows):
        if not isinstance(flows, list):
            self.error("document.flows", "must be a list of flows")
            return
        if len(flows) > 16:
            self.error("document.flows", f"at most 16 flows, found {len(flows)}")
        if flows and "data-flow" not in self.lenses:
            self.error("document.flows", "a document carrying flows must declare the data-flow lens")
        for i, flow in enumerate(flows):
            w = f"document.flows[{i}]"
            if not self.expect_object(flow, w):
                continue
            self.check_keys(flow, {"id", "title", "delta", "summary", "participants", "messages"}, w)
            if self.check_id(flow.get("id"), f"{w}.id"):
                self.flow_ids.add(flow["id"])
            self.require_string(flow.get("title"), f"{w}.title", MAX_LABEL, "title")
            self.check_enum(flow.get("delta"), f"{w}.delta", "delta", DELTAS)
            self.optional_string(flow, "summary", f"{w}.summary", MAX_SUMMARY, "summary")
            participants = flow.get("participants")
            if not isinstance(participants, list):
                self.error(f"{w}.participants", "must be a list of participants")
                continue
            if not 2 <= len(participants) <= 12:
                self.error(f"{w}.participants", f"must carry between 2 and 12 participants, found {len(participants)}")
            seen = set()
            for j, participant in enumerate(participants):
                pw = f"{w}.participants[{j}]"
                if not self.expect_object(participant, pw):
                    continue
                self.check_keys(participant, {"node", "label"}, pw)
                node = participant.get("node")
                if node not in self.node_ids:
                    self.error(f"{pw}.node", f"{node!r} is not a declared node id")
                elif node in seen:
                    self.error(f"{pw}.node", f"participant {node!r} appears twice in one flow")
                else:
                    seen.add(node)
                self.optional_string(participant, "label", f"{pw}.label", MAX_LABEL, "label")
            messages = flow.get("messages")
            if not isinstance(messages, list):
                self.error(f"{w}.messages", "must be a list of messages")
                continue
            if not 1 <= len(messages) <= 64:
                self.error(f"{w}.messages", f"must carry between 1 and 64 messages, found {len(messages)}")
            message_ids = set()
            for j, message in enumerate(messages):
                mw = f"{w}.messages[{j}]"
                if not self.expect_object(message, mw):
                    continue
                self.check_keys(message, {"id", "from", "to", "label", "kind", "delta", "repeat", "animated", "note"}, mw)
                mid = message.get("id")
                if not isinstance(mid, str) or not ID_PATTERN.match(mid) or len(mid) > MAX_ID:
                    self.error(f"{mw}.id", f"invalid id {mid!r}: must match {ID_PATTERN.pattern}, at most {MAX_ID} characters")
                elif mid in message_ids or mid in self.all_ids:
                    self.error(f"{mw}.id", f"duplicate id {mid!r}")
                else:
                    message_ids.add(mid)
                    self.all_ids.add(mid)
                frm = message.get("from")
                to = message.get("to")
                if frm not in seen:
                    self.error(f"{mw}.from", f"{frm!r} is not a participant of this flow")
                if to not in seen:
                    self.error(f"{mw}.to", f"{to!r} is not a participant of this flow")
                kind = message.get("kind")
                if self.check_enum(kind, f"{mw}.kind", "kind", MESSAGE_KINDS):
                    if kind == "self" and frm != to:
                        self.error(mw, "a self message must have from == to")
                    elif kind != "self" and frm == to:
                        self.error(mw, "only a self message may have from == to")
                self.check_enum(message.get("delta"), f"{mw}.delta", "delta", DELTAS)
                self.optional_string(message, "label", f"{mw}.label", MAX_LABEL, "label")
                if "repeat" in message:
                    self.check_int(message["repeat"], f"{mw}.repeat", "repeat", 2)
                if "animated" in message:
                    self.check_flag(message["animated"], f"{mw}.animated", "animated")
                self.optional_string(message, "note", f"{mw}.note", MAX_SUMMARY, "note")

    def check_stats(self, stats):
        if stats is None:
            return
        w = "document.stats"
        if not self.expect_object(stats, w):
            return
        self.check_keys(stats, {"filesChanged", "additions", "deletions", "chips"}, w)
        for key in ("filesChanged", "additions", "deletions"):
            if key in stats:
                self.check_int(stats[key], f"{w}.{key}", key, 0)
        chips = stats.get("chips")
        if chips is None:
            return
        if not isinstance(chips, list):
            self.error(f"{w}.chips", "must be a list of chips")
            return
        if len(chips) > 8:
            self.error(f"{w}.chips", f"at most 8 chips, found {len(chips)}")
        for i, chip in enumerate(chips):
            cw = f"{w}.chips[{i}]"
            if not self.expect_object(chip, cw):
                continue
            self.check_keys(chip, {"label", "value", "tone"}, cw)
            self.require_string(chip.get("label"), f"{cw}.label", MAX_LABEL, "label")
            value = chip.get("value")
            if not isinstance(value, str) or not value:
                self.error(f"{cw}.value", "value must be a non-empty string")
            elif len(value) > MAX_CHIP_VALUE:
                self.error(f"{cw}.value", f"value is {len(value)} characters, limit is {MAX_CHIP_VALUE}")
            self.check_enum(chip.get("tone"), f"{cw}.tone", "tone", TONES)

    def check_views(self, views, where="document.views"):
        if not isinstance(views, list):
            self.error(where, "must be a list of views")
            return
        if len(views) > 32:
            self.error(where, f"at most 32 views here, found {len(views)}")
        for i, view in enumerate(views):
            w = f"{where}[{i}]"
            if not self.expect_object(view, w):
                continue
            self.check_keys(view, {"id", "title", "lens", "summary", "defaultOpen", "scope", "children"}, w)
            if self.check_id(view.get("id"), f"{w}.id"):
                self.view_ids.add(view["id"])
            self.require_string(view.get("title"), f"{w}.title", MAX_LABEL, "title")
            if view.get("lens") not in self.lenses:
                self.error(f"{w}.lens", f"{view.get('lens')!r} is not a declared lens (declared: {', '.join(sorted(self.lenses))})")
            self.optional_string(view, "summary", f"{w}.summary", MAX_SUMMARY, "summary")
            if "defaultOpen" in view:
                self.check_flag(view["defaultOpen"], f"{w}.defaultOpen", "defaultOpen")
            scope = view.get("scope")
            if scope is not None:
                sw = f"{w}.scope"
                if not self.expect_object(scope, sw):
                    continue
                self.check_keys(scope, {"kind", "lanes", "nodes", "edges", "flows"}, sw)
                kind = scope.get("kind", "all")
                if kind == "selection":
                    named = 0
                    for key, known in (("lanes", self.lane_ids), ("nodes", self.node_ids), ("edges", self.edge_ids), ("flows", self.flow_ids)):
                        values = scope.get(key)
                        if values is None:
                            continue
                        if not isinstance(values, list):
                            self.error(f"{sw}.{key}", "must be a list of ids")
                            continue
                        named += len(values)
                        for j, value in enumerate(values):
                            if value not in known:
                                self.error(f"{sw}.{key}[{j}]", f"{value!r} is not a declared {key[:-1]} id")
                    if named == 0:
                        self.error(sw, "a selection scope must name at least one lane, node, edge or flow")
                elif kind != "all":
                    self.error(f"{sw}.kind", f"must be 'all' or 'selection', got {kind!r}")
            if "children" in view:
                self.check_views(view["children"], f"{w}.children")

    def check_layout(self, layout):
        if layout is None:
            return
        w = "document.layout"
        if not self.expect_object(layout, w):
            return
        self.check_keys(layout, {"direction", "laneOrder", "rank"}, w)
        if "direction" in layout:
            self.check_enum(layout["direction"], f"{w}.direction", "direction", DIRECTIONS)
        lane_order = layout.get("laneOrder")
        if lane_order is not None:
            if not isinstance(lane_order, list):
                self.error(f"{w}.laneOrder", "must be a list of lane ids")
            elif len(set(lane_order)) != len(lane_order) or set(lane_order) != self.lane_ids:
                self.error(f"{w}.laneOrder", "must list every declared lane exactly once")
        rank = layout.get("rank")
        if rank is not None:
            if not isinstance(rank, dict):
                self.error(f"{w}.rank", "must be an object mapping node ids to non-negative integers")
            else:
                for node_id, value in rank.items():
                    if node_id not in self.node_ids:
                        self.error(f"{w}.rank", f"{node_id!r} is not a declared node id")
                    self.check_int(value, f"{w}.rank.{node_id}", "rank value", 0)

    def check_provenance(self, provenance):
        if provenance is None:
            self.error("document.provenance", "is required")
            return
        w = "document.provenance"
        if not self.expect_object(provenance, w):
            return
        self.check_keys(provenance, {"repo", "base", "head", "pullRequest", "generator"}, w)
        repo = provenance.get("repo")
        if repo is None:
            self.error(f"{w}.repo", "is required")
        elif self.expect_object(repo, f"{w}.repo"):
            self.check_keys(repo, {"owner", "name", "host"}, f"{w}.repo")
            self.require_string(repo.get("owner"), f"{w}.repo.owner", MAX_LABEL, "owner")
            self.require_string(repo.get("name"), f"{w}.repo.name", MAX_LABEL, "name")
            self.optional_string(repo, "host", f"{w}.repo.host", MAX_LABEL, "host")
        for side in ("base", "head"):
            commit = provenance.get(side)
            cw = f"{w}.{side}"
            if commit is None:
                self.error(cw, "is required")
                continue
            if not self.expect_object(commit, cw):
                continue
            self.check_keys(commit, {"sha", "ref"}, cw)
            sha = commit.get("sha")
            if not isinstance(sha, str) or not SHA_PATTERN.match(sha):
                self.error(f"{cw}.sha", f"must be lowercase hex, 7-40 characters, got {sha!r}")
            self.optional_string(commit, "ref", f"{cw}.ref", MAX_LABEL, "ref")
        base = provenance.get("base")
        head = provenance.get("head")
        if isinstance(base, dict) and isinstance(head, dict):
            base_sha = base.get("sha")
            head_sha = head.get("sha")
            if isinstance(base_sha, str) and base_sha == head_sha:
                self.error(w, "base and head are the same commit")
        pull_request = provenance.get("pullRequest")
        if pull_request is not None:
            pw = f"{w}.pullRequest"
            if self.expect_object(pull_request, pw):
                self.check_keys(pull_request, {"number", "title", "url"}, pw)
                self.check_int(pull_request.get("number"), f"{pw}.number", "number", 1)
                self.require_string(pull_request.get("title"), f"{pw}.title", MAX_LABEL, "title")
                self.require_string(pull_request.get("url"), f"{pw}.url", MAX_LABEL, "url")
        self.optional_string(provenance, "generator", f"{w}.generator", MAX_LABEL, "generator")

    def check_document(self, doc):
        if not self.expect_object(doc, "document"):
            return
        self.check_keys(doc, {"schemaVersion", "kind", "title", "summary", "lenses", "generatedAt", "provenance", "lanes", "nodes", "edges", "flows", "stats", "views", "layout"}, "document")
        if doc.get("schemaVersion") != SCHEMA_VERSION:
            self.error("document.schemaVersion", f"must be {SCHEMA_VERSION!r}, got {doc.get('schemaVersion')!r}")
        if doc.get("kind") != "graph":
            self.error("document.kind", f"must be 'graph', got {doc.get('kind')!r}")
        self.require_string(doc.get("title"), "document.title", MAX_LABEL, "title")
        self.require_string(doc.get("summary"), "document.summary", MAX_SUMMARY, "summary")
        lenses = doc.get("lenses")
        if not isinstance(lenses, list) or not lenses or len(set(lenses)) != len(lenses) or any(l not in LENSES for l in lenses):
            self.error("document.lenses", f"must be a non-empty list of distinct values from {', '.join(sorted(LENSES))}, got {lenses!r}")
        else:
            self.lenses = set(lenses)
        if "generatedAt" in doc:
            generated_at = doc["generatedAt"]
            try:
                datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
            except (TypeError, ValueError):
                self.error("document.generatedAt", f"{generated_at!r} is not an ISO-8601 timestamp")
        self.check_provenance(doc.get("provenance"))
        self.check_lanes(doc.get("lanes"))
        self.check_nodes(doc.get("nodes"))
        self.check_edges(doc.get("edges"))
        self.check_flows(doc.get("flows"))
        self.check_stats(doc.get("stats"))
        self.check_views(doc.get("views"))
        self.check_layout(doc.get("layout"))
        self.doc_flows = isinstance(doc.get("flows"), list) and len(doc["flows"]) > 0
        self.doc_nodes = doc.get("nodes") if isinstance(doc.get("nodes"), list) else []

    def finish(self):
        if self.hero_edges > 2:
            self.warn("document.edges", f"{self.hero_edges} hero edges; the reference says one hero edge, two at the outside")
        if self.node_deltas and all(delta == "added" for delta in self.node_deltas):
            self.warn("document.nodes", "every node is added — a change nobody can place; keep unchanged neighbours for blast radius")
        if "data-flow" in self.lenses and not self.doc_flows:
            self.warn("document.lenses", "declares the data-flow lens but carries no flows")
        for i, node in enumerate(self.doc_nodes):
            if isinstance(node, dict) and node.get("delta") == "removed":
                for j, entry in enumerate(node.get("files") or []):
                    if isinstance(entry, dict) and entry.get("revision", "head") != "base":
                        self.warn(f"document.nodes[{i}].files[{j}]", "a removed node's file refs should carry revision 'base'")


def main(argv):
    paths = [arg for arg in argv[1:] if not arg.startswith("-")]
    if not paths:
        print(USAGE, end="")
        return 2
    status = 0
    for path in paths:
        try:
            with open(path, encoding="utf-8") as handle:
                doc = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"FAIL  {path}: {exc}")
            status = 1
            continue
        checker = Checker(path)
        checker.check_document(doc)
        checker.finish()
        for message in checker.errors:
            print(f"  error  {message}")
        for message in checker.warnings:
            print(f"  warn   {message}")
        if checker.errors:
            print(f"FAIL  {path}: {len(checker.errors)} error(s), {len(checker.warnings)} warning(s)")
            status = 1
        else:
            nodes = f"{len(checker.node_ids)} nodes"
            edges = f"{len(checker.edge_ids)} edges"
            flows = f"{len(checker.flow_ids)} flow" if len(checker.flow_ids) == 1 else f"{len(checker.flow_ids)} flows"
            views = f"{len(checker.view_ids)} views"
            plural = "warning" if len(checker.warnings) == 1 else "warnings"
            print(f"OK    {path}: {nodes}, {edges}, {flows}, {views} — 0 errors, {len(checker.warnings)} {plural}")
    return status


if __name__ == "__main__":
    sys.exit(main(sys.argv))
