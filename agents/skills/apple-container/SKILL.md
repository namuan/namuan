---
name: apple-container
description: User-facing reference for Apple’s lightweight Linux container runtime `container`, which runs on Apple Silicon Macs. Covers everyday command usage including `container run`, `container build`, `container image pull/push`, `container machine`, volumes, networks, DNS, configuration files, and troubleshooting for the `container` command.
---

# apple-container (`container` CLI)

Apple’s `container` tool is a runtime that starts Linux containers on macOS using the model **one lightweight VM = one container**. It uses OCI-compatible images, so images built with Docker or podman work as-is. The repository is [apple/container](https://github.com/apple/container).

> This skill is **for users**. It covers knowledge for using the `container` command, not how to modify or build the source code.

## Requirements

- **Apple Silicon Mac** (Intel Macs are not supported)
- **macOS 26 recommended**. It also runs on macOS 15, but with the following limitations. Issues are generally only handled when the reproduction environment is macOS 26.
  - No container-to-container networking. All containers belong to the default network in isolation.
  - The `container network` command is unavailable.
  - Specifying `--network` causes an error.
  - The subnet is fixed to `192.168.64.1/24`. Networking can fail completely due to inconsistencies with vmnet.

### Supported architectures

Only two guest architectures can run: `linux/arm64` (native) and `linux/amd64` (via Rosetta).

- The CLI help for `container system kernel set --arch` explicitly says it only accepts `amd64` and `arm64`.
- `container run --arch` and `container build --arch` do not reject unsupported values at the CLI layer, so values such as `riscv64`, `ppc64le`, or `s390x` may proceed as far as image pull or VM startup, but guest process startup fails with `Exec format error`.

## Installation and startup

### First-time installation

```bash
brew install container
container system start
```

On first startup, you are prompted to download a kernel. Approve with `Y`. You can also register it as a service that starts at login with `brew services start container`.

### Upgrade

```bash
container system stop
brew upgrade container
container system start
```

### Uninstall

```bash
container system stop
brew uninstall container
```

User data such as `~/.config/container` is not removed by `brew uninstall`; delete it manually if it is no longer needed.

### Verify startup

```bash
container system status
container system version
container list --all      # OK if it responds, even if empty
```

## Overall CLI structure

The subcommand tree is broadly divided into these groups.

| Group                | Main commands                                                                                                                                                                   |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Containers           | `run` / `create` / `start` / `stop` / `kill` / `delete` (`rm`) / `list` (`ls`) / `exec` / `logs` / `inspect` / `stats` / `copy` (`cp`) / `export` / `prune`                     |
| Images               | `build` / `image pull` / `image push` / `image list` / `image inspect` / `image tag` / `image save` / `image load` / `image delete` / `image prune`                             |
| Builder              | `builder start` / `builder status` / `builder stop` / `builder delete`                                                                                                          |
| Networks (macOS 26+) | `network create` / `network list` / `network inspect` / `network delete` / `network prune`                                                                                      |
| Volumes              | `volume create` / `volume list` / `volume inspect` / `volume delete` / `volume prune`                                                                                           |
| Registries           | `registry login` / `registry logout` / `registry list`                                                                                                                          |
| Container machines   | `machine create` / `machine run` / `machine list` / `machine inspect` / `machine set` / `machine set-default` / `machine logs` / `machine stop` / `machine delete` (alias: `m`) |
| System               | `system start` / `system stop` / `system status` / `system version` / `system logs` / `system df` / `system dns ...` / `system kernel set` / `system property list`             |

General help is available with `container --help` and `container <subcommand> --help`.

## Running containers (`container run`)

### Basics

```bash
container run -it ubuntu:latest /bin/bash                # Interactive shell
container run -d --name web -p 8080:80 nginx:latest      # Background web server
container run --rm alpine echo hello                      # Delete after exit
```

If the registry is omitted from an image name, the `[registry] domain` value in `~/.config/container/config.toml` is filled in (default: `docker.io`).

### Common options

| Purpose               | Flags                                                             |
| :-------------------- | :---------------------------------------------------------------- | -------------------------- |
| Naming                | `--name <id>`                                                     |
| Background            | `-d` / `--detach`                                                 |
| Auto-delete           | `--rm`                                                            |
| Interactive           | `-i` / `-t` (usually combined as `-it`)                           |
| Environment variables | `-e KEY=VAL` / `-e KEY` (inherit from host) / `--env-file <path>` |
| Working directory     | `-w /path`                                                        |
| User                  | `-u name                                                          | uid[:gid]`/`--uid`/`--gid` |
| `ulimit`              | `--ulimit <type>=<soft>[:<hard>]`                                 |

### Resources

```bash
container run --cpus 8 --memory 32g big              # Default is 4 CPUs / 1 GiB
container run --shm-size 1G img                      # /dev/shm size
container run --tmpfs /tmp img                       # tmpfs mount
```

### File sharing

`--volume` and `--mount` are different syntaxes for the same feature.

```bash
# Mount the host's ~/Desktop/assets at /content/assets in the container
container run -v ${HOME}/Desktop/assets:/content/assets python:alpine ls /content/assets

# Same thing with --mount
container run --mount source=${HOME}/Desktop/assets,target=/content/assets,readonly python:alpine ls /content/assets
```

Anonymous volumes (`-v /path` form) are **not automatically deleted** even when `--rm` is specified (unlike Docker). Delete them explicitly with `container volume rm <anon-id>`.

### Publishing ports

```bash
container run -d --rm -p 127.0.0.1:8080:8000 node:latest                  # IPv4
container run -d --rm -p '[::1]:8080:8000' node:latest                    # IPv6
container run -d --rm -p 8080:80/udp img                                  # Specify protocol
```

Format: `[host-ip:]host-port:container-port[/protocol]`. When connected to multiple networks, traffic is forwarded to the first attached interface.

### Multi-platform

Only `arm64` (native) and `amd64` (via Rosetta) are supported.

```bash
container build --arch arm64 --arch amd64 -t img .
container run --arch amd64 --rm img uname -a        # amd64 runs via Rosetta
```

### SSH agent forwarding

```bash
container run -it --rm --ssh alpine sh
# Inside: SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock is set
```

### Linux capabilities

By default, containers get a limited capability set, such as `CAP_NET_BIND_SERVICE`.

```bash
container run --cap-add NET_ADMIN alpine ip link set lo down
container run --cap-add ALL alpine sh
container run --cap-drop ALL --cap-add SETUID --cap-add SETGID alpine id
```

The `CAP_` prefix and letter case are ignored. `--cap-drop` is processed before `--cap-add` (`--cap-drop ALL --cap-add ALL` grants ALL).

### Init process

Use `--init` if you need signal forwarding and zombie process reaping.

```bash
container run --init ubuntu:latest my-app
```

Specify a custom init image (your own binary wrapping `vminitd`) with `--init-image <image>`. Use this when you want to inject custom logic during VM boot.

### Nested virtualization

Requires an M3 or later Apple Silicon Mac and a kernel with `CONFIG_KVM=y`.

```bash
container run --virtualization --kernel /path/to/vmlinux-kvm --rm ubuntu sh -c "dmesg | grep kvm"
```

## Building images (`container build`)

```bash
container build -t my-app:latest .                                # Find Dockerfile and build
container build -f docker/Dockerfile.prod -t my-app:prod .        # Specify Dockerfile
container build --build-arg NODE_VERSION=18 -t my-app .           # build-arg
container build --target production --no-cache -t my-app:prod .   # Specify stage
container build -t my-app:latest -t my-app:v1.0.0 .               # Multiple tags
```

File discovery order is `Dockerfile`, then `Containerfile`.

### Builder resources

The builder is a separate VM (default: 2 CPUs / 2 GiB). If large builds stall:

```bash
container builder stop && container builder delete
container builder start --cpus 8 --memory 32g
```

Disable Rosetta during builds:

```toml
# ~/.config/container/config.toml
[build]
rosetta = false
```

## Image management

```bash
container image list                                              # Local images
container image inspect web-test | jq                             # Detailed JSON
container image pull alpine:latest                                # Pull
container image push registry.example.com/me/img:latest           # Push
container image tag web-test registry.example.com/me/web:latest   # Add another tag
container image save -o img.tar img1 img2                          # Save to tar
container image load -i img.tar                                    # Load from tar
container image delete web-test                                    # Delete
container image prune -a                                           # Delete all unused images
```

### Registry authentication

```bash
container registry login some-registry.example.com                # Interactive input
echo $TOKEN | container registry login --password-stdin -u me reg # stdin
container registry list
container registry logout some-registry.example.com
```

Change the default registry with `[registry] domain`. `--scheme auto` (the default) uses HTTP only for loopback, RFC1918, and the default DNS domain; otherwise it uses HTTPS.

## Container management

```bash
container ls                          # Running containers
container ls -a                       # Include stopped containers
container ls --format json --all | jq '.[] | .configuration.id'

container inspect my-web-server | jq
container logs my-web-server                # stdout logs
container logs --boot my-web-server         # VM boot logs
container logs -f -n 100 my-web-server      # tail -f the last 100 lines

container exec -it my-web-server sh          # Enter an existing container with a shell
container exec my-web-server ls /content

container cp ./config.json my-web-server:/etc/app/   # Host -> container
container cp my-web-server:/var/log/app.log ./       # Container -> host

container stop my-web-server                  # SIGTERM, then SIGKILL after 5 seconds
container stop -s SIGINT -t 30 my-web-server
container kill my-web-server                   # Immediate SIGKILL
container rm my-web-server                     # Delete after stopping
container rm -f my-web-server                  # Force-delete even if running
container prune                                # Delete all stopped containers
```

### Status monitoring

```bash
container stats                              # Show all containers like top
container stats --no-stream my-web-server    # One-shot snapshot
container stats --format json --no-stream my-web-server | jq
```

### Exporting a filesystem

```bash
container stop my-web-server
container export -o my-web-server.tar my-web-server
container export my-web-server > my-web-server.tar
```

## Networks (macOS 26+)

`container system start` creates the `default` (vmnet) network. You can add custom isolated networks.

```bash
container network create foo
container network create foo --subnet 192.168.100.0/24 --subnet-v6 fd00:1234::/64
container network ls
container network inspect foo
container network delete foo                  # Cannot delete while containers are connected
container network prune                       # Delete all disconnected networks

container run -d --name web --network foo web-test
container run -d --network default,mac=02:42:ac:11:00:02 ubuntu     # Specify MAC address
```

When specifying a MAC address, set the lowest two bits of the first octet to `10` (locally administered, unicast).

To change the default subnets:

```toml
# ~/.config/container/config.toml
[network]
subnet = "192.168.100.1/24"
subnetv6 = "fd00:abcd::/64"
```

### Local DNS domains

`container` has built-in DNS. A container started with `--name my-web-server` can be resolved as `my-web-server.<domain>`.

```bash
sudo container system dns create test                       # Register the domain test
sudo container system dns create host.container.internal --localhost 203.0.113.113   # Return the host IP
container system dns list
sudo container system dns delete test
```

Notes (macOS packet filter constraints):

- Using `--localhost` **disables Private Relay**.
- Packet filter rules for local domains **disappear after a macOS reboot**.

The common pattern for accessing host-side services from containers is `host.container.internal`.

## Volumes

There are two types: named volumes and anonymous volumes. Note that anonymous volumes are not deleted even with `--rm`.

```bash
container volume create myvol                                          # Create named volume
container volume create --opt journal=ordered myvol                    # Specify ext4 journal mode
container volume create --opt journal=writeback:64m myvol              # Specify journal size too
container volume create -s 10g myvol                                   # Size
container volume create --opt size=10g myvol                           # Same; -s takes precedence

container volume ls
container volume inspect myvol
container volume rm myvol                                              # Cannot delete while in use
container volume prune                                                 # Delete all unreferenced volumes
```

Journal modes:

- `ordered` (effectively the default): journal metadata only; data is written to disk before metadata.
- `writeback`: journal metadata only; no ordering guarantees (fastest and most dangerous).
- `journal`: journal both metadata and data (safest).

## Container machines (`container machine`, alias `m`)

Use this when you want a **persistent Linux development environment**, not a container that runs a single app.

Features:

- Created from an OCI image.
- A user with the same name as the host user account is created.
- `$HOME` is mounted as-is at `/Users/<username>`.
- The filesystem remains after stopping.
- Unlike normal OCI containers, it starts `/sbin/init`, so long-running services can stay resident with `systemd`.

```bash
container machine create alpine:latest --name dev
container machine set-default dev
m run                                  # Interactive shell (default machine)
m run -n dev whoami                    # Returns the host username
m run -n dev pwd                       # /Users/<you> (the Mac $HOME is mounted as-is)
m run -n dev -- cat /proc/cpuinfo
m ls
m inspect dev
m stop dev
m rm dev                               # Delete including persistent storage
```

Update resources with `set`; changes apply from the next startup:

```bash
m set -n dev cpus=4 memory=8G
m set -n dev home-mount=ro             # ro / rw / none
m set -n dev virtualization=true kernel=/path/to/vmlinux-kvm
m set -n dev kernel=                   # Clear custom kernel
m stop dev && m run -n dev -- nproc
```

### Custom images

Any Linux image that contains `/sbin/init` can be used. On first startup, a user creation script runs automatically. If you place `/etc/machine/create-user.sh` in the image, it replaces the default provisioning. The environment variables `CONTAINER_USER`, `CONTAINER_UID`, `CONTAINER_GID`, `CONTAINER_HOME`, and `CONTAINER_MACHINE_ID` are passed to it.

```dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y dbus systemd openssh-server ...
RUN systemctl set-default multi-user.target
```

## System

```bash
container system start                  # Start service
container system stop                   # Stop service
container system status
container system version
container system logs -f                # Service logs
container system logs --last 1h
container system df                     # Disk usage for images, containers, and volumes
```

### Kernel management

`--arch` can only specify `arm64` (default) or `amd64`. Because `amd64` guests run with Rosetta, the `arm64` kernel is usually enough.

```bash
container system kernel set --recommended                   # Fetch and apply the recommended kernel
container system kernel set --tar https://.../kata.tar.zst --binary opt/kata/.../vmlinux
container system kernel set --binary ./vmlinux --arch arm64 --force
```

### System properties

List the current values from `~/.config/container/config.toml`.

```bash
container system property list                    # TOML
container system property list --format json
```

## Configuration file: `~/.config/container/config.toml`

| Section         | Main purpose                                                        |
| :-------------- | :------------------------------------------------------------------ |
| `[build]`       | Builder VM CPU / memory / Rosetta / image                           |
| `[container]`   | Default CPU and memory for `run` / `create`                         |
| `[dns]`         | `domain`, which is appended to container names                      |
| `[kernel]`      | `binaryPath` / `url` (kernel archive)                               |
| `[network]`     | Default `subnet` / `subnetv6` for new networks                      |
| `[registry]`    | Default `domain` when the registry is omitted from image references |
| `[vminit]`      | `vminitd` image                                                     |
| `[plugin.<id>]` | Plugin-specific settings                                            |

Example:

```toml
[build]
rosetta = false
cpus = 4
memory = "4gb"

[container]
cpus = 4
memory = "1gb"

[dns]
domain = "test"

[network]
subnet = "192.168.100.0/24"
subnetv6 = "fd00:abcd::/64"

[registry]
domain = "ghcr.io"
```

### Memory notation

Binary units (base 1024): `b` / `k|kb|kib` / `m|mb|mib` / `g|gb|gib` / `t|tb|tib` / `p|pb|pib`.
Bare integers are treated as bytes.

### CIDR

IPv4 example: `"192.168.100.0/24"`; IPv6 example: `"fd00:abcd::/64"`. Values are validated when loaded, and startup fails if they are invalid.

## Shell completion

```bash
container --generate-completion-script zsh > ~/.oh-my-zsh/completions/_container
container --generate-completion-script bash > /opt/homebrew/etc/bash_completion.d/container
container --generate-completion-script fish > ~/.config/fish/completions/container.fish
```

Only the zsh filename must be exactly `_container`.

## Known limitations

- **Memory is only partially returned to the host**: memory freed on the Linux side may not be returned all the way to macOS. Long-running containers can appear large in Activity Monitor. If you run many memory-intensive containers, restart periodically.
- **Anonymous volumes are not deleted by `--rm`**: delete them explicitly with `container volume rm`.
- On **macOS 15**, container-to-container communication, multi-network support, and `container network` are all unavailable.

## Quick reference

| Task                 | Command                                            |
| :------------------- | :------------------------------------------------- |
| Start / stop service | `container system start` / `container system stop` |
| Pull image           | `container image pull <ref>`                       |
| Build image          | `container build -t <name> .`                      |
| Interactive run      | `container run -it <image> /bin/sh`                |
| Background run       | `container run -d --name <name> --rm <image>`      |
| Publish port         | `container run -p 127.0.0.1:8080:80 <image>`       |
| Mount volume         | `container run -v $HOME/x:/x <image>`              |
| SSH forwarding       | `container run --ssh <image>`                      |
| Enter shell          | `container exec -it <id> sh`                       |
| Follow logs          | `container logs -f <id>`                           |
| Boot logs            | `container logs --boot <id>`                       |
| Show stats           | `container stats <id>`                             |
| Copy                 | `container cp <src> <dst>`                         |
| Stop / delete        | `container stop <id>` / `container rm <id>`        |
| Push image           | `container image push <ref>`                       |
| Registry auth        | `container registry login <host>`                  |
| Create network       | `container network create <name>`                  |
| Create DNS domain    | `sudo container system dns create <name>`          |
| Create volume        | `container volume create <name>`                   |
| Create machine       | `container machine create <image> --name <id>`     |
| Shell in machine     | `m run -n <id>`                                    |
| Disk usage           | `container system df`                              |
| Service logs         | `container system logs -f`                         |
| Check version        | `container system version`                         |
