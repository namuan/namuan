#!/bin/bash
# Apple Notes CLI Wrapper for AI Agents (v0.5.0 — Wiki-only)
# ENFORCED SCOPE: every command operates exclusively on the "Wiki" folder.
# There is no folder argument anywhere; "Wiki" is hardcoded, so no other
# folder can be named, listed, read, or written from this script.
# Uses only built-in osascript JXA.

set -euo pipefail

# Global variables
JSON_MODE=0
IF_MODIFIED_AT=""
ARGS=()

# ------------------------------------------------------------------
# Hard whitelist — ENFORCEMENT
# Only the commands below exist. Anything else is rejected *before*
# osascript is ever invoked, so no move/delete/unsupported path is
# reachable from this script.
# ------------------------------------------------------------------
ALLOWED_COMMANDS="create-note-text create-note-html append-note-text append-note-html search-notes read-note-id list-folders list-notes count-all"

show_help() {
    echo "Apple Notes Skill CLI (v0.5.0 — Wiki-only)"
    echo "Usage: $0 [options] <command> [args...]"
    echo ""
    echo "SCOPE ENFORCEMENT: All commands are pinned to the 'Wiki' folder."
    echo "No folder argument exists and no other folder is ever accessed."
    echo ""
    echo "Options:"
    echo "  --json                       Output machine-readable JSON"
    echo "  --if-modified-at <timestamp> Guard append with optimistic concurrency check"
    echo "  --                           Stop parsing options (useful if inputs start with dashes)"
    echo ""
    echo "Write Commands (always in Wiki):"
    echo "  create-note-text <title> <plain_text>"
    echo "    Creates a note in Wiki. If a note with the same title already"
    echo "    exists in Wiki, appends instead — no duplicates."
    echo "  create-note-html <title> <body_html>"
    echo "    Same as create-note-text, but body is trusted HTML."
    echo ""
    echo "Append Commands (note must be in Wiki):"
    echo "  append-note-text <note_id> <plain_text>"
    echo "  append-note-html <note_id> <body_html>"
    echo ""
    echo "Read-only Helper Commands (Wiki-only):"
    echo "  search-notes <query>"
    echo "  read-note-id <note_id>"
    echo "  list-folders              (always returns [\"Wiki\"])"
    echo "  list-notes                (lists Wiki notes)"
    echo "  count-all                 (counts Wiki notes)"
    echo ""
    echo "Enforced: non-Wiki access is impossible; any other command is rejected (exit 2)."
    exit 0
}

# Parse global flags and handle -- separator
while [ "$#" -gt 0 ]; do
    case "$1" in
        -h|--help)
            show_help
            ;;
        --json)
            JSON_MODE=1
            shift
            ;;
        --if-modified-at)
            if [ "$#" -lt 2 ]; then
                echo "Error: --if-modified-at requires a timestamp value" >&2
                exit 2
            fi
            IF_MODIFIED_AT="$2"
            shift 2
            ;;
        --)
            shift
            while [ "$#" -gt 0 ]; do
                ARGS+=("$1")
                shift
            done
            break
            ;;
        -*)
            echo "Error: Unknown option $1" >&2
            exit 2
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

if [ ${#ARGS[@]} -eq 0 ]; then
    show_help
fi

# ------------------------------------------------------------------
# Whitelist gate — reject anything not in ALLOWED_COMMANDS
# ------------------------------------------------------------------
CMD="${ARGS[0]}"
case " $ALLOWED_COMMANDS " in
    *" $CMD "*)
        ;;
    *)
        echo "Error: Command '$CMD' is not allowed." >&2
        echo "Only write-note, append-note, and read-only helpers are supported:" >&2
        echo "  $ALLOWED_COMMANDS" >&2
        exit 2
        ;;
esac

# Function containing the JXA heredoc to prevent shell quoting bugs inside command substitutions
run_jxa() {
    env JSON_MODE="$JSON_MODE" IF_MODIFIED_AT="$IF_MODIFIED_AT" osascript -l JavaScript - "${ARGS[@]}" <<'EOF'
ObjC.import('stdlib');

const jsonMode = $.getenv('JSON_MODE') === '1';
const expectedModifiedAt = $.getenv('IF_MODIFIED_AT') || "";

// ── Wiki-only enforcement ─────────────────────────────────────────
// The only folder this skill may ever touch.
const WIKI_FOLDER = "Wiki";

const Notes = Application('Notes');
Notes.includeStandardAdditions = true;

function escapeHTML(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

function successPayload(data) {
    if (jsonMode) {
        return "JSON_SUCCESS:" + JSON.stringify({ ok: true, data: data });
    } else {
        return "TEXT_SUCCESS:" + (typeof data === 'string' ? data : JSON.stringify(data));
    }
}

function errorPayload(code, message, details) {
    if (jsonMode) {
        return "JSON_ERROR:" + code + ":" + JSON.stringify({
            ok: false,
            error: {
                code: code,
                message: message,
                details: details || null
            }
        });
    } else {
        return "TEXT_ERROR:" + code + ":" + message + (details ? "\nDETAILS: " + JSON.stringify(details) : "");
    }
}

// Returns the single Wiki folder, creating it only if it is missing.
// Throws code 4 if the name is somehow ambiguous.
function getWikiFolder() {
    const folders = Notes.folders.whose({ name: WIKI_FOLDER });
    if (folders.length > 1) {
        throw { code: 4, message: "Multiple folders named '" + WIKI_FOLDER + "' exist. Operation aborted." };
    }
    if (folders.length === 0) {
        const folder = Notes.Folder({ name: WIKI_FOLDER });
        Notes.folders.push(folder);
        return folder;
    }
    return folders[0];
}

// Returns the note with `title` in Wiki, or null if none exists.
function findNoteInWiki(title) {
    const folders = Notes.folders.whose({ name: WIKI_FOLDER });
    if (folders.length === 0) return null;
    if (folders.length > 1) {
        throw { code: 4, message: "Multiple folders named '" + WIKI_FOLDER + "' exist. Operation aborted." };
    }
    const notes = folders[0].notes();
    for (let n = 0; n < notes.length; n++) {
        if (notes[n].name() === title) return notes[n];
    }
    return null;
}

// Resolves a note by ID and verifies it lives in Wiki.
// Non-Wiki notes are reported identically to missing notes (code 3),
// so nothing about other folders leaks.
function resolveWikiNoteById(noteId) {
    let note;
    try {
        note = Notes.notes.byId(noteId);
        note.name();
    } catch (e) {
        throw { code: 3, message: "Note with ID '" + noteId + "' not found" };
    }
    const containerName = note.container().name();
    if (containerName !== WIKI_FOLDER) {
        throw { code: 3, message: "Note with ID '" + noteId + "' not found" };
    }
    return note;
}

function noteMeta(note) {
    return {
        id: note.id(),
        title: note.name(),
        folder: WIKI_FOLDER,
        modified_at: note.modificationDate().toISOString()
    };
}

function checkConcurrency(note) {
    const lastModified = note.modificationDate().toISOString();
    if (expectedModifiedAt && lastModified !== expectedModifiedAt) {
        throw {
            code: 7,
            message: "Optimistic concurrency check failed. Note was modified since read.",
            data: { current_modified_at: lastModified, expected_modified_at: expectedModifiedAt }
        };
    }
}

// Strict argument count — extra/unknown args are rejected, never silently ignored.
function expectArgs(argv, n) {
    const got = argv.length - 1;
    if (got !== n) {
        throw { code: 2, message: "Wrong number of arguments: expected " + n + ", got " + got };
    }
}

function run(argv) {
    try {
        const cmd = argv[0];

        // ----- Write: create in Wiki (or append-in-place if title exists) -----
        if (cmd === "create-note-text") {
            expectArgs(argv, 2);
            const title = argv[1];
            const plainText = argv[2];
            if (!title || plainText === undefined) throw { code: 2, message: "Usage: create-note-text <title> <plain_text>" };

            const folder = getWikiFolder();
            const bodyHTML = "<div>" + escapeHTML(plainText).replace(/\n/g, "<br></div><div>") + "</div>";
            const existing = findNoteInWiki(title);

            if (existing) {
                checkConcurrency(existing);
                existing.body = existing.body() + bodyHTML;
                const meta = noteMeta(existing);
                return successPayload({ action: "appended_to_existing", ...meta });
            }

            const note = Notes.Note({ name: title, body: bodyHTML });
            folder.notes.push(note);
            const meta = noteMeta(note);
            return successPayload({ action: "created", ...meta });
        }
        else if (cmd === "create-note-html") {
            expectArgs(argv, 2);
            const title = argv[1];
            const htmlContent = argv[2];
            if (!title || htmlContent === undefined) throw { code: 2, message: "Usage: create-note-html <title> <body_html>" };

            const folder = getWikiFolder();
            const existing = findNoteInWiki(title);

            if (existing) {
                checkConcurrency(existing);
                existing.body = existing.body() + htmlContent;
                const meta = noteMeta(existing);
                return successPayload({ action: "appended_to_existing", ...meta });
            }

            const note = Notes.Note({ name: title, body: htmlContent });
            folder.notes.push(note);
            const meta = noteMeta(note);
            return successPayload({ action: "created", ...meta });
        }

        // ----- Append by note ID (must be a Wiki note) -----
        else if (cmd === "append-note-text") {
            expectArgs(argv, 2);
            const noteId = argv[1];
            const plainText = argv[2];
            if (!noteId || plainText === undefined) throw { code: 2, message: "Usage: append-note-text <note_id> <plain_text>" };

            const note = resolveWikiNoteById(noteId);
            checkConcurrency(note);

            const escapedText = "<div>" + escapeHTML(plainText).replace(/\n/g, "<br></div><div>") + "</div>";
            note.body = note.body() + escapedText;
            return successPayload({ success: true, id: noteId, modified_at: note.modificationDate().toISOString() });
        }
        else if (cmd === "append-note-html") {
            expectArgs(argv, 2);
            const noteId = argv[1];
            const htmlContent = argv[2];
            if (!noteId || htmlContent === undefined) throw { code: 2, message: "Usage: append-note-html <note_id> <body_html>" };

            const note = resolveWikiNoteById(noteId);
            checkConcurrency(note);

            note.body = note.body() + htmlContent;
            return successPayload({ success: true, id: noteId, modified_at: note.modificationDate().toISOString() });
        }

        // ----- Read-only helpers (Wiki-only) -----
        else if (cmd === "search-notes") {
            expectArgs(argv, 1);
            const queryText = argv[1];
            if (!queryText) throw { code: 2, message: "Usage: search-notes <query>" };

            const folders = Notes.folders.whose({ name: WIKI_FOLDER });
            const result = [];
            if (folders.length > 0) {
                const notes = folders[0].notes();
                for (let n = 0; n < notes.length; n++) {
                    const title = notes[n].name();
                    if (title.toLowerCase().includes(queryText.toLowerCase())) {
                        result.push({
                            id: notes[n].id(),
                            title: title,
                            folder: WIKI_FOLDER,
                            modified_at: notes[n].modificationDate().toISOString()
                        });
                    }
                }
            }
            return successPayload(result);
        }
        else if (cmd === "read-note-id") {
            expectArgs(argv, 1);
            const noteId = argv[1];
            if (!noteId) throw { code: 2, message: "Usage: read-note-id <note_id>" };

            const note = resolveWikiNoteById(noteId);
            return successPayload({
                ...noteMeta(note),
                body: note.body()
            });
        }
        else if (cmd === "list-folders") {
            expectArgs(argv, 0);
            // Only the Wiki folder is ever visible.
            return successPayload([WIKI_FOLDER]);
        }
        else if (cmd === "list-notes") {
            expectArgs(argv, 0);
            const folders = Notes.folders.whose({ name: WIKI_FOLDER });
            const result = [];
            if (folders.length === 0) {
                return successPayload(result);
            }
            if (folders.length > 1) {
                throw { code: 4, message: "Multiple folders named '" + WIKI_FOLDER + "' exist. Operation aborted." };
            }
            const notes = folders[0].notes();
            for (let n = 0; n < notes.length; n++) {
                result.push({
                    id: notes[n].id(),
                    title: notes[n].name(),
                    folder: WIKI_FOLDER,
                    modified_at: notes[n].modificationDate().toISOString()
                });
            }
            return successPayload(result);
        }
        else if (cmd === "count-all") {
            expectArgs(argv, 0);
            const folders = Notes.folders.whose({ name: WIKI_FOLDER });
            const count = folders.length > 0 ? folders[0].notes.length : 0;
            return successPayload(jsonMode ? { folder: WIKI_FOLDER, count: count } : String(count));
        }
        else {
            // Unreachable thanks to the bash whitelist gate, but kept as a safety net.
            throw { code: 2, message: "Command not allowed: " + cmd };
        }

    } catch (e) {
        return errorPayload(e.code || 6, e.message || String(e), e.data);
    }
}
EOF
}

# Run JXA in the background-safe function to prevent shell parsing bugs
OUTPUT=$(run_jxa)

# Parse JXA output and handle standard exit codes
FIRST_LINE=$(echo "$OUTPUT" | head -n 1)
TYPE=$(echo "$FIRST_LINE" | cut -d':' -f1)

if [ "$TYPE" = "JSON_SUCCESS" ]; then
    # Output standard JSON to stdout
    echo "$OUTPUT" | sed 's/^JSON_SUCCESS://'
    exit 0
elif [ "$TYPE" = "JSON_ERROR" ]; then
    CODE=$(echo "$FIRST_LINE" | cut -d':' -f2)
    # Output standard JSON error payload to stderr
    echo "$OUTPUT" | sed "s/^JSON_ERROR:$CODE://" >&2
    exit "$CODE"
elif [ "$TYPE" = "TEXT_SUCCESS" ]; then
    # Output raw text to stdout
    echo "$OUTPUT" | sed 's/^TEXT_SUCCESS://'
    exit 0
elif [ "$TYPE" = "TEXT_ERROR" ]; then
    CODE=$(echo "$FIRST_LINE" | cut -d':' -f2)
    # Output error details to stderr
    echo "$OUTPUT" | sed "s/^TEXT_ERROR:$CODE://" >&2
    exit "$CODE"
else
    echo "Execution failed:" >&2
    echo "$OUTPUT" >&2
    exit 6
fi
