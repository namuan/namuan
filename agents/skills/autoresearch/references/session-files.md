# Session Files

Templates and specs for the session files the skill creates in the experiment's working directory. Read this during Setup and whenever you need to update a session file.

## autoresearch.md

This is the heart of the session. A fresh agent with no context should be able to read this file and run the loop effectively. Invest time making it excellent.

```markdown
# Autoresearch: <goal>

## Objective
<Specific description of what we're optimizing and the workload.>

## Metrics
- **Primary**: <name> (<unit>, lower/higher is better)
- **Secondary**: <name>, <name>, ...

## How to Run
`./autoresearch.sh` — outputs `METRIC name=number` lines.

## Files in Scope
<Every file the agent may modify, with a brief note on what it does.>

## Off Limits
<What must NOT be touched.>

## Constraints
<Hard rules: tests must pass, no new deps, etc.>

## What's Been Tried
<Update this section as experiments accumulate. Note key wins, dead ends,
and architectural insights so the agent doesn't repeat failed approaches.>
```

Update `autoresearch.md` periodically — especially the "What's Been Tried" section — so resuming agents have full context.

## autoresearch.sh

Bash script (`set -euo pipefail`) that:

- Pre-checks fast (syntax errors in <1s).
- Runs the benchmark.
- Outputs `METRIC name=number` lines, one per metric.

Keep it fast — every second is multiplied by hundreds of runs. Update it during the loop as needed.

Timeouts are optional and GNU-only (`timeout` from coreutils; `gtimeout` on macOS). Do not make them mandatory — the loop's own crash handling covers hangs.

## experiments/worklog.md

After every experiment, append a concise entry. This file survives context compactions and crashes, giving any resuming agent (or the user) a complete narrative of the session.

```markdown
### Run N: <short description> — <primary_metric>=<value> (<STATUS>)
- Timestamp: YYYY-MM-DD HH:MM
- What changed: <1-2 sentences describing the code/config change>
- Result: <metric values>, <delta vs best>
- Insight: <what was learned, why it worked/failed>
- Next: <what to try next based on this result>
```

Also update the "Key Insights" and "Next Ideas" sections at the bottom of the worklog when you learn something new.

**On setup**: create `experiments/worklog.md` with the session header, data summary, and baseline result.
**On resume**: read `experiments/worklog.md` to recover context.

## autoresearch.ideas.md

Created on demand (see "Ideas Backlog" in SKILL.md). Bullet-point list of promising-but-not-now optimizations. Deleted when exhausted.
