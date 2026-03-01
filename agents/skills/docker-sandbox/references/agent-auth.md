# Agent Authentication and Runtime Options

Use host-level environment variables in `~/.zshrc` or `~/.bashrc`, then source the file and restart Docker Desktop.

| Agent | Credential variables | Auth behavior | Common runtime options |
| --- | --- | --- | --- |
| claude | `ANTHROPIC_API_KEY` | Env var preferred; interactive `/login` supported | `-- --continue` |
| codex | `OPENAI_API_KEY` | Env var required for non-interactive flow | `-- --dangerously-bypass-approvals-and-sandbox` |
| copilot | `GH_TOKEN` or `GITHUB_TOKEN` | Env var required for sandbox credential injection | `-- --yolo` |
| gemini | `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Env var preferred; interactive login supported | `-- --yolo` |
| cagent | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, optional others | Proxy-managed multi-provider credentials | `-- run --yolo` |
| opencode | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, optional others | Proxy-managed multi-provider credentials | TUI default |
| kiro | Device flow (interactive) | Browser-based device auth; persisted in sandbox state | `-- chat --trust-all-tools` |
| shell | Provider keys as needed | Proxy injects credentials; no preinstalled agent | `-- -c "<command>"` |

## Important credential rule

Docker sandbox daemons do not inherit ephemeral shell variables. Avoid inline one-off exports for sandbox setup. Persist variables in shell config files and restart Docker Desktop.

## Provider examples for multi-provider agents

```bash
export OPENAI_API_KEY=...
export ANTHROPIC_API_KEY=...
export GOOGLE_API_KEY=...
export XAI_API_KEY=...
```
