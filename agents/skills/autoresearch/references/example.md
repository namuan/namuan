# Worked Example: Bogo Sort Optimization

A condensed, real example of a completed autoresearch session. Read this to understand what the loop produces and what a finished session looks like.

## Context

The session optimized `bogo_sort.py` (a randomized sorting algorithm) to reduce average-case runtime by minimizing unnecessary shuffles. Primary metric: `runtime` (seconds, lower is better). Secondary metric: `shuffle_count` (lower is better).

## Results

| # | Approach | Runtime | Delta vs Baseline | Shuffle Count | Status |
|---|----------|---------|-------------------|---------------|--------|
| 1 | Baseline (naive loop) | 15.605s | 0% | 3,565,099 | keep |
| 2 | Approach 1: sorted() comparison | 16.524s | +5.9% | 1,352,569 | keep |
| 3 | Approach 2: itertools pairwise | 17.654s | +13.1% | 1,914,514 | discard |
| 4 | Approach 3: zip-based | 12.823s | -17.8% | 2,320,011 | keep |
| 5 | Approach 4: direct index | 19.342s | +23.9% | 729,212 | discard |
| 6 | Approach 5: hybrid heuristic | 14.715s | -5.7% | 1,493,813 | discard |
| 7 | Approach 6: bisect binary search | 0.002s | -99.99% | 1,346 | keep |
| 8 | Approach 7: optimized bisect | 19.561s | +25.4% | 741,884 | discard |
| 9 | Approach 8: simple all() | 15.797s | +1.2% | 948,685 | discard |

**Outcome**: Approach 6 (bisect-based sorted-state detection) won — 7,802x faster than baseline, with ~2,649x fewer shuffles.

## Why Bisect Won

- The bisect approach detected sorted state in O(log n) instead of O(n) per check, so each shuffle-check was ~7,800x faster.
- Faster rejection of invalid permutations meant far fewer shuffles (1,346 vs 3.5M).
- The winning `is_sorted` used binary search against a sorted copy instead of linear adjacent-pair comparison.
- Simpler linear approaches (zip, all()) were ~12-16s; over-engineered variants (approach 7) were worse than baseline.

## Session State (illustrative, cleaned)

The `autoresearch.jsonl` state file from such a session. Note: config header is its own line, run numbers are sequential, commits are real hashes.

```jsonl
{"type":"config","name":"bogo-sort-optimize","metricName":"runtime","metricUnit":"s","bestDirection":"lower"}
{"run":1,"commit":"dcb54c9","metric":15.605,"metrics":{"shuffle_count":3565099},"status":"keep","description":"baseline","timestamp":1773516683,"segment":0}
{"run":2,"commit":"c7fd4b6","metric":16.524,"metrics":{"shuffle_count":1352569},"status":"keep","description":"Approach 1: Built-in sorted() comparison","timestamp":1773516700,"segment":0}
{"run":3,"commit":"c7fd4b6","metric":17.654,"metrics":{"shuffle_count":1914514},"status":"discard","description":"Approach 2: itertools pairwise check","timestamp":1773516750,"segment":0}
{"run":4,"commit":"7060af0","metric":12.823,"metrics":{"shuffle_count":2320011},"status":"keep","description":"Approach 3: zip-based is_sorted","timestamp":1773516813,"segment":0}
{"run":5,"commit":"7060af0","metric":19.342,"metrics":{"shuffle_count":729212},"status":"discard","description":"Approach 4: Direct index comparison","timestamp":1773516850,"segment":0}
{"run":6,"commit":"7060af0","metric":14.715,"metrics":{"shuffle_count":1493813},"status":"discard","description":"Approach 5: Hybrid with first/last heuristic","timestamp":1773516928,"segment":0}
{"run":7,"commit":"45ec1ff","metric":0.002,"metrics":{"shuffle_count":1346},"status":"keep","description":"Approach 6: Bisect-based binary search detection","timestamp":1773516953,"segment":0}
{"run":8,"commit":"45ec1ff","metric":19.561,"metrics":{"shuffle_count":741884},"status":"discard","description":"Approach 7: Optimized bisect with early exit","timestamp":1773516999,"segment":0}
{"run":9,"commit":"45ec1ff","metric":15.797,"metrics":{"shuffle_count":948685},"status":"discard","description":"Approach 8: Simple all() comparison","timestamp":1773517050,"segment":0}
```

(The original repo's state file had quirks — a config header glued onto the same line as run 1, a duplicated run 8, and non-hash commit values. The example above is the corrected format the protocol requires.)
