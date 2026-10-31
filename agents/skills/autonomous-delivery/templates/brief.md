# Delivery brief

```
## Ask (verbatim)
> <the user's exact words>

## Outcome
Owner: <who is accountable for the result>
Milestone: <human-friendly label>
Done when: <observable, checkable condition>

## Feedback loop
<metric or observable behavior, instrument, baseline, and check command>

## Scope and dependencies
Owned files/paths: <list>
Shared dependencies: <APIs, files, fixtures, quotas, or owners>
Neighbors: <related lanes, PRs, and people>

## Constraints
- <constraint> | source: <operator/repo/platform/agent:lane> | set: <date/time> | expires: <condition> | why: <reason>

## Budget and timebox
<API/compute/CI cap, timebox, and stop percentage>

## Autonomy
Level: <L0–L5> (ceiling: <repo/GitHub ceiling>; grant source: <who, when, exact scope>)
Absence window: <duration/end time and what to do meanwhile>

## Stop conditions
Success: <condition>
Give up: <condition>
Escalate once if: <specific decision needed>

## Report contract
Cadence: <on change/milestones/time>
Format: milestone, state, evidence level, ETA, metric delta
Fan-out: <lane number of N; parent/coordinator>

## Status
<edited in place by the coordinator; last check: <time>>

<!-- delivery: runner=<here|cloud|later> · autonomy=<Ln> · coordinator=<who> · checked=<time> -->
```
