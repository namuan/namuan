#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = [
#   "playwright",
# ]
# ///
"""
Take full-page screenshots of web pages using Playwright.

Accepts one or more URL/filename pairs. Supports both https:// URLs and
file:/// paths for local static HTML.

Usage:
  ./screenshot.py docs/england-world-cups-all.html docs/england.png
  ./screenshot.py https://example.com output.png
  ./screenshot.py https://site.com/a.png a.png https://site.com/b.png b.png
  ./screenshot.py -v https://example.com out.png
"""

import logging
from argparse import ArgumentParser, RawDescriptionHelpFormatter
from pathlib import Path
from playwright.sync_api import sync_playwright


def setup_logging(verbosity):
    logging_level = logging.WARNING
    if verbosity == 1:
        logging_level = logging.INFO
    elif verbosity >= 2:
        logging_level = logging.DEBUG

    logging.basicConfig(
        handlers=[logging.StreamHandler()],
        format="%(asctime)s - %(message)s",
        datefmt="%H:%M:%S",
        level=logging_level,
    )
    logging.captureWarnings(capture=True)


def parse_args():
    parser = ArgumentParser(
        description=__doc__,
        formatter_class=RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "pairs", nargs="+", metavar="URL OUTPUT",
        help="Alternating URL and output filename pairs. URLs can be https:// or file:///",
    )
    parser.add_argument(
        "--width", type=int, default=1280,
        help="Viewport width in pixels (default: 1280)",
    )
    parser.add_argument(
        "--height", type=int, default=900,
        help="Viewport height in pixels (default: 900)",
    )
    parser.add_argument(
        "-v", "--verbose", action="count", default=0, dest="verbose",
        help="Increase verbosity (-v for INFO, -vv for DEBUG)",
    )
    return parser.parse_args()


def resolve_url(raw):
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw.startswith("file://"):
        return raw
    return Path(raw).resolve().as_uri()


def main(args):
    if len(args.pairs) % 2 != 0:
        raise SystemExit("Expected pairs of URL OUTPUT. Got odd number of arguments.")

    urls = []
    for i in range(0, len(args.pairs), 2):
        raw_url = args.pairs[i]
        output = args.pairs[i + 1]
        urls.append((resolve_url(raw_url), output))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for url, output in urls:
            logging.info("Capturing %s → %s", url, output)
            page = browser.new_page(viewport={"width": args.width, "height": args.height})
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.screenshot(path=output, full_page=True)
            logging.info("Saved %s", output)
        browser.close()


if __name__ == "__main__":
    args = parse_args()
    setup_logging(args.verbose)
    main(args)
