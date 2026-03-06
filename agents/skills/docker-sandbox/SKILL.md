---
name: docker-sandbox
description: Operate Docker Sandboxes for AI coding agents to choose and run agents, configure credentials, reuse named sandboxes, mount multiple workspaces, apply network policies, use custom templates, troubleshoot failures, and migrate legacy setups. Use when requests involve docker sandbox commands, sandbox isolation behavior, supported agents (claude, codex, copilot, gemini, cagent, kiro, opencode, shell), or Docker Sandbox setup/debugging on macOS or Windows.
---

# Docker Sandbox Operator

Follow this workflow to run AI coding agents safely inside Docker Sandboxes.

## 1) Verify prerequisites

1. Ensure Docker Desktop version is 4.58 or newer.
2. Ensure platform is macOS or Windows.
3. Check that `docker sandbox` is available.
4. If `docker sandbox` is missing, use the plugin checks in [references/troubleshooting.md](references/troubleshooting.md).

## 2) Configure agent credentials before sandbox creation

1. Pick the target agent and required credential variables from [references/agent-auth.md](references/agent-auth.md).
2. Add credentials to `~/.zshrc` or `~/.bashrc`.
3. Source the shell config.
4. Restart Docker Desktop so the sandbox daemon receives updated variables.
5. Prefer host environment variables over interactive auth when possible.

## 3) Create or reuse a sandbox

1. Run `docker sandbox run AGENT [PATH]` for a simple setup.
2. Use `--name` when deterministic naming is needed.
3. Use `docker sandbox run AGENT PATH_A PATH_B:ro` for multi-workspace setups.
4. Reconnect by sandbox name with `docker sandbox run <sandbox-name>`.
5. Use the command patterns in [references/commands.md](references/commands.md).

## 4) Pass agent options correctly

1. Put agent-specific options after `--`.
2. Keep sandbox options before `--`.
3. Use examples from [references/agent-auth.md](references/agent-auth.md) for YOLO or trust configurations.

## 5) Apply network controls when required

1. Start by observing outbound traffic with `docker sandbox network log`.
2. Choose policy mode:
   - `allow` to permit most traffic and block specific destinations.
   - `deny` to block all traffic and allow only approved hosts.
3. Apply and iterate policy rules with `docker sandbox network proxy ...`.
4. Use baseline patterns in [references/network-policies.md](references/network-policies.md).

## 6) Operate and review safely

1. Assume the agent can modify any file in mounted workspaces.
2. Review all changes with Git before executing host-side actions.
3. Check untracked files and hidden paths, including hooks.

## 7) Use templates for repeatable environments

1. Base custom images on `docker/sandbox-templates:<agent>`.
2. Install system tools as `root`.
3. Switch back to `agent` before finishing the Dockerfile.
4. Run with `docker sandbox run -t <template> AGENT [PATH]`.

## 8) Escalate troubleshooting in order

1. Diagnose from symptom-specific fixes in [references/troubleshooting.md](references/troubleshooting.md).
2. Use `docker sandbox exec -it <sandbox-name> bash` for direct inspection.
3. Use `docker sandbox reset` only for persistent or corrupted global state.
