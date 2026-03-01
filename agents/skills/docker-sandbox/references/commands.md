# Command Patterns

Use these commands as building blocks.

## Create and run

```bash
docker sandbox run AGENT [PATH]
docker sandbox run --name my-sandbox AGENT [PATH]
docker sandbox create AGENT [PATH]
docker sandbox run <sandbox-name>
```

## Multiple workspaces

```bash
docker sandbox run AGENT ~/project ~/docs:ro
docker sandbox run AGENT . /path/to/lib:readonly
```

## Pass agent options

```bash
docker sandbox run <sandbox-name> -- <agent-options>
docker sandbox run <sandbox-name> -- --yolo
```

## Observe and debug

```bash
docker sandbox ls
docker sandbox exec -it <sandbox-name> bash
docker sandbox network log
docker sandbox network log --json
```

## Cleanup and reset

```bash
docker sandbox rm <sandbox-name>
docker sandbox rm <sandbox-a> <sandbox-b>
docker sandbox reset
```

## Template usage

```bash
docker build -t my-template:v1 .
docker sandbox run -t my-template:v1 AGENT [PATH]
docker sandbox run --pull-template always -t myorg/template:v1 AGENT [PATH]
```
