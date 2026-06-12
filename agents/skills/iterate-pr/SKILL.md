---
name: iterate-pr
description: Iterate on a PR until CI passes. Use when you need to fix CI failures, address review feedback, or continuously push fixes until all checks are green. Automates the feedback-fix-push-wait cycle.
---

# Iterate on PR Until CI Passes

Continuously iterate on the current branch until all CI checks pass and review feedback is addressed.

**Requires**: GitHub CLI (`gh`) authenticated.

## Tooling Setup

**Before starting the workflow, ask the user** how they'd like to handle the two data-fetching tasks:

### CI Checks & Log Snippets

*Needed for:* checking which CI checks failed and extracting log output to understand failures.

Ask the user which approach to use:
1. **Use `gh` CLI directly** — run `gh pr checks` for status and `gh run view <run-id> --log-failed` for failure logs
2. **Write a shell helper** — create a small script wrapping `gh` commands into structured output
3. **Use the GitHub API** — call `gh api repos/{owner}/{repo}/commits/{ref}/check-runs` directly

### PR Feedback Categorization (LOGAF Scale)

*Needed for:* fetching reviewer comments and classifying them by priority (`high`, `medium`, `low`, `bot`, `resolved`).

Ask the user which approach to use:
1. **Use `gh api` directly** — call the PR comments/reviews APIs and classify the output manually
2. **Write a shell script** — use `gh api` with `jq` to extract and categorize comments

**Categorization rules (LOGAF scale) to apply regardless of method:**
- `high` — blockers, security issues, "changes requested", prefixed with `h:`
- `medium` — standard feedback, prefixed with `m:`
- `low` — nits, style suggestions, prefixed with `l:`
- `bot` — informational automated comments (Codecov, Dependabot, etc.)
- `resolved` — threads already marked as resolved
- Review bot feedback (Warden, Cursor, Bugbot, CodeQL, etc.) is classified as `high`/`medium`/`low` (NOT `bot`) and tagged with `review_bot: true`

Each inline review comment has a `thread_id` (GraphQL node ID) used for replies.

## Workflow

### 1. Identify PR

```bash
gh pr view --json number,url,headRefName
```

Stop if no PR exists for the current branch.

### 2. Gather Review Feedback

Using the method chosen in the Tooling Setup, fetch and categorize all review feedback already posted on the PR.

### 3. Handle Feedback by LOGAF Priority

**Auto-fix (no prompt):**
- `high` - must address (blockers, security, changes requested)
- `medium` - should address (standard feedback)

When fixing feedback:
- Understand the root cause, not just the surface symptom
- Check for similar issues in nearby code or related files
- Fix all instances, not just the one mentioned

This includes review bot feedback (items with `review_bot: true`). Treat it the same as human feedback:
- Real issue found → fix it
- False positive → skip, but explain why in a brief comment
- Never silently ignore review bot feedback — always verify the finding

**Prompt user for selection:**
- `low` - present numbered list and ask which to address:

```
Found 3 low-priority suggestions:
1. [l] "Consider renaming this variable" - @reviewer in api.py:42
2. [nit] "Could use a list comprehension" - @reviewer in utils.py:18
3. [style] "Add a docstring" - @reviewer in models.py:55

Which would you like to address? (e.g., "1,3" or "all" or "none")
```

**Skip silently:**
- `resolved` threads
- `bot` comments (informational only — Codecov, Dependabot, etc.)

### 4. Check CI Status

Using the method chosen in the Tooling Setup, fetch structured CI check data (status, log snippets, run IDs) for the current PR.

### 5. Fix CI Failures

For each failure in the CI check data:
1. Read the logs and trace backwards from the error to understand WHY it failed — not just what failed
2. Read the relevant code and check for related issues (e.g., if a type error in one call site, check other call sites)
3. Fix the root cause with minimal, targeted changes
4. Find existing tests for the affected code and run them. If the fix introduces behavior not covered by existing tests, extend them to cover it (add a test case, not a whole new test file)

Do NOT assume what failed based on check name alone—always read the logs. Do NOT "quick fix and hope" — understand the failure thoroughly before changing code.

### 6. Verify Locally, Then Commit and Push

Before committing, verify your fixes locally:
- If you fixed a test failure: re-run that specific test locally
- If you fixed a lint/type error: re-run the linter or type checker on affected files
- For any code fix: run existing tests covering the changed code

If local verification fails, fix before proceeding — do not push known-broken code.

### 7. Monitor CI and Address Feedback

Poll CI status and review feedback in a loop instead of blocking:

1. Fetch current CI status using the method chosen in Tooling Setup
2. If all checks passed → proceed to exit conditions
3. If any checks failed (none pending) → return to step 5
4. If checks are still pending:
   a. Fetch any new review feedback using the method chosen in Tooling Setup
   b. Address any new high/medium feedback immediately (same as step 3)
   c. If changes were needed, commit and push (this restarts CI), then continue polling
   d. Sleep 30 seconds, then repeat from sub-step 1
5. After all checks pass, do a final feedback check: `sleep 10`, then fetch feedback again. Address any new high/medium feedback — if changes are needed, return to step 6.

### 8. Repeat

If step 7 required code changes (from new feedback after CI passed), return to step 2 for a fresh cycle. CI failures during monitoring are already handled within step 7's polling loop.

## Exit Conditions

**Success:** All checks pass, post-CI feedback re-check is clean (no new unaddressed high/medium feedback including review bot findings), user has decided on low-priority items.

**Ask for help:** Same failure after 2 attempts, feedback needs clarification, infrastructure issues.

**Stop:** No PR exists, branch needs rebase.

## Reference: Useful `gh` Commands

If using the CLI approach, these commands are the building blocks:

- `gh pr checks --watch` or `gh pr checks name,state,bucket,link` — list CI check statuses
- `gh run view <run-id> --log-failed` — get failure logs for a specific run
- `gh api repos/{owner}/{repo}/pulls/{number}/comments` — get PR review comments
- `gh api repos/{owner}/{repo}/pulls/{number}/reviews` — get PR review summaries
- `gh api repos/{owner}/{repo}/commits/{ref}/check-runs` — get detailed check run data
- `gh api graphql -f query='...'` — GraphQL queries (e.g., for thread replies)
