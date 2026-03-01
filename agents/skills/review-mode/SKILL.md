---
name: review-mode
description: PR review mode skill. Use this skill when the user wants to run in pull request review mode, automatically respond to GitHub PR review comments, have an AI agent monitor open GitHub pull requests and address feedback, run preemptive code reviews on new GitHub PRs, or replicate the --pull-request-mode workflow using Agent natively. Trigger on phrases like "PR review mode", "monitor pull requests", "address review comments automatically", "preemptive PR review".
---

# Pull Request Review Mode

PR review mode (`--pull-request-mode`) monitors open GitHub pull requests. For PRs with no review yet, it runs a preemptive coding-agent review and posts it as a comment. For PRs with reviewer comments, it addresses each new comment by checking out the branch, running the coding agent, committing, and pushing.

## Full Workflow

```
Poll open pull requests
  For each PR:
    Load all comments (conversation + review + line comments)
    Check for preemptive review marker in existing comments
    Filter: remove PR body duplicates, remove agent-generated comments

    If no comments remain AND no preemptive review yet:
      → Run preemptive review (coding agent reads the diff)
      → Post review as PR comment with [review] marker

    If reviewer comments exist:
      For each new comment (not yet processed):
        → Checkout and sync PR head branch
        → Check git log for [pr-comment-id:<ID>] (skip if already applied)
        → Build prompt: guardrails + PR metadata + comment context + AGENTS.md
        → Run coding agent
        → Stage & commit with message: "Address PR comment #<ID> [pr-comment-id:<ID>]"
        → Push head branch
        → Checkout base branch
```

## Executing PR Review Mode Natively with Agent

### Step 1: List Open Pull Requests (GitHub)

```bash
gh pr list --state open --json number,title,body,headRefName,baseRefName,url
```

### Step 2: Load All Comments for a PR

**GitHub — conversation comments:**
```bash
gh api repos/{owner}/{repo}/issues/{pr_number}/comments
```

**GitHub — review comments (line-level):**
```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments
```

**GitHub — reviews:**
```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
```

### Step 3: Filter Comments

**Remove operational noise:**
- Skip any comment whose body exactly matches the PR description body (the PR body gets echoed as first comment on some providers)
- Skip any comment whose body contains the preemptive review marker: `[review]`

**Detect preemptive review:**
- If any comment contains `[review]`, the preemptive review has already been posted — do not post again.

**Track processed comments:**
Keep an in-memory set of processed comment keys per PR:
```
key = "{type}:{id}:{review_id}:{path}:{line}:{old_line}"
```
Skip any comment whose key is already in the set.

### Step 4a: Preemptive Review (no reviewer comments yet)

If no reviewer comments remain after filtering AND no preemptive review marker exists:

**Get the PR diff:**
```bash
gh pr diff <PR_NUMBER>
```

**Build review prompt:**
```
You are conducting a preemptive code review for PR #<NUMBER>: <TITLE>

PR Description:
<BODY>

Diff:
<DIFF>

Review the changes for:
- Correctness and logic errors
- Security issues
- Code quality and maintainability
- Test coverage
- Adherence to project conventions (see AGENTS.md if present)

Return a structured review with specific, actionable feedback.
Be concise. A senior engineer is reading this.
```

**Post the result as a PR comment:**
```bash
gh pr comment <PR_NUMBER> --body "[review]

<REVIEW-OUTPUT>"
```

### Step 4b: Address Reviewer Comments

For each unprocessed reviewer comment:

**Check if already applied (git history check):**
```bash
git log --oneline origin/<HEAD-BRANCH> | grep "pr-comment-id:<COMMENT-ID>"
```
If found → skip (already processed).

**Checkout and sync the PR branch:**
```bash
git fetch origin <HEAD-BRANCH>
git checkout <HEAD-BRANCH>
git reset --hard origin/<HEAD-BRANCH>
```

**Build the implementation prompt:**
```
You are addressing a pull request review comment for PR #<NUMBER>: <TITLE>

PR Description:
<PR-BODY>

Reviewer comment (type: <TYPE>, file: <PATH>, line: <LINE>):
<COMMENT-BODY>

<AGENTS.md contents if file exists>

Address this specific reviewer comment. Make targeted changes only.
Do not modify files unrelated to the comment.
Do not commit or push — the automation handles that.
```

**Run the coding agent** (in the current session, implement the changes directly).

**Commit and push:**
```bash
# Stage changed files (exclude sensitive files)
git diff --name-only HEAD | grep -v -E '\.env|secret|credential|private_key' | xargs git add

# Commit with the comment ID embedded for idempotency
git commit -m "Address PR comment #<COMMENT-ID> [pr-comment-id:<COMMENT-ID>]"

# Push
git push origin <HEAD-BRANCH>
```

**Return to base branch:**
```bash
git checkout main
```

**Mark comment as processed** in your in-memory set.

## Comment Key Format

Use this composite key to uniquely identify each comment and detect duplicates:

```python
def comment_key(comment):
    return f"{comment['type']}:{comment['id']}:{comment.get('review_id', 0)}:{comment.get('path', '')}:{comment.get('line', 0)}:{comment.get('old_line', 0)}"
```

## Sort Order for Comments

Process comments in chronological order (by `created_at` ascending). For equal timestamps, sort by key string ascending.

## Polling Loop (with backoff)

```python
import time

base_wait = 30   # seconds
max_wait = 600   # 10 minutes
idle_attempts = 0

# Persist across polls
seen_comments = {}  # {pr_number: set of comment keys}

while True:
    prs = list_open_pull_requests()

    if not prs:
        wait = min(base_wait * (2 ** idle_attempts), max_wait)
        print(f"No open PRs. Waiting {wait}s...")
        time.sleep(wait)
        idle_attempts = min(idle_attempts + 1, 8)
        continue

    had_work = False

    for pr in prs:
        processed = process_pull_request(pr, seen_comments)
        if processed:
            had_work = True

    if had_work:
        idle_attempts = 0
    else:
        wait = min(base_wait * (2 ** idle_attempts), max_wait)
        print(f"No new work. Waiting {wait}s...")
        time.sleep(wait)
        idle_attempts = min(idle_attempts + 1, 8)
```

## Using uv for Python Scripts

```bash
# Install dependencies inline
uv run --with requests,pyyaml review_mode.py

# Or with pyproject.toml
uv run python review_mode.py
```

## Notes

- The `[review]` marker in preemptive review comments distinguishes them from human reviewer comments — never react to or re-post them
- The `[pr-comment-id:<ID>]` tag in commit messages enables idempotent processing — always check git history before applying a comment
- Never commit `.env`, credentials, private keys, or secret files
- If the coding agent makes no changes, skip the commit/push
- Only checkout and sync the PR branch when there is actual work to do
