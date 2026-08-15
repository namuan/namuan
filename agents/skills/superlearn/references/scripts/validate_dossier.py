#!/usr/bin/env python3
"""Check the structural minimum for a Superlearn research dossier.

This checker cannot judge whether the research is true. It catches common
handover failures: an unfinished template, no citations, citations with no
bibliography entries, and bibliography entries without usable web links.

Usage:
    uv run validate_dossier.py .superlearn/<topic>/dossier.md
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

CITATION = re.compile(r"\[(\d+)\]")
SOURCE_ITEM = re.compile(r"^\s*(\d+)\.\s+.*?\((https?://[^)\s]+)\)", re.MULTILINE)
PLACEHOLDER = re.compile(r"<(?:[^>]+)>|\[<[^]]+>\]", re.MULTILINE)


def heading_names(markdown: str) -> set[str]:
    return {
        line.lstrip("#").strip().lower()
        for line in markdown.splitlines()
        if line.startswith("#")
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dossier", help="path to dossier.md")
    args = parser.parse_args()

    path = Path(args.dossier)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        print("ERROR: cannot read {}: {}".format(path, exc))
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    headings = heading_names(text)

    if not re.search(r"^#\s+\S", text, re.MULTILINE):
        errors.append("missing a top-level title")
    if "executive overview" not in headings:
        errors.append("missing 'Executive overview' section")
    if "sources and further reading" not in headings:
        errors.append("missing 'Sources and further reading' section")
    if "learning path" not in headings:
        warnings.append("missing 'Learning path' section")
    if "trade-offs, pitfalls, and limitations" not in headings:
        warnings.append("missing 'Trade-offs, pitfalls, and limitations' section")
    if PLACEHOLDER.search(text):
        errors.append("contains unfilled template placeholder text")

    cited = {int(n) for n in CITATION.findall(text)}
    sources = {int(n) for n, _ in SOURCE_ITEM.findall(text)}
    if not cited:
        errors.append("contains no numbered citations such as [1]")
    if not sources:
        errors.append("contains no numbered http(s) source entries")
    missing = sorted(cited - sources)
    if missing:
        errors.append("citation(s) {} have no matching source entry".format(
            ", ".join("[{}]".format(n) for n in missing)
        ))
    unused = sorted(sources - cited)
    if unused:
        warnings.append("source entries {} are never cited in the guide".format(
            ", ".join(str(n) for n in unused)
        ))

    if len(text.split()) < 500:
        warnings.append("dossier is under 500 words; confirm the requested scope was narrow")
    if "research trail" not in headings:
        warnings.append("missing 'Research trail' links to plan, evidence, and notes")

    for message in warnings:
        print("WARN  " + message)
    for message in errors:
        print("ERROR " + message)

    if errors:
        print("\n✗ {}: {} error(s), {} warning(s)".format(path, len(errors), len(warnings)))
        return 1
    print("✓ {}: structurally valid ({} citation(s), {} source(s), {} warning(s))".format(
        path, len(cited), len(sources), len(warnings)
    ))
    return 0


if __name__ == "__main__":
    sys.exit(main())
