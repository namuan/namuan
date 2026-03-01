# Troubleshooting Playbook

Apply fixes in this order: plugin and platform checks, credentials, workspace access, then reset.

## `docker sandbox` command missing

1. Check plugin file exists and is executable:

```bash
ls -la ~/.docker/cli-plugins/docker-sandbox
```

2. Restart Docker Desktop.

## Experimental features disabled by policy

If Docker Desktop is enterprise-managed, request administrator enablement for beta features.

## Authentication failures

1. Verify credential variable name for the selected agent.
2. Confirm credentials are set in shell config files, not only current shell.
3. Source shell config and restart Docker Desktop.
4. Recreate sandbox if prior auth state is corrupted.

## Workspace permission denied

1. Confirm workspace path is shared in Docker Desktop File Sharing.
2. Confirm path exists and is readable.
3. Correct file permissions if needed.

## Conflicting workspace credential files

If workspace includes agent-specific credential config (for example `.claude.json` with embedded key fields), remove direct key fields or rely on sandbox-managed credentials.

## Windows multi-sandbox crash recovery

End all `docker.openvmm.exe` processes in Task Manager, then restart Docker Desktop.

## Persistent corruption or unknown state

Use reset as last resort:

```bash
docker sandbox reset
```

This removes all sandbox VMs and state.
