#!/usr/bin/env python3
"""Superlearn arXiv scraper: papers with abstracts, authors, and PDF links.

Uses the official arXiv Atom API (no key needed). Stdlib only. Degrades to
empty results on failure so the pipeline never stalls. Built for `research`
mode — grounding boards in the actual literature.

Usage:
    uv run scrape_arxiv.py "attention is all you need" --limit 10 \
        --sort relevance --out papers.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

API = "https://export.arxiv.org/api/query"
NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}
SORTS = {"relevance", "lastUpdatedDate", "submittedDate"}
TIMEOUT = 20


def clean(s: str | None) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def search_arxiv(query: str, limit: int, sort: str) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max(1, limit),
            "sortBy": sort,
            "sortOrder": "descending",
        }
    )
    req = urllib.request.Request(
        f"{API}?{params}", headers={"User-Agent": "Superlearn/1.0 (learning tool)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            xml_text = res.read().decode("utf-8", errors="replace")
    except Exception as exc:
        print(f"[scrape_arxiv] query failed: {exc}", file=sys.stderr)
        return []

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        print(f"[scrape_arxiv] bad XML: {exc}", file=sys.stderr)
        return []

    papers = []
    for entry in root.findall("atom:entry", NS):
        abs_url = clean(entry.findtext("atom:id", default="", namespaces=NS))
        # arXiv id like 1706.03762v7 from http://arxiv.org/abs/1706.03762v7
        arxiv_id = abs_url.rsplit("/", 1)[-1] if abs_url else ""

        pdf = ""
        for link in entry.findall("atom:link", NS):
            if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                pdf = link.get("href", "")

        authors = [
            clean(a.findtext("atom:name", default="", namespaces=NS))
            for a in entry.findall("atom:author", NS)
        ]
        categories = [
            c.get("term", "") for c in entry.findall("atom:category", NS) if c.get("term")
        ]
        primary = entry.find("arxiv:primary_category", NS)
        if primary is not None and primary.get("term") and primary.get("term") not in categories:
            categories.insert(0, primary.get("term"))

        papers.append(
            {
                "id": arxiv_id,
                "title": clean(entry.findtext("atom:title", default="", namespaces=NS)),
                "summary": clean(entry.findtext("atom:summary", default="", namespaces=NS)),
                "authors": [a for a in authors if a],
                "published": clean(entry.findtext("atom:published", default="", namespaces=NS)),
                "updated": clean(entry.findtext("atom:updated", default="", namespaces=NS)),
                "categories": categories,
                "url": abs_url,
                "pdf": pdf,
            }
        )
    return papers


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("query", help="search query (matched against all fields)")
    ap.add_argument("--limit", type=int, default=10, help="max papers")
    ap.add_argument("--sort", default="relevance", choices=sorted(SORTS))
    ap.add_argument("--out", help="write JSON here (default: stdout)")
    args = ap.parse_args()

    papers = search_arxiv(args.query, args.limit, args.sort)
    payload = {"query": args.query, "papers": papers}
    output = json.dumps(payload, indent=2, ensure_ascii=False)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"[scrape_arxiv] {len(papers)} papers → {args.out}")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
