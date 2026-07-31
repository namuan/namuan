#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = [
#   "playwright>=1.45.0",
# ]
# ///
"""
agent_browser.py - Drive a real browser from the command line and capture
everything the DevTools protocol exposes.

Why: agents need to see what a browser sees. This tool launches a real
Chromium browser (via Playwright) and relays every DevTools event back to
the caller as JSON, so an AI agent can steer the page and observe the
results - network, console, logs, exceptions, websockets, dialogs,
downloads and performance metrics.

Three usage modes:

  1. One-shot capture (navigate, settle, dump everything):
       ./agent_browser.py -u https://example.com -o traffic.json
       ./agent_browser.py -u https://example.com --stream

  2. Interactive command mode (JSON commands in, JSON events out).
     Useful when an agent wants to drive the page step by step:
       ./agent_browser.py -i
       {"cmd": "navigate", "url": "https://example.com"}
       {"cmd": "snapshot"}
       {"cmd": "click", "selector": "#submit"}
       {"cmd": "close"}

  3. Watch / session mode (agent starts it, a human drives the browser,
     and everything is kept for the agent after the browser is closed):
       ./agent_browser.py --watch -u https://example.com --session demo
       # A visible browser opens for a human to drive. Every DevTools
       # event is captured live. When the browser window is closed the
       # session ends and the full record is stored for the agent.

Sessions
    --watch  records everything until the browser is closed (or
             --max-duration seconds elapse). Data is stored under
             <tmpdir>/agent_browser_sessions/<name>/ (override with
             --sessions-dir):
               session.json   manifest: status, timings, summary, errors
               events.ndjson  every event as it happened (live append)
               dump.json      full DevTools dump (network/console/logs/...)
    --list-sessions          print all recorded session manifests (JSON)
    --show-session <name>    print a session's full dump.json (JSON)
    Session data is relayed live to stdout as NDJSON while --watch runs.

Requirements
    uv (https://docs.astral.sh/uv/)
    Once:  uvx playwright install chromium

Output
    - One-shot mode without -o prints the full JSON dump to stdout.
    - One-shot mode with -o writes the dump to the file and prints a
      short summary to stderr.
    - --stream prints every DevTools event as NDJSON on stdout in real time.
    - Interactive mode (-i) prints NDJSON events and command results on
      stdout; steering commands are read as NDJSON from stdin.
    - Watch mode (--watch) relays every event as NDJSON on stdout in real
      time; the full record is also saved to the session directory.

Interactive command reference (one JSON object per line on stdin)
    {"cmd": "navigate", "url": "..."}     open a URL (alias: goto)
    {"cmd": "snapshot"}                  url, title, body text
    {"cmd": "status"}                    current url + title
    {"cmd": "click", "selector": "..."}  click an element
    {"cmd": "type", "selector": "...", "text": "..."}   fill an input
    {"cmd": "press", "key": "Enter"}     send a keyboard key
    {"cmd": "evaluate", "expression": "..."}            run JS, get result
    {"cmd": "extract", "selector": "...", "attribute": "..."}  read text/attr
    {"cmd": "content"}                   current page HTML (capped)
    {"cmd": "wait", "ms": 1000}          sleep
    {"cmd": "wait_for", "selector": "..."}   wait until visible
    {"cmd": "screenshot", "path": "...", "full_page": true}
    {"cmd": "scroll", "x": 0, "y": 500}
    {"cmd": "select", "selector": "...", "value": "..."}  (or label/index)
    {"cmd": "check", "selector": "...", "checked": true}
    {"cmd": "reload"} / {"cmd": "back"} / {"cmd": "forward"}
    {"cmd": "cookies"}                   all cookies for the context
    {"cmd": "close"}                     end the session
"""

import asyncio
import json
import logging
import re
import sys
import tempfile
import time
from argparse import ArgumentParser, RawDescriptionHelpFormatter
from datetime import datetime, timezone
from pathlib import Path


def setup_logging(verbosity):
    logging_level = logging.WARNING
    if verbosity == 1:
        logging_level = logging.INFO
    elif verbosity >= 2:
        logging_level = logging.DEBUG

    logging.basicConfig(
        handlers=[
            logging.StreamHandler(),
        ],
        format="%(asctime)s - %(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging_level,
    )
    logging.captureWarnings(capture=True)


def parse_args():
    parser = ArgumentParser(
        description=__doc__, formatter_class=RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "-u", "--url", help="URL to open. Scheme defaults to https:// when missing."
    )
    parser.add_argument(
        "-o",
        "--output",
        metavar="FILE",
        help="Write the full DevTools JSON dump to FILE.",
    )
    parser.add_argument(
        "-t",
        "--timeout",
        type=float,
        default=30.0,
        help="Navigation timeout in seconds (default 30).",
    )
    parser.add_argument(
        "--settle",
        type=float,
        default=3.0,
        help="Seconds to wait for late network/console events in one-shot mode "
        "(default 3).",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Show a visible browser window (default is headless).",
    )
    parser.add_argument(
        "-i",
        "--interactive",
        action="store_true",
        help="Read steering commands (NDJSON) from stdin and print captured "
        "events + command results (NDJSON) to stdout.",
    )
    parser.add_argument(
        "--stream",
        action="store_true",
        help="Print every DevTools event to stdout as NDJSON while running.",
    )
    parser.add_argument(
        "--capture-bodies",
        action="store_true",
        help="Capture response bodies through the CDP Network domain.",
    )
    parser.add_argument(
        "--max-body-bytes",
        type=int,
        default=262144,
        help="Truncate captured response bodies after this many bytes "
        "(default 262144).",
    )
    parser.add_argument(
        "--viewport", help="Browser viewport as WxH, e.g. 1280x800."
    )
    parser.add_argument(
        "--user-agent", help="Override the User-Agent header."
    )
    parser.add_argument(
        "--save-downloads",
        metavar="DIR",
        help="Save downloads to DIR instead of discarding them.",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Watch mode: open a visible browser and record all DevTools "
        "events until the user closes the browser (or --max-duration). "
        "The session is stored under <tmpdir>/agent_browser_sessions/<name>/.",
    )
    parser.add_argument(
        "--session",
        metavar="NAME",
        help="Session name. Creates <tmpdir>/agent_browser_sessions/NAME/ "
        "(override with --sessions-dir) and writes session.json, "
        "events.ndjson and dump.json there. Implied (with an "
        "auto-generated name) by --watch.",
    )
    parser.add_argument(
        "--list-sessions",
        action="store_true",
        help="List recorded sessions as JSON and exit without launching a "
        "browser.",
    )
    parser.add_argument(
        "--show-session",
        metavar="NAME",
        help="Print the full JSON dump of a recorded session and exit "
        "without launching a browser.",
    )
    parser.add_argument(
        "--max-duration",
        type=float,
        default=0.0,
        help="Watch mode: end the session after this many seconds "
        "(0 = wait until the browser is closed).",
    )
    parser.add_argument(
        "--sessions-dir",
        metavar="DIR",
        help="Where sessions are stored (default: <tmpdir>/agent_browser_sessions).",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        dest="verbose",
        help="Increase verbosity of logging output",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Session storage
# ---------------------------------------------------------------------------

# Sessions always live inside the OS temp directory by default so the script
# never writes into the caller's cwd or next to the script itself. Override
# with --sessions-dir DIR when you want sessions persisted elsewhere.
DEFAULT_SESSIONS_SUBDIR = "agent_browser_sessions"


def default_sessions_dir():
    """Return the default sessions root (inside the OS temp directory)."""
    return Path(tempfile.gettempdir()) / DEFAULT_SESSIONS_SUBDIR


def resolve_sessions_dir(args):
    return Path(args.sessions_dir) if args.sessions_dir else default_sessions_dir()


def sanitize_session_name(name):
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", str(name)).strip("._-")
    return cleaned or "session"


def new_session_id():
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def load_manifest(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_manifest(path, manifest):
    path.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")


def start_session(args):
    """Create the session directory and manifest. Raises if it exists."""
    base = resolve_sessions_dir(args)
    base.mkdir(parents=True, exist_ok=True)
    sid = sanitize_session_name(args.session) if args.session else new_session_id()
    sess_dir = base / sid
    manifest_path = sess_dir / "session.json"
    if manifest_path.exists():
        raise FileExistsError(
            f"Session {sid!r} already exists at {sess_dir}. "
            "Pick a different --session name (or delete the directory)."
        )
    sess_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "id": sid,
        "url": args.url,
        "mode": "watch" if args.watch else (
            "interactive" if args.interactive else "oneshot"
        ),
        "started": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "session_dir": str(sess_dir),
    }
    write_manifest(manifest_path, manifest)
    return sid, sess_dir, manifest_path, manifest


def finish_session(manifest_path, manifest, status, summary, dump_rel="dump.json", extra=None):
    manifest["status"] = status
    manifest["ended"] = datetime.now(timezone.utc).isoformat()
    manifest["summary"] = summary
    if dump_rel:
        manifest["dump"] = dump_rel
    if extra:
        manifest.update(extra)
    write_manifest(manifest_path, manifest)


def console_summary(events):
    """Quick diagnostics for the session manifest: console levels + errors."""
    by_level = {}
    errors = []
    for e in events:
        kind = e.get("event")
        if kind == "console":
            lvl = e.get("level", "log")
            by_level[lvl] = by_level.get(lvl, 0) + 1
            if lvl in ("error", "warning"):
                errors.append(
                    {
                        "level": lvl,
                        "text": e.get("text"),
                        "location": e.get("location"),
                    }
                )
        elif kind == "pageerror":
            errors.append({"level": "pageerror", "text": e.get("text")})
        elif kind == "log":
            lvl = e.get("level", "info")
            key = f"browser-log-{lvl}"
            by_level[key] = by_level.get(key, 0) + 1
    return {"console_levels": by_level, "errors": errors[-25:]}


def list_sessions(args):
    base = resolve_sessions_dir(args)
    sessions = []
    if base.is_dir():
        for child in sorted(base.iterdir()):
            if child.is_dir():
                manifest = load_manifest(child / "session.json")
                if manifest:
                    sessions.append(manifest)
    print(json.dumps(sessions, indent=2, default=str))
    return 0


def show_session(args):
    base = resolve_sessions_dir(args)
    sess_dir = base / sanitize_session_name(args.show_session)
    dump_path = sess_dir / "dump.json"
    if not dump_path.exists():
        print(
            f"error: no dump for session {args.show_session!r} (looked at {dump_path})",
            file=sys.stderr,
        )
        return 1
    print(dump_path.read_text(encoding="utf-8"))
    return 0


class DevToolsCapture:
    """Collects DevTools Protocol data and relays it as JSON events."""

    def __init__(
        self,
        page,
        context,
        cdp,
        capture_bodies=False,
        max_body_bytes=262144,
        download_dir=None,
        emit=None,
        ndjson_path=None,
        leave_dialogs=False,
    ):
        self.page = page
        self.context = context
        self.cdp = cdp
        self.capture_bodies = capture_bodies
        self.max_body_bytes = max_body_bytes
        self.download_dir = download_dir
        self.leave_dialogs = leave_dialogs
        self.events = []
        self.performance_metrics = []
        self._emit_fn = emit
        self._ndjson = (
            open(ndjson_path, "a", encoding="utf-8") if ndjson_path else None
        )

    # -- relay ------------------------------------------------------------

    def emit(self, entry):
        if self._emit_fn:
            self._emit_fn(entry)

    def record(self, entry):
        self.events.append(entry)
        self.emit(entry)
        if self._ndjson is not None:
            self._ndjson.write(json.dumps(entry, default=str) + "\n")
            self._ndjson.flush()

    def close(self):
        if self._ndjson is not None:
            try:
                self._ndjson.close()
            except Exception:
                pass
            self._ndjson = None

    # -- setup ------------------------------------------------------------

    async def setup(self):
        for domain in ("Network", "Runtime", "Log", "Performance"):
            try:
                await self.cdp.send(f"{domain}.enable")
            except Exception as exc:  # pragma: no cover - defensive
                logging.warning("Failed to enable CDP domain %s: %s", domain, exc)

        self.cdp.on("Network.requestWillBeSent", self._on_request_will_be_sent)
        self.cdp.on("Network.responseReceived", self._on_response_received)
        self.cdp.on("Network.loadingFailed", self._on_loading_failed)
        self.cdp.on("Network.requestWillBeSentExtraInfo", self._on_request_extra)
        self.cdp.on("Network.responseReceivedExtraInfo", self._on_response_extra)
        self.cdp.on("Network.webSocketCreated", self._on_ws_created)
        self.cdp.on("Network.webSocketFrameReceived", self._on_ws_frame_received)
        self.cdp.on("Network.webSocketFrameSent", self._on_ws_frame_sent)
        self.cdp.on("Network.webSocketClosed", self._on_ws_closed)
        self.cdp.on("Log.entryAdded", self._on_log_entry)
        self.cdp.on("Runtime.exceptionThrown", self._on_exception_thrown)
        self.cdp.on("Performance.metrics", self._on_performance_metrics)

        self.page.on("console", self._on_console)
        self.page.on("pageerror", self._on_pageerror)
        self.page.on("dialog", self._on_dialog)
        self.page.on("popup", self._on_popup)
        self.page.on("download", self._on_download)

    # -- network handlers ------------------------------------------------

    async def _on_request_will_be_sent(self, params):
        req = params.get("request", {})
        self.record(
            {
                "event": "network.request",
                "request_id": params.get("requestId"),
                "url": req.get("url"),
                "method": req.get("method"),
                "headers": req.get("headers"),
                "post_data": req.get("postData"),
                "has_post_data": req.get("hasPostData", False),
                "resource_type": params.get("type"),
                "initiator_type": params.get("initiator", {}).get("type"),
                "frame_id": params.get("frameId"),
                "timestamp": params.get("timestamp"),
            }
        )

    async def _on_response_received(self, params):
        resp = params.get("response", {})
        self.record(
            {
                "event": "network.response",
                "request_id": params.get("requestId"),
                "url": resp.get("url"),
                "status": resp.get("status"),
                "status_text": resp.get("statusText"),
                "headers": resp.get("headers"),
                "mime_type": resp.get("mimeType"),
                "encoded_data_length": resp.get("encodedDataLength"),
                "from_disk_cache": resp.get("fromDiskCache", False),
                "from_service_worker": resp.get("fromServiceWorker", False),
                "timing": resp.get("timing"),
                "security_protocol": (resp.get("securityDetails") or {}).get(
                    "protocol"
                ),
                "timestamp": params.get("timestamp"),
            }
        )
        if self.capture_bodies:
            asyncio.create_task(self._capture_body(params.get("requestId")))

    async def _capture_body(self, request_id):
        try:
            result = await self.cdp.send(
                "Network.getResponseBody", {"requestId": request_id}
            )
        except Exception as exc:
            self.record(
                {
                    "event": "network.body_error",
                    "request_id": request_id,
                    "error": str(exc),
                }
            )
            return
        body = result.get("body", "")
        truncated = False
        if len(body) > self.max_body_bytes:
            body = body[: self.max_body_bytes]
            truncated = True
        self.record(
            {
                "event": "network.body",
                "request_id": request_id,
                "body": body,
                "base64_encoded": result.get("base64Encoded", False),
                "truncated": truncated,
            }
        )

    async def _on_loading_failed(self, params):
        self.record(
            {
                "event": "network.failed",
                "request_id": params.get("requestId"),
                "error_text": params.get("errorText"),
                "canceled": params.get("canceled", False),
                "blocked_reason": params.get("blockedReason"),
                "timestamp": params.get("timestamp"),
            }
        )

    async def _on_request_extra(self, params):
        self.record(
            {
                "event": "network.request_extra",
                "request_id": params.get("requestId"),
                "headers": params.get("headers"),
                "cookies": params.get("cookies"),
                "client_security_state": params.get("clientSecurityState", {}),
            }
        )

    async def _on_response_extra(self, params):
        self.record(
            {
                "event": "network.response_extra",
                "request_id": params.get("requestId"),
                "status_code": params.get("statusCode"),
                "headers": params.get("headers"),
                "blocked_cookies": params.get("blockedCookies", []),
                "cookie_partition_key": params.get("cookiePartitionKey", []),
            }
        )

    # -- websocket handlers ----------------------------------------------

    async def _on_ws_created(self, params):
        self.record(
            {
                "event": "websocket.created",
                "url": params.get("url"),
                "request_id": params.get("requestId"),
            }
        )

    async def _on_ws_frame_received(self, params):
        resp = params.get("response", {})
        self.record(
            {
                "event": "websocket.frame",
                "direction": "received",
                "payload": resp.get("payloadData"),
                "opcode": resp.get("opcode"),
                "mask": resp.get("mask"),
            }
        )

    async def _on_ws_frame_sent(self, params):
        req = params.get("request", {})
        self.record(
            {
                "event": "websocket.frame",
                "direction": "sent",
                "payload": req.get("payloadData"),
                "opcode": req.get("opcode"),
                "mask": req.get("mask"),
            }
        )

    async def _on_ws_closed(self, params):
        self.record(
            {
                "event": "websocket.closed",
                "code": params.get("code"),
                "reason": params.get("reason"),
                "request_id": params.get("requestId"),
            }
        )

    # -- console / log / exception handlers ------------------------------

    async def _on_log_entry(self, params):
        entry = params.get("entry", {})
        self.record(
            {
                "event": "log",
                "level": entry.get("level"),
                "text": entry.get("text"),
                "source": entry.get("source"),
                "url": entry.get("url"),
                "line": entry.get("lineNumber"),
                "timestamp": entry.get("timestamp"),
            }
        )

    async def _on_console(self, msg):
        args = []
        for handle in msg.args:
            try:
                args.append(await handle.json_value())
            except Exception:
                args.append(str(handle))
        self.record(
            {
                "event": "console",
                "level": msg.type,
                "text": msg.text,
                "location": msg.location,
                "args": args,
            }
        )

    async def _on_pageerror(self, error):
        self.record(
            {
                "event": "pageerror",
                "text": str(error),
                "stack": getattr(error, "stack", None),
            }
        )

    async def _on_exception_thrown(self, params):
        details = params.get("exceptionDetails", {})
        self.record(
            {
                "event": "runtime.exception",
                "text": details.get("text"),
                "url": details.get("url"),
                "line": details.get("lineNumber"),
                "column": details.get("columnNumber"),
                "exception_value": (details.get("exception") or {}).get("value"),
                "exception_description": (details.get("exception") or {}).get(
                    "description"
                ),
            }
        )

    # -- page-level handlers ----------------------------------------------

    async def _on_performance_metrics(self, params):
        self.performance_metrics.append(params.get("metrics", []))

    async def _on_dialog(self, dialog):
        self.record(
            {
                "event": "dialog",
                "type": dialog.type,
                "message": dialog.message,
            }
        )
        if self.leave_dialogs:
            # Watch mode: a human is driving, so leave the dialog to them.
            return
        try:
            if dialog.type == "beforeunload":
                await dialog.accept()
            else:
                await dialog.dismiss()
        except Exception:  # pragma: no cover - dialog may already be gone
            pass

    async def _on_popup(self, popup):
        entry = {"event": "popup", "url": popup.url}
        try:
            await popup.wait_for_load_state("domcontentloaded", timeout=5000)
            entry["final_url"] = popup.url
        except Exception as exc:
            entry["error"] = str(exc)
        self.record(entry)

    async def _on_download(self, download):
        entry = {
            "event": "download",
            "url": download.url,
            "suggested_filename": download.suggested_filename,
        }
        if self.download_dir:
            try:
                path = str(
                    Path(self.download_dir) / download.suggested_filename
                )
                await download.save_as(path)
                entry["saved_to"] = path
            except Exception as exc:
                entry["error"] = str(exc)
        self.record(entry)

    # -- helpers ----------------------------------------------------------

    def summary(self):
        counts = {}
        for e in self.events:
            key = e.get("event", "unknown")
            counts[key] = counts.get(key, 0) + 1
        return counts


class BrowserDriver:
    """Executes agent commands against a real browser page."""

    def __init__(self, browser, context, page, capture):
        self.browser = browser
        self.context = context
        self.page = page
        self.capture = capture

    async def navigate(self, url, timeout_ms=30000):
        if not url.startswith(
            (
                "http://",
                "https://",
                "file://",
                "about:",
                "data:",
                "chrome://",
                "devtools://",
            )
        ):
            url = "https://" + url
        error = None
        status = None
        try:
            resp = await self.page.goto(url, wait_until="load", timeout=timeout_ms)
            status = resp.status if resp else None
        except Exception as exc:
            error = str(exc)
        return {
            "url": url,
            "final_url": self.page.url,
            "title": await self._safe_title(),
            "status": status,
            "error": error,
        }

    async def _safe_title(self):
        try:
            return await self.page.title()
        except Exception:
            return ""

    async def snapshot(self, max_chars=200000):
        try:
            body_text = await self.page.inner_text("body")
        except Exception:
            body_text = ""
        return {
            "url": self.page.url,
            "title": await self._safe_title(),
            "body_text": body_text[:max_chars],
            "body_text_length": len(body_text),
        }

    async def run_command(self, cmd):
        """Dispatch a command dict to its handler. Raises on errors."""
        name = cmd.get("cmd")
        handler = self._handlers().get(name)
        if handler is None:
            raise ValueError(f"unknown command: {name!r}")
        return await handler(cmd)

    def _handlers(self):
        return {
            "navigate": self._cmd_navigate,
            "goto": self._cmd_navigate,
            "snapshot": self._cmd_snapshot,
            "status": self._cmd_status,
            "click": self._cmd_click,
            "type": self._cmd_type,
            "press": self._cmd_press,
            "evaluate": self._cmd_evaluate,
            "extract": self._cmd_extract,
            "content": self._cmd_content,
            "wait": self._cmd_wait,
            "wait_for": self._cmd_wait_for,
            "screenshot": self._cmd_screenshot,
            "scroll": self._cmd_scroll,
            "select": self._cmd_select,
            "check": self._cmd_check,
            "reload": self._cmd_reload,
            "back": self._cmd_back,
            "forward": self._cmd_forward,
            "cookies": self._cmd_cookies,
            "close": self._cmd_close,
        }

    # -- command implementations -----------------------------------------

    async def _cmd_navigate(self, cmd):
        url = cmd.get("url")
        if not url:
            raise ValueError("navigate requires a 'url' field")
        timeout_ms = int(cmd.get("timeout", self._default_timeout) * 1000)
        return await self.navigate(url, timeout_ms)

    async def _cmd_snapshot(self, cmd):
        return await self.snapshot(int(cmd.get("max_chars", 200000)))

    async def _cmd_status(self, cmd):
        return {"url": self.page.url, "title": await self._safe_title()}

    async def _cmd_click(self, cmd):
        sel = cmd.get("selector")
        if not sel:
            raise ValueError("click requires a 'selector' field")
        await self.page.click(sel, timeout=int(cmd.get("timeout_ms", 5000)))
        return {"selector": sel, "url": self.page.url}

    async def _cmd_type(self, cmd):
        sel = cmd.get("selector")
        if not sel:
            raise ValueError("type requires a 'selector' field")
        text = cmd.get("text", "")
        await self.page.fill(sel, text)
        return {"selector": sel, "chars": len(text)}

    async def _cmd_press(self, cmd):
        key = cmd.get("key")
        if not key:
            raise ValueError("press requires a 'key' field")
        await self.page.keyboard.press(key)
        return {"key": key}

    async def _cmd_evaluate(self, cmd):
        expr = cmd.get("expression")
        if not expr:
            raise ValueError("evaluate requires an 'expression' field")
        try:
            result = await self.page.evaluate(expr)
        except Exception as exc:
            return {"expression": expr, "error": str(exc)}
        return {"expression": expr, "result": result}

    async def _cmd_extract(self, cmd):
        sel = cmd.get("selector")
        if not sel:
            raise ValueError("extract requires a 'selector' field")
        text = await self.page.inner_text(sel)
        attr = None
        if cmd.get("attribute"):
            attr = await self.page.get_attribute(sel, cmd["attribute"])
        return {"selector": sel, "text": text, "attribute": attr}

    async def _cmd_content(self, cmd):
        html = await self.page.content()
        limit = int(cmd.get("max_chars", 500000))
        return {
            "html": html[:limit],
            "length": len(html),
            "truncated": len(html) > limit,
        }

    async def _cmd_wait(self, cmd):
        ms = int(cmd.get("ms", 1000))
        await asyncio.sleep(ms / 1000.0)
        return {"waited_ms": ms}

    async def _cmd_wait_for(self, cmd):
        sel = cmd.get("selector")
        if not sel:
            raise ValueError("wait_for requires a 'selector' field")
        try:
            el = await self.page.wait_for_selector(
                sel, timeout=int(cmd.get("timeout_ms", 10000)), state="visible"
            )
            return {"selector": sel, "found": el is not None}
        except Exception as exc:
            return {"selector": sel, "found": False, "error": str(exc)}

    async def _cmd_screenshot(self, cmd):
        path = cmd.get("path") or f"screenshot_{int(time.time() * 1000)}.png"
        full = bool(cmd.get("full_page", False))
        await self.page.screenshot(path=path, full_page=full)
        return {"path": path, "full_page": full}

    async def _cmd_scroll(self, cmd):
        x = int(cmd.get("x", 0))
        y = int(cmd.get("y", 0))
        await self.page.evaluate(f"window.scrollBy({x}, {y})")
        return {"x": x, "y": y}

    async def _cmd_select(self, cmd):
        sel = cmd.get("selector")
        if not sel:
            raise ValueError("select requires a 'selector' field")
        if cmd.get("value") is not None:
            values = await self.page.select_option(sel, value=cmd["value"])
        elif cmd.get("label") is not None:
            values = await self.page.select_option(sel, label=cmd["label"])
        elif cmd.get("index") is not None:
            values = await self.page.select_option(sel, index=cmd["index"])
        else:
            raise ValueError("select requires 'value', 'label', or 'index'")
        return {"selector": sel, "selected_values": values}

    async def _cmd_check(self, cmd):
        sel = cmd.get("selector")
        if not sel:
            raise ValueError("check requires a 'selector' field")
        if bool(cmd.get("checked", True)):
            await self.page.check(sel)
        else:
            await self.page.uncheck(sel)
        return {"selector": sel, "checked": bool(cmd.get("checked", True))}

    async def _cmd_reload(self, cmd):
        await self.page.reload(wait_until="load")
        return {"url": self.page.url}

    async def _cmd_back(self, cmd):
        await self.page.go_back(wait_until="load")
        return {"url": self.page.url}

    async def _cmd_forward(self, cmd):
        await self.page.go_forward(wait_until="load")
        return {"url": self.page.url}

    async def _cmd_cookies(self, cmd):
        return {"cookies": await self.context.cookies()}

    async def _cmd_close(self, cmd):
        return {"message": "closing"}


def make_emitter(args):
    relay_live = args.interactive or args.stream or args.watch

    def emit(entry):
        if relay_live:
            print(json.dumps(entry, default=str), flush=True)

    return emit


async def run_interactive(driver, capture, args):
    """Read NDJSON commands from stdin and emit NDJSON results to stdout."""
    seq = 0
    logging.info("Interactive mode: reading JSON commands from stdin")
    while True:
        try:
            line = await asyncio.to_thread(sys.stdin.readline)
        except Exception as exc:
            capture.emit(
                {"event": "result", "ok": False, "error": f"stdin read failed: {exc}"}
            )
            break
        if not line:
            break  # EOF
        line = line.strip()
        if not line:
            continue
        seq += 1
        try:
            cmd = json.loads(line)
        except json.JSONDecodeError as exc:
            capture.emit(
                {
                    "event": "result",
                    "id": seq,
                    "ok": False,
                    "error": f"invalid JSON: {exc}",
                    "raw": line,
                }
            )
            continue
        if not isinstance(cmd, dict) or "cmd" not in cmd:
            capture.emit(
                {
                    "event": "result",
                    "id": seq,
                    "ok": False,
                    "error": "expected an object with a 'cmd' field",
                }
            )
            continue
        name = cmd["cmd"]
        if name == "close":
            capture.emit(
                {
                    "event": "result",
                    "id": seq,
                    "cmd": name,
                    "ok": True,
                    "data": {"message": "closing"},
                }
            )
            capture.emit({"event": "done", "ok": True, "summary": capture.summary()})
            return
        try:
            data = await driver.run_command(cmd)
            capture.emit(
                {"event": "result", "id": seq, "cmd": name, "ok": True, "data": data}
            )
        except Exception as exc:
            capture.emit(
                {
                    "event": "result",
                    "id": seq,
                    "cmd": name,
                    "ok": False,
                    "error": str(exc),
                }
            )
    capture.emit({"event": "done", "ok": True, "summary": capture.summary()})


async def watch_until_closed(browser, context, args):
    """Wait until the user closes the browser (or --max-duration elapses).

    Returns a status string: 'closed' or 'timeout'.
    """
    browser_closed = asyncio.Event()
    try:
        browser.on("disconnected", lambda _b: browser_closed.set())
    except Exception as exc:  # pragma: no cover - defensive
        logging.warning("Could not attach browser-disconnected handler: %s", exc)

    start = time.monotonic()
    last_pages = len(context.pages)
    while True:
        if browser_closed.is_set() or not browser.is_connected():
            return "closed"
        try:
            pages = context.pages
        except Exception:
            return "closed"
        if not pages and last_pages > 0:
            # User closed the last window/tab. Give the process a moment to
            # exit, then treat the session as ended either way.
            await asyncio.sleep(1.0)
            return "closed"
        last_pages = len(pages)
        if args.max_duration and (time.monotonic() - start) >= args.max_duration:
            return "timeout"
        await asyncio.sleep(0.5)


async def build_dump(driver, capture, args, started):
    final = {"url": driver.page.url, "title": await driver._safe_title()}
    try:
        final["html"] = (await driver.page.content())[:200000]
    except Exception as exc:
        final["html_error"] = str(exc)
    metrics = []
    try:
        got = await capture.cdp.send("Performance.getMetrics")
        metrics = got.get("metrics", [])
    except Exception as exc:
        logging.debug("Performance.getMetrics failed: %s", exc)
    mode = "watch" if args.watch else ("interactive" if args.interactive else "oneshot")
    meta = {
        "command": " ".join(sys.argv),
        "started": started.isoformat(),
        "finished": datetime.now(timezone.utc).isoformat(),
        "browser": "chromium (playwright)",
        "mode": mode,
    }
    if getattr(args, "_session_id", None):
        meta["session"] = args._session_id
    return {
        "meta": meta,
        "summary": capture.summary(),
        "events": capture.events,
        "performance": {
            "get_metrics": metrics,
            "metrics_events": capture.performance_metrics,
        },
        "final": final,
    }


def write_dump(dump, args):
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(dump, indent=2, default=str))
        n = len(dump["events"])
        print(
            f"Dump written to {out_path} ({n} captured events)", file=sys.stderr
        )
    else:
        print(json.dumps(dump, indent=2, default=str))


async def amain(args):
    started = datetime.now(timezone.utc)
    playwright = None
    browser = None
    capture = None
    session = None
    try:
        if args.watch:
            args.headed = True  # a human needs to see and drive the browser

        if args.watch or args.session:
            try:
                session = start_session(args)
            except FileExistsError as exc:
                print(f"error: {exc}", file=sys.stderr)
                return 2
            args._session_id = session[0]
            print(
                f"[session] {session[0]} -> {session[1]}",
                file=sys.stderr,
            )
            logging.info("Session %s started -> %s", session[0], session[1])

        from playwright.async_api import async_playwright

        playwright = await async_playwright().start()
        try:
            browser = await playwright.chromium.launch(headless=not args.headed)
        except Exception as exc:
            logging.error("Failed to launch Chromium: %s", exc)
            logging.error("Install the browser once with:  uvx playwright install chromium")
            if session:
                finish_session(
                    session[2], session[3], "error", summary={}, extra={"error": str(exc)}
                )
            return 2

        ctx_kwargs = {"accept_downloads": True}
        if args.viewport:
            w, _, h = args.viewport.partition("x")
            try:
                ctx_kwargs["viewport"] = {"width": int(w), "height": int(h)}
            except ValueError:
                logging.warning("Bad --viewport %r; ignoring", args.viewport)
        if args.user_agent:
            ctx_kwargs["user_agent"] = args.user_agent

        context = await browser.new_context(**ctx_kwargs)
        page = await context.new_page()
        cdp = await context.new_cdp_session(page)

        ndjson_path = None
        if session:
            ndjson_path = str(session[1] / "events.ndjson")

        capture = DevToolsCapture(
            page=page,
            context=context,
            cdp=cdp,
            capture_bodies=args.capture_bodies,
            max_body_bytes=args.max_body_bytes,
            download_dir=args.save_downloads,
            emit=make_emitter(args),
            ndjson_path=ndjson_path,
            leave_dialogs=args.watch,
        )
        driver = BrowserDriver(browser, context, page, capture)
        driver._default_timeout = args.timeout

        await capture.setup()

        if session:
            capture.record(
                {
                    "event": "session.started",
                    "session": session[0],
                    "url": args.url,
                    "mode": "watch" if args.watch else (
                        "interactive" if args.interactive else "oneshot"
                    ),
                    "note": "browser opened; drive it or wait for it to close",
                }
            )

        if args.url:
            await driver.navigate(args.url, args.timeout * 1000)

        if args.watch:
            print(
                f"[watch] session {session[0]} open - drive the browser, "
                "close the window when done",
                file=sys.stderr,
            )
            status = await watch_until_closed(browser, context, args)
            await asyncio.sleep(0.5)  # let late events flush
            dump = await build_dump(driver, capture, args, started)
            if args.output:
                write_dump(dump, args)
            if session:
                dump_path = session[1] / "dump.json"
                dump_path.write_text(json.dumps(dump, indent=2, default=str))
                finish_session(
                    session[2],
                    session[3],
                    status,
                    summary=dump["summary"],
                    extra={
                        "duration_s": round(
                            (datetime.now(timezone.utc) - started).total_seconds(), 2
                        ),
                        "console": console_summary(dump["events"]),
                    },
                )
            capture.record(
                {
                    "event": "session.ended",
                    "session": session[0],
                    "status": status,
                    "summary": dump["summary"],
                }
            )
            print(
                f"[watch] session {session[0]} ended ({status}). "
                f"Dump: {session[1] / 'dump.json'}",
                file=sys.stderr,
            )
        elif args.interactive:
            await run_interactive(driver, capture, args)
            if args.output or session:
                dump = await build_dump(driver, capture, args, started)
                if args.output:
                    write_dump(dump, args)
                if session:
                    dump_path = session[1] / "dump.json"
                    dump_path.write_text(json.dumps(dump, indent=2, default=str))
                    finish_session(
                        session[2],
                        session[3],
                        "closed",
                        summary=dump["summary"],
                        extra={"console": console_summary(dump["events"])},
                    )
        else:
            logging.info("Settling for %.1fs to collect late events...", args.settle)
            await asyncio.sleep(args.settle)
            dump = await build_dump(driver, capture, args, started)
            write_dump(dump, args)
            if session:
                dump_path = session[1] / "dump.json"
                dump_path.write_text(json.dumps(dump, indent=2, default=str))
                finish_session(
                    session[2],
                    session[3],
                    "closed",
                    summary=dump["summary"],
                    extra={"console": console_summary(dump["events"])},
                )

    finally:
        if capture is not None:
            capture.close()
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        if playwright:
            try:
                await playwright.stop()
            except Exception:
                pass
    return 0


def main(args):
    logging.debug(f"args: {args}")
    if args.list_sessions:
        raise SystemExit(list_sessions(args))
    if args.show_session:
        raise SystemExit(show_session(args))
    if args.watch and args.interactive:
        print("error: --watch and --interactive cannot be combined", file=sys.stderr)
        raise SystemExit(2)
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    try:
        code = asyncio.run(amain(args))
    except KeyboardInterrupt:
        logging.warning("Interrupted")
        code = 130
    raise SystemExit(code)


if __name__ == "__main__":
    args = parse_args()
    setup_logging(args.verbose)
    main(args)
