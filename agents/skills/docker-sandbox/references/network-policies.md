# Network Policy Recipes

Control outbound HTTP/HTTPS traffic with the sandbox proxy.

## Observe first

```bash
docker sandbox network log
```

Use logs to identify destinations before tightening policy.

## Allow mode (default style)

Permit most traffic, then block specific networks or hosts.

```bash
docker sandbox network proxy my-sandbox \
  --policy allow \
  --block-cidr 10.0.0.0/8 \
  --block-cidr 172.16.0.0/12 \
  --block-cidr 192.168.0.0/16 \
  --block-cidr 127.0.0.0/8
```

## Deny mode (strict)

Block by default, then allow only required destinations.

```bash
docker sandbox network proxy my-sandbox \
  --policy deny \
  --allow-host api.anthropic.com \
  --allow-host "*.npmjs.org" \
  --allow-host "*.pypi.org" \
  --allow-host github.com \
  --allow-host "*.githubusercontent.com"
```

## Matching rules to remember

- `example.com` does not match `api.example.com`.
- `*.example.com` does not match root `example.com`.
- Add both patterns when both root and subdomains are required.
- Add `:443` when rules must be port-specific.

## Localhost behavior

- Localhost is blocked by default CIDR blocks.
- If localhost access is required, allow a specific host and port pattern intentionally.

## HTTPS bypass mode

Use bypass only for pinning/incompatible clients.

```bash
docker sandbox network proxy my-sandbox \
  --bypass-host api.service-with-pinning.com
```

Bypassed traffic cannot receive proxy credential injection and has reduced inspection.
