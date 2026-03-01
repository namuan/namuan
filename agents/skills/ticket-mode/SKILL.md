---
name: ticket-mode
description: Ticket mode skill. Use this skill when the user wants to run in ticket mode, automate JIRA-to-GitHub-PR workflows, implement JIRA tickets automatically, poll JIRA for ready issues and create GitHub pull requests, or replicate the ticket automation workflow using Agent natively. Trigger on phrases like "run ticket mode", "automate issues", "issue to PR", "implement tickets automatically".
---

# Ticket Mode

Ticket mode is the default operating mode. It continuously polls JIRA for ready issues, implements them using a coding agent, and creates GitHub pull requests.

## Executing Ticket Mode Natively with Agent

When replicating this workflow without the agent22 binary, follow these steps for each issue:

### Step 1: Fetch Ready Issues from JIRA

```bash
curl -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/search?jql=project%20%3D%20MYPROJ%20AND%20status%20%3D%20'ready'&maxResults=25" \
  -H "Accept: application/json"
```

Response fields used: `issues[].key`, `issues[].fields.summary`, `issues[].fields.description`, `issues[].fields.status.name`.

### Step 2: Filter Issues

Skip an issue if any of these are true:
- `body` / `description` is empty or null
- `body` / `description` (lowercased) contains `"human"`
- `body` / `description` (lowercased) contains `"blocked"`

### Step 3: Mark In-Progress (JIRA)

POST the "In Progress" transition via JIRA REST API:

```bash
# Get available transitions
curl -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<ISSUE-KEY>/transitions" \
  -H "Accept: application/json"

# Apply transition
curl -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/<ISSUE-KEY>/transitions" \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "<TRANSITION-ID>"}}'
```

### Step 4: Sync Base Branch

```bash
git fetch origin main
git checkout main
git reset --hard origin/main
```

### Step 5: Create or Checkout Issue Branch

```bash
# Check if branch exists
git show-ref --verify --quiet refs/heads/<ISSUE-KEY>
if [ $? -eq 0 ]; then
  git checkout <ISSUE-KEY>
  git rebase origin/main
else
  git checkout -b <ISSUE-KEY>
fi
```

### Step 6: Build Implementation Prompt

Combine the following into one prompt:

```
You are an automated coding agent. Follow these guardrails:
- Only modify files relevant to the issue
- Do not commit or push — the automation handles that
- Do not modify sensitive files (.env, secrets, credentials)
- Keep changes focused and minimal
- Write tests where appropriate

Issue: <ISSUE-KEY>
Summary: <ISSUE-SUMMARY>

Description:
<ISSUE-DESCRIPTION>

<AGENTS.md contents if file exists>
```

### Step 7: Run Implementation

Execute the coding agent with the prompt above. For Agent itself, this is the current session implementing the changes directly.

### Step 8: Post-Implementation Review

Build a review prompt:

```
Review the changes just made for issue <ISSUE-KEY> (<ISSUE-SUMMARY>).

Check for:
- Correctness: does it fully address the issue description?
- Code quality: any obvious bugs, security issues, or anti-patterns?
- Scope: are any changes outside the issue scope?
- Sensitive files: are any .env, secret, or credential files modified?

Return a structured list of issues found. If no issues, say "LGTM".
```

Run the coding agent with this review prompt.

### Step 9: Apply Review Feedback

Build an apply-review prompt:

```
The following review feedback was provided for issue <ISSUE-KEY>:

<REVIEW-OUTPUT>

Apply any valid, actionable feedback to the codebase.
Ignore nitpicks or style suggestions unless explicitly called out in AGENTS.md.
Do not apply feedback about sensitive files or out-of-scope changes.
```

Run the coding agent with this prompt.

### Step 10: Commit and Push

```bash
# Stage only non-sensitive files
git diff --name-only HEAD | grep -v -E '\.env|secret|credential|private_key' | xargs git add

# Commit
git commit -m "<ISSUE-KEY>: <ISSUE-SUMMARY>"

# Push
git push -u origin <ISSUE-KEY>
```

### Step 11: Create Pull Request

**GitHub:**
```bash
gh pr create \
  --title "<ISSUE-KEY>: <ISSUE-SUMMARY>" \
  --body "Automated PR for <ISSUE-KEY>

## Description
<ISSUE-SUMMARY>

## Changes
<CODING-AGENT-OUTPUT (truncated to 8000 chars)>" \
  --base main \
  --head <ISSUE-KEY>
```

Check first if a PR already exists:
```bash
gh pr list --head <ISSUE-KEY> --state open --json number,url
```

## Notes

- The branch name is the JIRA issue key (e.g., `PROJ-123`)
- Never commit `.env`, credentials, private keys, or secret files
- If no changes were made after the coding agent runs, skip commit/push/PR creation
- The coding agent runs three times per issue: implement → review → apply-review
