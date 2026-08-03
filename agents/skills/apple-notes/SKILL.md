---
name: apple-notes
description: Use this skill when the task involves writing notes into the "Wiki" folder of Apple Notes on macOS or appending to existing Wiki notes. Creates a note in Wiki (auto-appending if a note with the same title already exists), and appends content to an existing Wiki note by ID. All commands are hard-pinned to the Wiki folder — no other folder can be listed, read, or written.
---

# Apple Notes Skill (v0.5.0 — Wiki-only)

Use this skill to write and append to Apple Notes on macOS using the wrapper script `./notes.sh`.

## Enforced Scope: Wiki only

This skill is hard-pinned to the **`Wiki` folder**. Two layers of enforcement make non-Wiki access impossible:

1. **No folder argument exists.** Every command operates on `Wiki` by construction; there is nothing a caller can pass to name another folder.
2. **Runtime verification.** By-ID reads/appends verify the note's actual container is `Wiki`; notes in other folders are treated identically to missing notes (exit 3, no information leaked). `search-notes`, `list-notes`, `list-folders`, and `count-all` only ever see Wiki content.

Move, delete, rename, and every other command not listed below are rejected with exit code **2** by a hard whitelist in the script, before osascript is invoked.

## Absolute Rules

1. **Only use Wrapper**: Always invoke `./notes.sh`. Never write or execute custom raw AppleScript blocks.
2. **Create = write or append-in-place in Wiki**: `create-note-text` / `create-note-html` create a new note in `Wiki`. If a note with the same title already exists in Wiki, the content is appended to it instead — duplicate titles are never created.
3. **Append by ID, Wiki notes only**: Use `append-note-text` / `append-note-html` with a note ID from `search-notes` / `list-notes` / `read-note-id`. IDs pointing at notes outside Wiki fail with "not found".
4. **No Destructive or Non-Wiki Commands**: `move-*`, `delete-*`, `create-folder`, `read-note-title`, `get-date-*`, and any command with a folder argument do not exist. Do not attempt them — the script rejects them (exit 2).
5. **Format Safety**: Use `*-text` commands for plain text, and `*-html` commands only for trusted HTML bodies.
6. **Concurrency Protection**: Guard append/write operations with `--if-modified-at <ISO-8601>` when you have a previously-read modification timestamp. Handle exit code 7 (Conflict) by re-reading and merging.
7. **No Silence**: Never suppress command errors; report the exact stdout/stderr when a command fails.

---

## Command Syntax & Argument Boundary (`--`)

To prevent note titles or bodies from being incorrectly parsed as flags if they happen to start with dashes, always use the double-dash `--` separator:
```bash
./notes.sh [options] <command> -- [arguments...]
```

---

## Action Matrix (all in Wiki)

| Intent | Command | Arguments | Pre-conditions / Notes |
| :--- | :--- | :--- | :--- |
| **Write note** | `create-note-text` | `<title> <plain_text>` | Appends if title exists in Wiki. |
| **Write note (HTML)** | `create-note-html` | `<title> <body_html>` | Appends if title exists in Wiki. |
| **Append text** | `append-note-text` | `<note_id> <plain_text>` | Note must be in Wiki. Supports `--if-modified-at`. |
| **Append HTML** | `append-note-html` | `<note_id> <body_html>` | Note must be in Wiki. Supports `--if-modified-at`. |
| **Search Wiki Notes** | `search-notes` | `<query>` | Title match (case-insensitive) within Wiki only. |
| **Read note by ID** | `read-note-id` | `<note_id>` | Wiki notes only; returns metadata + body. |
| **List Folders** | `list-folders` | None | Always returns `["Wiki"]`. |
| **List Wiki Notes** | `list-notes` | None | Lists all Wiki notes. |
| **Count Wiki Notes** | `count-all` | None | Counts Wiki notes only. |

*Add `--json` globally to receive clean, parseable JSON envelopes: `{"ok": true, "data": ...}`.*

---

## Enforcement Summary

- **Hard whitelist** in `notes.sh`: any command outside the Action Matrix exits with code **2** before AppleScript runs.
- **No folder argument** on any command: `Wiki` is hardcoded — other folders cannot be named.
- **By-ID checks**: `read-note-id` / `append-note-*` verify the note lives in Wiki and report non-Wiki notes as "not found" (code 3), leaking nothing about other folders.

---

## Exit Status Matrix

- **`0`**: Success
- **`2`**: Parameter/Syntax error, or command rejected by the whitelist
- **`3`**: Resource Not Found (Wiki note ID not found, or note not in Wiki)
- **`4`**: Ambiguity (multiple folders named `Wiki` exist)
- **`6`**: Native AppleScript/JXA execution failure
- **`7`**: Concurrency Conflict (note modified since your read when `--if-modified-at` was set)

---

## Usage Examples

### 1. Write a new note into Wiki (appends if the title already exists)
```bash
./notes.sh --json create-note-text "Daily Log 2026-08-03" -- "First entry."
# {"ok":true,"data":{"action":"created","id":"x-coredata://...","title":"Daily Log 2026-08-03","folder":"Wiki","modified_at":"..."}}
```

### 2. Write again to the same title → appends, no duplicate
```bash
./notes.sh --json create-note-text "Daily Log 2026-08-03" -- "Second entry."
# {"ok":true,"data":{"action":"appended_to_existing","id":"x-coredata://...","title":"Daily Log 2026-08-03","folder":"Wiki","modified_at":"..."}}
```

### 3. Find a Wiki note ID and append with concurrency guard
```bash
./notes.sh --json search-notes "Daily Log"
./notes.sh --json read-note-id "x-coredata://..."
# Last modified: "2026-08-03T16:30:00.000Z"
./notes.sh --json --if-modified-at "2026-08-03T16:30:00.000Z" append-note-text "x-coredata://..." -- "Appended line"
```

### 4. Folder access is impossible
```bash
./notes.sh list-folders
# ["Wiki"]  — only Wiki is ever visible

./notes.sh delete-note-id "x-coredata://..."
# stderr: Error: Command 'delete-note-id' is not allowed. ...  (exit code 2)
```

For complete CLI helper details, run `./notes.sh --help`.
