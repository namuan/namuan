---
name: tenets-review
description: Review code or a diff against the 25 structural tenets from "The Shape of the System". Findings are blast-radius weighted and reported as check/location/failure/fix. Use for thorough, structure-focused code review.
---

Review the code under review against the 25 checks below.

**Target:** $ARGUMENTS — if this names files or directories, read them first. If it describes a change (e.g. "the staged diff", "the last commit"), obtain it with git. If empty, ask what to review.

For every check the code fails, report:

- **Check** — the tenet number and name
- **Location** — file and line(s)
- **Failure** — what the code does and why it violates the check
- **Fix** — the smallest change that would make the check pass

Skip a check only when it clearly doesn't apply to the code under review. Don't pad the review with speculative findings.

**When checks conflict, weigh by blast radius:** if the input is caller- or attacker-controlled and the blast radius is wide, the check is non-negotiable — flag it. If the code is self-contained and the cost of compliance is speculative, a documented reason to defer is acceptable — note it and move on.

---

## I — Locality of reasoning over global cleverness

**Ask:** To verify this change is correct, how far beyond it do you have to look?

**Watch for:** behaviour that depends on call order of other units, flags set in constructors, shared context, or globals mutated elsewhere.

## II — Make the data flow explicit, and give every ambient dependency one override point

**Ask:** Could a test pin this behaviour through a single declared override? If not, which ambient input has no seam?

**Watch for:** `now()`, `random()`, env vars, globals, or module-level clients pulled out of the ether with no injectable seam a test can reach.

## III — Parse, don't validate: make the illegal state unrepresentable

**Ask:** Past this boundary, is it structurally impossible to be holding the raw, unchecked form — or is this just one more check someone can skip?

**Watch for:** validation that answers "is this ok?" and throws the answer away; the same check repeated across call sites instead of one narrowed type at the door.

## IV — Everything across a trust boundary is hostile until proven otherwise

**Ask:** What is the worst single value, or the worst package, the other side could send here — is the size bounded, the authority re-verified, the trust pinned?

**Watch for:** allocating or deserialising before capping size; trusting caller-asserted identity (e.g. a `userId` in the payload); authentication treated as authorisation; unpinned dependencies or build steps running with broad secrets.

## V — Keep the responsive path free of uncontrolled-latency work

**Ask:** Is this path waiting on anything whose worst-case latency you don't control? If it never returns, does the system look dead?

**Watch for:** synchronous network, disk, or lock calls on a UI thread, event loop, request handler, or frame; in-process work whose cost scales with unbounded input.

## VI — Every wait across an uncontrolled boundary has a deadline

**Ask:** Does this wait cross a boundary you don't control? If so, what's the cutoff, is the work cancellable or idempotent when it fires, and where is the number written down?

**Watch for:** network, IPC, or lock waits with no timeout; timeouts that orphan slow work or fire unsafe duplicates on retry; arbitrary timeouts on legitimately long jobs.

## VII — Bound what callers can create; release what you acquire

**Ask:** What's the maximum this can grow to, and who controls that? On every exit path, what releases what was acquired?

**Watch for:** unbounded pools, loops, retries, caches, or recursion on caller-driven input; goroutines, timers, subscriptions, handles, or locks without a guaranteed release on error and panic paths.

## VIII — Tear down what you set up; subscribe for latency, reconcile for correctness

**Ask:** Does everything this code registers have a teardown? Is "it's done" learned from an event, with a reconciler behind it for the edge that can be missed?

**Watch for:** listeners or subscriptions without cleanup on unmount/shutdown; completion inferred from silence across a boundary; polling where an event exists (or subscribing where only silence exists).

## IX — Check-then-act on shared state is a race unless it's atomic or serialised

**Ask:** Can two actors interleave between this check and this act? If so, is the window made atomic, serialised, or harmless?

**Watch for:** `SELECT` then `INSERT`, read-modify-write, "reserve the last seat" logic without a unique constraint, CAS, lock ordering, or idempotency to back it.

## X — Make operations idempotent so "do it again" is always safe

**Ask:** If this runs twice because something retried, is the result identical to running it once?

**Watch for:** writes without stable keys; creates that aren't upserts; consumers without dedupe; pipelines or jobs that can't be re-run from any point without forensic cleanup.

## XI — Separate the irreversible decision from its effect

**Ask:** Can this irreversible decision be tested without doing it? Is the doing-part obviously correct? Is the plan still valid at the moment it executes?

**Watch for:** delete/charge/send logic fused with the reasoning that picks the targets; no dry-run possible; plans applied without re-checking that the precondition still holds.

## XII — Finish your obligations before you exit

**Ask:** If this were told to stop right now, what accepted work would silently vanish? Does the shutdown path complete those obligations within a deadline?

**Watch for:** unflushed buffers, consumed-but-unacked messages, half-written outputs (no temp-write-then-rename), ack-before-persist, drains without a deadline.

## XIII — Failure modes must be visible and impossible to swallow

**Ask:** Can a reader see this call can fail just by reading it? Is there any path where the failure silently disappears?

**Watch for:** bare `except:` / empty `catch`; ignored error returns; scripts that charge on after a failed step; errors handled far from where the context to decide lives.

## XIV — One source of truth; derive the rest

**Ask:** If these two copies disagreed at 3am, which one is right, why does the other exist, and where does it reconcile?

**Watch for:** the same fact stored in two places; caches or replicas with no named owner, invalidation path, or staleness budget; a second writable master.

## XV — Name the boundary, version the contract: strict in, tolerant of the unknown

**Ask:** If an old consumer hit this unchanged, would it break? Does the contract reject what it must while ignoring what it merely doesn't recognise?

**Watch for:** implicit contracts (reaching into internals, table shape leaking into public JSON); repurposed fields; breaking changes with no version or deprecation window; boundary parsers without tests.

## XVI — Least privilege, by construction

**Ask:** If this component were fully compromised, or simply buggy, what's the most it could touch — and does it actually need all of that?

**Watch for:** broad `*` IAM grants; write access where read-only suffices; god-objects passed where two fields would do; CI jobs holding more secrets than they use.

## XVII — Measure, then make the common case fast, but bound the unbounded without a profiler

**Ask:** Is this cost in caller-controlled size (bound it now, no profiler), a known antipattern (fix it), or cold readable code being rewritten into clever code nobody measured?

**Watch for:** super-linear complexity on caller- or attacker-controlled input; N+1 queries or chatty RPCs; per-row loops over vectorisable ops; per-frame allocations; unprofiled "optimisations" that spend clarity.

## XVIII — Make it observable, or you are guessing

**Ask:** When this invariant breaks at 3am, what signal tells you — and is it already being emitted?

**Watch for:** new queues, retries, breakers, caches, or fallbacks with no metric, trace, or log on their failure modes; silent degraded paths; secrets in logs; unbounded telemetry.

## XIX — Degrade in tiers; contain the blast radius

**Ask:** When this dependency is down or this tenant goes rogue, what's the smallest thing lost — and has that path ever actually been run?

**Watch for:** no designed fallback for dependency failure; shared pools across tenants or dependencies; retries without budget, backoff, or jitter; untested degraded paths.

## XX — Optimise for reversibility, deletion, and change

**Ask:** When this is wrong in a year, is the fix a scalpel or a demolition? Can you name the second thing that will use this seam? Is anything here data you're obligated to delete?

**Watch for:** one-shot irreversible migrations; speculative abstractions with no second concrete user; flags or scaffolds with no owner or expiry; soft-delete with no hard-delete path for data that must be destroyed.

## XXI — Simplicity is the budget that funds everything else

**Ask:** Can this state, flag, or branch be deleted entirely instead of writing the code that keeps it correct?

**Watch for:** abstractions for a future that never came; configurability nobody asked for; "temporary" branches; guards added where removing a state would have done the job.

## XXII — Name to reveal, not to label

**Ask:** Could a reader predict what this does, its units, and its caveats from the name alone? Is the name carrying a fact no type already carries?

**Watch for:** names that install a false model; `data`- or `amount`-style names without units or semantics; `handle`/`doX` names hiding side effects.

## XXIII — Time is an input that lies; measure with a monotonic clock, order with logic

**Ask:** Is this measuring a duration (use a monotonic clock) or asserting an order across machines (use logical ordering)? Would a backward clock jump or a lying peer break it?

**Watch for:** deadlines, TTLs, or token expiry checked against the wall clock; cross-host ordering inferred from `created_at` timestamps.

## XXIV — Make the run reproducible; encode the invariant as a test

**Ask:** Could someone else regenerate this exact result from pinned inputs? Is this invariant enforced by something that re-runs without its author?

**Watch for:** unpinned dependencies, toolchains, or seeds; unversioned input data; invariants guarded only by convention or comments; tests coupled to internals instead of the contract.

## XXV — Process is structure when code structure runs out

**Ask:** When this breaks and the author isn't here, does someone know they own it and know what to do? Does the irreversible step force a second human because the process says so?

**Watch for:** unowned services, flags, caches, or migrations; irreversible actions with no enforced second reviewer; known failure modes with no runbook.
