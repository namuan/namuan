# Dashboard Reference

Template and generation rules for `autoresearch-dashboard.md`. Read this when regenerating the dashboard (after every log, or when the user asks to show it).

## Generation Steps

1. Read `autoresearch.jsonl` to get all experiment results.
2. Count total runs, kept, discarded, crashed.
3. Find the baseline metric (first result after the current config header).
4. Find the best metric and which run achieved it.
5. Calculate delta percentages vs baseline for every result.
6. Generate the dashboard markdown (template below) and write it to `autoresearch-dashboard.md` in the current working directory.
7. Confirm to the user that the dashboard has been saved.

## Template

```markdown
# Autoresearch Dashboard: <name>

**Runs:** 12 | **Kept:** 8 | **Discarded:** 3 | **Crashed:** 1
**Baseline:** <metric_name>: <value><unit> (#1)
**Best:** <metric_name>: <value><unit> (#8, -26.2%)

| # | commit | <metric_name> | status | description |
|---|--------|---------------|--------|-------------|
| 1 | abc1234 | 42.3s | keep | baseline |
| 2 | def5678 | 40.1s (-5.2%) | keep | optimize hot loop |
| 3 | abc1234 | 43.0s (+1.7%) | discard | try vectorization |
...
```

Include delta percentages vs baseline for each metric value. Show ALL runs in the current segment (not just recent ones).

## Data Consistency Check

If the number of runs in `autoresearch.jsonl` doesn't match the number of entries in `experiments/worklog.md`:

1. **Check for backups**: `scripts/backup-state.sh list autoresearch.jsonl`
2. **If backups exist**: restore with `scripts/backup-state.sh restore-auto`
3. **If no backups**: manually recreate missing runs from worklog notes
4. **Note the discrepancy** in the dashboard header

Add this warning banner to the dashboard when inconsistency is detected:

```markdown
 **DATA INCONSISTENCY DETECTED**

- **Worklog documents**: <WORKLOG_RUN_COUNT> experiments
- **JSONL contains**: <JSONL_RUN_COUNT> runs
- **Missing**: <DIFF> runs **LOST!**

**Recovery steps:**
1. Check backups: `scripts/backup-state.sh list autoresearch.jsonl`
2. Restore if available: `scripts/backup-state.sh restore-auto`
3. Otherwise, manually recreate missing runs from worklog
```
