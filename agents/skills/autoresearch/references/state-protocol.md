# State Protocol Reference

Data-integrity functions, backup-utility usage, and recovery procedures. Read this file when a backup, restore, validation, or data-loss situation arises.

> **Script path note**: `scripts/backup-state.sh` below means the bundled script inside the skill folder (resolve the absolute path from the SKILL.md you loaded). Run it from the experiment's working directory — backups are created relative to the current directory, never relative to the script.

## Pre-Write Validation

Before writing any new experiment result, validate the JSONL file:

```bash
validate_jsonl() {
    local jsonl_file="autoresearch.jsonl"

    if [[ -f "$jsonl_file" ]]; then
        local run_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
        echo "Current runs in JSONL: $run_count" >&2

        # Verify last 5 lines are valid JSON
        tail -n 5 "$jsonl_file" 2>/dev/null | while IFS= read -r line; do
            if ! echo "$line" | python3 -m json.tool >/dev/null 2>&1; then
                echo "WARNING: Invalid JSON found in state file" >&2
                return 1
            fi
        done

        echo "JSONL validation: OK" >&2
        return 0
    fi
    return 0  # File doesn't exist yet, that's OK
}

validate_jsonl || {
    echo "  WARNING: JSONL validation failed. Proceeding with caution." >&2
}
```

## Post-Write Verification

```bash
verify_write() {
    local expected_run=$1
    local jsonl_file="autoresearch.jsonl"

    if [[ -f "$jsonl_file" ]]; then
        local actual_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)

        if [[ "$actual_count" -lt "$expected_run" ]]; then
            echo "  WARNING: Run count mismatch! Expected $expected_run, got $actual_count" >&2
            echo "This may indicate data loss in previous writes." >&2
            return 1
        fi

        echo "Write verification: OK (run $expected_run present)" >&2
        return 0
    fi
    return 1
}
```

## Backups Before User-Confirmable Actions

Before any user-confirmable action (manual intervention, major changes, discarding multiple experiments), create a backup:

```bash
backup_before_confirm() {
    echo "  User confirmation required. Creating backup..." >&2

    # Use the bundled backup utility (its absolute path, resolved from the
    # skill's SKILL.md location) if available; otherwise fall back to a
    # simple timestamped copy.
    if [[ -x "<skill-scripts-dir>/backup-state.sh" ]]; then
        "<skill-scripts-dir>/backup-state.sh" backup 2>/dev/null || true
    else
        cp autoresearch.jsonl "autoresearch.jsonl.backup.$(date +%s)" 2>/dev/null || true
    fi

    echo "Backup created. Awaiting user confirmation..." >&2
}
```

**Always call `backup_before_confirm` before any operation that requires user approval.**

## Backup Utility

The bundled `scripts/backup-state.sh` creates timestamped backups of the state files (`autoresearch.jsonl`, `autoresearch-dashboard.md`, `experiments/worklog.md` — all relative to the current working directory).

Backup naming: `<filename>.bak.<YYYYMMDD_HHMMSS>` — example: `autoresearch.jsonl.bak.20260313_142530`.

| Command | Description |
|---------|-------------|
| `backup` | Create timestamped backups of all state files |
| `cleanup` | Remove old backups, keeping only the last 5 per file |
| `restore` | Restore from the most recent backup (interactive — for humans; agents use `restore-auto`) |
| `restore-auto` | Restore from the most recent backup without confirmation |
| `list [file]` | List available backups for a specific file |
| `all` | Run backup, cleanup, and list in sequence |
| `help` | Show usage |

Examples:

```bash
scripts/backup-state.sh backup
scripts/backup-state.sh cleanup
scripts/backup-state.sh backup cleanup
scripts/backup-state.sh restore-auto
scripts/backup-state.sh list autoresearch.jsonl
```

Best practices:
- Always backup before major changes or user confirmations.
- Keep the last 5 backups (delete older ones — `cleanup` does this).
- Restore from backup if an experiment crashes or state becomes corrupted.

## Data Loss Detection and Recovery

If you detect data loss (dashboard shows inconsistency, JSONL count doesn't match worklog):

1. **Immediate actions** — confirm the loss:

   ```bash
   JSONL_COUNT=$(grep -c '"run":' autoresearch.jsonl 2>/dev/null || echo 0)
   WORKLOG_COUNT=$(grep -c "^### Run" experiments/worklog.md 2>/dev/null || echo 0)

   if [[ "$JSONL_COUNT" -ne "$WORKLOG_COUNT" ]]; then
       echo "  DATA LOSS DETECTED: JSONL has $JSONL_COUNT runs, worklog has $WORKLOG_COUNT runs" >&2
   fi
   ```

2. **Check backups**:

   ```bash
   scripts/backup-state.sh list autoresearch.jsonl
   ```

3. **Recovery options**:
   - **Best**: restore from a recent backup (`scripts/backup-state.sh restore-auto`)
   - **Alternative**: manually recreate missing runs from worklog notes
   - **Last resort**: start a new segment with a new config header

4. **Prevention**: always backup before user-confirmable actions (see above).
