# Status digest

Push an update when something changes; stay silent otherwise. Lead with the outcome or headline metric.

```
<headline metric or milestone>: <before> → <after> (Δ<percent>)
Merged: <total> (+<since last report>) · Open: <count> · Blocked: <count>
Last merge: <elapsed> (watchdog threshold: <threshold>)
ETA: <time and timezone> (previous forecast: <time>; actual/delta: <value>)
Budget: <used>/<cap> · Lanes: <active>/<target>

| Milestone | State | Evidence | ETA |
|---|---|---|---|
| <label> | <state> | claimed / pushed / green / merged / deployed / measured: <link or check> | <time> |

Needs you: <one precise question, or "nothing">
```

Evidence levels in ascending order: claimed < pushed < green < merged < deployed < measured. Never report a level higher than the evidence supports. Use `x → y (Δz%)` for comparable metrics and state the baseline window.
