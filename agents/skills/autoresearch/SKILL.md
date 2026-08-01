---
name: autoresearch
description: Set up and run an autonomous experiment loop for any optimization target. Use when asked to start autoresearch, run experiments, resume an existing loop, or regenerate the dashboard.
---

# Autoresearch

Autonomous experiment loop: try ideas, keep what works, discard what doesn't, never stop.

## Entry Behavior

- **Stop**: if asked to stop (or told "stop autoresearch"), summarize the current state (run count, best result) and stop. No sentinel file needed.
- **Dashboard only**: if asked to show or regenerate the dashboard, do only that — read `references/dashboard.md` and follow it.
- **Resume**: if `autoresearch.md` exists in the working directory, this is a resume:
  1. Read `autoresearch.md` (objective, constraints, what's been tried).
  2. Read `autoresearch.jsonl` to reconstruct state: run counts, baseline (first result in the current segment), best result, and which secondary metrics are tracked.
  3. Read `experiments/worklog.md`.
  4. Read `git log --oneline -20`.
  5. If `autoresearch.ideas.md` exists, read it for inspiration.
  6. Continue the loop from where it left off.
  If `autoresearch.jsonl` is missing, see "Missing State File" below.
- **Fresh start**: otherwise, follow Setup below.

## Setup

1. Ask (or infer): **Goal**, **Command**, **Metric** (+ direction), **Files in scope**, **Constraints**.
2. `git checkout -b autoresearch/<goal>-<date>`
3. Read the source files. Understand the workload deeply before writing anything.
4. `mkdir -p experiments` then write `autoresearch.md`, `autoresearch.sh`, and `experiments/worklog.md`. Templates and specs are in `references/session-files.md`. Commit all three.
5. Initialize the experiment (write the config header to `autoresearch.jsonl`) → run baseline → log result → start looping immediately.

`autoresearch.md` is the heart of the session — a fresh agent with no context must be able to read it and run the loop. Invest time making it excellent, and keep its "What's Been Tried" section current (see "Updating autoresearch.md").

## JSONL State Protocol

All experiment state lives in `autoresearch.jsonl` in the working directory. This is the source of truth for resuming across sessions.

### Config Header

The first line (and any re-initialization line) is a config header:

```json
{"type":"config","name":"<session name>","metricName":"<primary metric name>","metricUnit":"<unit>","bestDirection":"lower|higher"}
```

Rules:
- First line of the file is always a config header.
- Each subsequent config header (re-init) starts a new **segment**. The segment index increments with each config header.
- The baseline for a segment is the first result line after the config header.

### Result Lines

Each experiment result is appended as one JSON line:

```json
{"run":1,"commit":"abc1234","metric":42.3,"metrics":{"secondary_metric":123},"status":"keep","description":"baseline","timestamp":1234567890,"segment":0}
```

Fields:
- `run`: sequential run number (1-indexed, across all segments)
- `commit`: 7-char git short hash (HEAD after the auto-commit for keeps, or current HEAD for discard/crash)
- `metric`: primary metric value (0 for crashes)
- `metrics`: secondary metrics object — **once you start tracking a secondary metric, include it in every subsequent result**
- `status`: `keep` | `discard` | `crash`
- `description`: short description of what this experiment tried
- `timestamp`: Unix epoch seconds
- `segment`: current segment index

### Initialization

Initialize (overwrites the file):

```bash
echo '{"type":"config","name":"<name>","metricName":"<metric>","metricUnit":"<unit>","bestDirection":"<lower|higher>"}' > autoresearch.jsonl
```

Re-initialize to change the optimization target (**append** a new config header):

```bash
echo '{"type":"config","name":"<name>","metricName":"<metric>","metricUnit":"<unit>","bestDirection":"<lower|higher>"}' >> autoresearch.jsonl
```

## Running an Experiment

```bash
START=$(python3 -c 'import time; print(time.time())')
bash -c "./autoresearch.sh" 2>&1 | tee /tmp/autoresearch-output.txt
EXIT_CODE=$?
END=$(python3 -c 'import time; print(time.time())')
echo "Duration: $(python3 -c "print(f'{($END - $START):.3f}s')"), Exit code: ${EXIT_CODE}"
```

Then:
- Parse `METRIC name=number` lines from the output to extract metric values.
- If exit code != 0 → this is a crash.
- Read the output to understand what happened.

## Logging Results

After each experiment run, follow this exact protocol:

### 1. Determine status

- **keep**: primary metric improved (lower if `bestDirection=lower`, higher if `bestDirection=higher`)
- **discard**: primary metric worse or equal to best kept result
- **crash**: command failed (non-zero exit code)

Secondary metrics are for monitoring only — they almost never affect keep/discard decisions. Only discard a primary improvement if a secondary metric degraded catastrophically, and explain why in the description.

### 2. Git operations

**If keep:**

```bash
git add -A
git diff --cached --quiet && echo "nothing to commit" || git commit -m "<description>

Result: {\"status\":\"keep\",\"<metricName>\":<value>,<secondary metrics>}"
```

Then get the new commit hash:

```bash
git rev-parse --short=7 HEAD
```

**If discard or crash:**

```bash
git restore .
# Remove untracked experiment files, but PROTECT state files:
# the jsonl, dashboard, ideas file, backups, worklog, and output captures
# are exactly what the data-integrity protocol protects — never delete them.
git clean -fd -e autoresearch.jsonl -e autoresearch-dashboard.md -e autoresearch.ideas.md -e '*.bak.*' -e experiments/ -e autoresearch-output*
```

Use the current HEAD hash (before the revert) as the commit field.

### 3. Append result to JSONL

Never append directly. Use the atomic writer:

```bash
write_jsonl_entry() {
    local entry="$1"
    local jsonl_file="autoresearch.jsonl"
    local temp_file="${jsonl_file}.tmp.$$"

    # Copy current file to temp, then append the new entry
    cat "$jsonl_file" > "$temp_file" 2>/dev/null || touch "$temp_file"
    echo "$entry" >> "$temp_file"

    # Validate the new entry before committing it
    if ! echo "$entry" | python3 -m json.tool >/dev/null 2>&1; then
        rm -f "$temp_file"
        echo "  WARNING: Invalid JSON entry, not writing" >&2
        return 1
    fi

    # Atomic move (all-or-nothing)
    mv "$temp_file" "$jsonl_file"

    # Verify the write
    local new_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
    echo "Write verification: $new_count runs in JSONL" >&2
    return 0
}
```

### 4. After every log

- Regenerate `autoresearch-dashboard.md` — see `references/dashboard.md`.
- Append a concise entry to `experiments/worklog.md` (format in `references/session-files.md`). This file survives context compactions and crashes — it is the narrative of the session.
- Secondary metric consistency: parse the JSONL to discover which secondary metrics have been tracked, and include all of them in every subsequent result. If you add a new secondary metric mid-session, include it from that point forward.

## Data Integrity & Backups

- Never append directly to `autoresearch.jsonl` — always use `write_jsonl_entry` (above).
- Before any risky or user-confirmable operation, create a backup first.
- Detect loss: compare run counts in `autoresearch.jsonl` vs `experiments/worklog.md`.

Validation functions, backup-utility usage, and the data-loss recovery procedure: **read `references/state-protocol.md`** when a backup, restore, or recovery situation arises.

The backup utility is bundled with this skill at `scripts/backup-state.sh` (resolve the absolute path from this SKILL.md's location; if it is unavailable, fall back to `cp autoresearch.jsonl "autoresearch.jsonl.backup.$(date +%s)"`).

## Dashboard

After every log, regenerate `autoresearch-dashboard.md` from the JSONL: counts (runs / kept / discarded / crashed), baseline and best values, and a table of ALL runs in the current segment with delta percentages vs baseline. Template and consistency check: **read `references/dashboard.md`**.

## Loop Rules

**LOOP FOREVER.** Never ask "should I continue?" — the user expects autonomous work.

- **Primary metric is king.** Improved → `keep`. Worse/equal → `discard`. Secondary metrics rarely affect this.
- **Simpler is better.** Removing code for equal perf = keep. Ugly complexity for tiny gain = probably discard.
- **Don't thrash.** Repeatedly reverting the same idea? Try something structurally different.
- **Crashes:** fix if trivial, otherwise log and move on. Don't over-invest.
- **Think longer when stuck.** Re-read source files, study the profiling data, reason about what the CPU is actually doing. The best ideas come from deep understanding, not from trying random variations.
- **Resuming:** if `autoresearch.md` exists, follow the Resume path under Entry Behavior.

**Keep going until interrupted.** The user may be away for hours.

## Missing State File

If `autoresearch.jsonl` is missing when resuming:

1. Preserve context from `autoresearch.md` — read the objective, metrics, and files in scope.
2. Ask for user confirmation — "State file missing. Options:
   - A) Create new state (fresh start)
   - B) Continue with autoresearch.md context only
   - C) Restore from backup (if available)"
3. If fresh start: initialize new JSONL with a config header.
4. If continuing with context only: proceed with autoresearch.md data but note the limitation.

## Ideas Backlog

When you discover complex but promising optimizations that you decide not to pursue right now, **append them as bullet points to `autoresearch.ideas.md`**. Don't let good ideas get lost.

If the loop stops (context limit, crash, etc.) and `autoresearch.ideas.md` exists:

1. Read the ideas file and use it as inspiration for new experiment paths.
2. Prune ideas that are duplicated, already tried, or clearly bad.
3. Create experiments based on the remaining ideas.
4. If nothing is left, try to come up with your own new ideas.
5. If all paths are exhausted, delete `autoresearch.ideas.md` and write a final summary report.

When there is no `autoresearch.ideas.md` file and the loop ends, the research is complete.

## User Steers

User messages sent while an experiment is running should be noted and incorporated into the NEXT experiment. Finish your current experiment first — don't stop or ask for confirmation.

## Updating autoresearch.md

Periodically update `autoresearch.md` — especially the "What's Been Tried" section — so that a fresh agent resuming the loop has full context on what worked, what didn't, and what architectural insights have been gained. Do this every 5-10 experiments or after any significant breakthrough.
