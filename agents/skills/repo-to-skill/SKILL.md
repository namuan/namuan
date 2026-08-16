---
name: repo-to-skill
description: |
  Convert any GitHub repository into a portable, reusable coding-agent skill. Analyzes
  repository architecture with a Mermaid state machine diagram, evaluates suitability,
  generates a SKILL.md, and presents it to the user for review.
  Use when asked to "turn this repo into a skill", "convert repo to skill", "make a
  skill from this repo", or "package this as a coding-agent skill".
---

## Preamble (run first)

```bash
set -euo pipefail
```

# /repo-to-skill

Convert any repository into a runnable coding-agent skill.

## Step 0: Get the target repo

If the user passed a repo URL or path as an argument, use it. Otherwise, ask:

> Which repo do you want to convert to a skill?

Options:
- A) Enter a GitHub URL (will be cloned)
- B) Use a local path
- C) Use the current working directory

**If URL:** Clone it to a temp directory:
```bash
_REPO_URL="<url-from-user>"
_SKILL_TMP=$(mktemp -d "${TMPDIR:-/tmp}/repo-to-skill-XXXXXX")
git clone --depth=1 "$_REPO_URL" "$_SKILL_TMP/repo" 2>&1 | tail -3
_REPO_DIR="$_SKILL_TMP/repo"
echo "REPO_DIR: $_REPO_DIR"
echo "REPO_NAME: $(basename $_REPO_URL .git)"
```

**If local path or CWD:** Set `_REPO_DIR` to that path and `_REPO_NAME` to the directory basename.

## Step 1: Analyze the repo structure

Run these in parallel to gather context quickly:

```bash
# File tree (top 3 levels, key files)
find "$_REPO_DIR" -maxdepth 3 -not -path '*/.git/*' -not -path '*/node_modules/*' \
  -not -path '*/__pycache__/*' -not -path '*/.venv/*' | sort | head -80

# Language breakdown
find "$_REPO_DIR" -not -path '*/.git/*' -not -path '*/node_modules/*' \
  -name '*.py' -o -name '*.ts' -o -name '*.js' -o -name '*.go' \
  -o -name '*.rs' -o -name '*.java' -o -name '*.rb' -o -name '*.sh' | \
  sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10

# Entry points and CLI definitions
grep -rl 'argparse\|click\|typer\|commander\|yargs\|cobra\|clap\|optparse' \
  "$_REPO_DIR" --include='*.py' --include='*.ts' --include='*.js' \
  --include='*.go' --include='*.rs' 2>/dev/null | head -10

# README
cat "$_REPO_DIR/README.md" 2>/dev/null || cat "$_REPO_DIR/readme.md" 2>/dev/null || echo "No README"

# package.json / pyproject.toml / Cargo.toml / go.mod scripts/entrypoints
cat "$_REPO_DIR/package.json" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('scripts',{}), indent=2))" 2>/dev/null || true
cat "$_REPO_DIR/pyproject.toml" 2>/dev/null | head -40 || true
cat "$_REPO_DIR/Makefile" 2>/dev/null | grep '^[a-z]' | head -20 || true
```

Read the following project guidance and CI files if they exist: `AGENTS.md`, `CONTRIBUTING.md`, `.github/workflows/*.yml` (first 2).

## Step 2: Draw the state machine diagram

Based on what you've read, draw a **Mermaid state diagram** showing:
- Core components and how they interact
- Data flow: input → processing → output
- Agent loops, model pipelines, or kernel sequences if present
- Key configuration points and external dependencies

Output it in a fenced code block:

```
stateDiagram-v2
    [*] --> ...
```

Explain each major state/component in 1-2 sentences below the diagram. Focus on what is automatable and what an agent would need to orchestrate.

## Step 3: Generate PROGRESS.md and GOODSTUFF.md

Write two files into the repo root (skip if they already exist and are recent):

**PROGRESS.md** — high-level overview:
- What the project does (1 paragraph)
- Key components and responsibilities (bulleted)
- Architecture patterns used
- Entry points, configs, main loops
- Current status and notable TODOs/limitations

**GOODSTUFF.md** — learnable patterns:
- Clever or elegant patterns worth studying
- Reusable techniques (training tricks, optimization strategies, prompt engineering, agent design patterns)
- Notable libraries or tools and why they're effective
- Anything applicable to future projects

## Step 4: Evaluate skill suitability

Score the repo on this rubric (each 0-2 points):

| Criterion | 0 | 1 | 2 |
|-----------|---|---|---|
| **Repeatable workflow** | One-off script | Semi-structured | Clear, repeatable workflow |
| **AI orchestration value** | Just runs code | Some decisions | Needs reasoning/judgment |
| **Tool interactions** | None | Single tool type | Multiple (files, web, shell, APIs) |
| **Clear entrypoint** | No entry point | Implicit | Explicit CLI/API |
| **Generalizable** | Hardcoded to one case | Somewhat adaptable | Works across many repos/inputs |
| **Documentation quality** | None | Partial | README + examples |

**Scoring:**
- 10-12: Excellent skill candidate — proceed automatically
- 7-9: Good candidate — proceed with minor caveats noted
- 4-6: Marginal — ask user if they want to proceed with limitations noted
- 0-3: Poor fit — explain why and suggest alternatives

Show the score table to the user. If score ≥ 4, continue. If < 4, explain and stop (unless user insists).

## Step 5: Design the skill

Before generating, answer these questions by reading the repo:

1. **What is the skill's one-liner?** (for the `description` field)
2. **What capabilities does it need?** Map repository capabilities to host-independent capabilities:
   - File I/O → file inspection and editing
   - Shell commands → a shell
   - Web browsing/testing → browser automation or HTTP tools, if available
   - External research → search and fetch tools, if available
   - Complex sub-tasks → task delegation, if available
3. **What is the primary workflow?** Extract the main phases from the repo (e.g. clone → analyze → transform → output)
4. **What are the key inputs?** (repo URL, file path, config options)
5. **What does success look like?** (output files, printed result, deployed artifact)
6. **Are there hooks needed?** (pre/post tool use guards)

## Step 6: Generate the skill SKILL.md

Generate a complete, runnable `SKILL.md` for the target repo. Follow this structure exactly:

```markdown
---
name: <kebab-case-name>
description: |
  <2-4 sentence description of what the skill does and when to use it.
  Include trigger phrases: "Use when asked to X, Y, Z."
---

## Preamble (run first)

\`\`\`bash
set -euo pipefail
\`\`\`

# /<name>

<One sentence of what this skill does.>

## Step 1: <First phase name>

<Instructions for the agent to follow, referencing specific files, commands, and patterns
from the source repo. Be concrete — name actual files, functions, and commands.>

\`\`\`bash
# Key commands the skill will run
<actual commands extracted from the repo>
\`\`\`

## Step 2: <Second phase name>

...

## Output

<What the skill produces — files written, console output, next steps.>
```

**Critical rules for generated skills:**
- Reference real file paths and commands from the analyzed repo
- Preamble is always the first bash block
- Instructions must be specific enough that an agent can follow them without reading the repo again
- Ask the user directly for required inputs before starting work
- Each step should have a clear success condition

## Output

Create the new skill in a temporary folder, then print the path at the end so the
user can review it:

```bash
_SKILL_OUT=$(mktemp -d /tmp/repo-to-skill-output-XXXXXX)
# Write the generated SKILL.md
cat > "$_SKILL_OUT/SKILL.md" << 'SKILLEOF'
<paste generated SKILL.md content here>
SKILLEOF
echo "Skill created at: $_SKILL_OUT"
```

Tell the user the skill is at that path and they can review it there. Note that it's
a temporary folder — they should copy it somewhere permanent if they want to keep it.
Show a summary table:

| Item | Value |
|------|-------|
| Skill name | `/<skill-name>` |
| Skill location | `$_SKILL_OUT` |
| Suitability score | X/12 |
| Source repo | `<repo-name>` |
| Architecture diagram | See PROGRESS.md |

## Error handling

- **Clone fails:** Check if `git` is installed, if URL is correct, if repo is private (suggest `gh auth login`)
- **Score < 4:** Don't generate — explain what's missing and what would improve suitability
