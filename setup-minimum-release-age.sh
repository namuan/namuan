#!/usr/bin/env bash
# setup-minimum-release-age.sh
#
# Configures "minimum release age" globally for pnpm, yarn berry, bun, deno, and uv.
#
# This reduces supply-chain-attack risk by refusing to install package versions
# that were published too recently.  Most malicious versions are removed from
# registries within an hour; a 1-week (10080-minute) delay provides a solid
# safety margin while barely affecting normal workflows.
#
# References
#   pnpm  : https://github.com/pnpm/pnpm (built-in setting)
#   yarn  : https://github.com/yarnpkg/berry/releases/tag/%40yarnpkg%2Fcli%2F4.10.0
#   bun   : https://bun.com/blog/bun-v1.3#minimum-release-age
#   deno  : https://deno.com/blog/v2.6#controlling-dependency-stability
#   uv    : https://github.com/astral-sh/uv/releases/tag/0.9.17

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
# Override via environment variable if desired, e.g.:
#   AGE_MINUTES=60 ./setup-minimum-release-age.sh
AGE_MINUTES="${AGE_MINUTES:-10080}"  # 1 week

# Derived values
AGE_SECONDS=$(( AGE_MINUTES * 60 ))

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { printf '  ✓ %s\n' "$*"; }
skip() { printf '  – %s\n' "$*"; }
warn() { printf '  ⚠ %s\n' "$*"; }

# Append or update a key=value line in a TOML/INI file.
# Usage: upsert_toml_key FILE SECTION KEY VALUE
# If SECTION is empty the key is written at the top level.
upsert_toml_key() {
  local file="$1" section="$2" key="$3" value="$4"
  mkdir -p "$(dirname "$file")"
  touch "$file"

  if [[ -n "$section" ]]; then
    # Does the section header already exist?
    if grep -qF "[$section]" "$file"; then
      # Does the key already exist inside the section?
      if grep -qE "^${key}\s*=" "$file"; then
        sed -i.bak -E "s|^(${key}\s*=).*|\1 ${value}|" "$file"
      else
        # Insert after the section header
        sed -i.bak "/^\[${section}\]/a\\
${key} = ${value}" "$file"
      fi
    else
      # Append a new section block
      printf '\n[%s]\n%s = %s\n' "$section" "$key" "$value" >> "$file"
    fi
  else
    # Top-level key
    if grep -qE "^${key}\s*=" "$file"; then
      sed -i.bak -E "s|^(${key}\s*=).*|\1 ${value}|" "$file"
    else
      printf '%s = %s\n' "$key" "$value" >> "$file"
    fi
  fi
  rm -f "${file}.bak"
}

# ── pnpm ─────────────────────────────────────────────────────────────────────
# Global config: ~/.config/pnpm/rc (written by `pnpm config set --global`)
# Unit: minutes
configure_pnpm() {
  if ! command -v pnpm &>/dev/null; then skip "pnpm not found, skipping"; return; fi

  pnpm config set minimumReleaseAge "$AGE_MINUTES" --global
  log "pnpm: minimumReleaseAge = ${AGE_MINUTES} minutes"
}

# ── yarn berry ────────────────────────────────────────────────────────────────
# Requires yarn berry (v2+).  Global config: ~/.yarnrc.yml
# npmMinimalAgeGate  – refuses to install versions published less than N minutes ago
# npmPreapprovedPackages – list of package names exempt from the gate
# Unit: minutes
configure_yarn() {
  if ! command -v yarn &>/dev/null; then skip "yarn not found, skipping"; return; fi

  local major
  major=$(yarn --version 2>/dev/null | cut -d. -f1)
  if [[ "$major" -lt 2 ]]; then
    warn "yarn v1 (classic) detected — npmMinimalAgeGate is only available in yarn berry (v2+)"
    return
  fi

  yarn config set npmMinimalAgeGate "$AGE_MINUTES" --home
  log "yarn berry: npmMinimalAgeGate = ${AGE_MINUTES} minutes  (~/.yarnrc.yml)"
}

# ── bun ───────────────────────────────────────────────────────────────────────
# Global config: ~/.bunfig.toml
# Unit: seconds  (604800 = 7 days in bun's own example)
configure_bun() {
  if ! command -v bun &>/dev/null; then skip "bun not found, skipping"; return; fi

  upsert_toml_key "$HOME/.bunfig.toml" "install" "minimumReleaseAge" "$AGE_SECONDS"
  log "bun: minimumReleaseAge = ${AGE_SECONDS} seconds (${AGE_MINUTES} minutes)  (~/.bunfig.toml)"
}

# ── deno ──────────────────────────────────────────────────────────────────────
# minimumDependencyAge in deno.json is PROJECT-SCOPED; there is no global config.
# deno v2.6+ accepts minutes (as a bare number string), ISO-8601 durations like
# "P1D", or RFC3339 absolute timestamps.
#
# This function creates ~/.config/deno/deno.json as a *template* you can copy
# (or symlink) into new projects.  The CLI flag alternative is:
#   deno install --minimum-dependency-age=<minutes>
configure_deno() {
  if ! command -v deno &>/dev/null; then skip "deno not found, skipping"; return; fi

  local template_dir="$HOME/.config/deno"
  local template="$template_dir/deno.json"
  mkdir -p "$template_dir"

  # Use python3 to merge JSON so we preserve any existing keys.
  python3 - <<PYEOF
import json
path = "$template"
cfg = {}
try:
    with open(path) as f:
        cfg = json.load(f)
except Exception:
    pass
cfg["minimumDependencyAge"] = "$AGE_MINUTES"
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
PYEOF

  log "deno: minimumDependencyAge = ${AGE_MINUTES} minutes  (~/.config/deno/deno.json)"
  warn "deno setting is PER-PROJECT — copy ~/.config/deno/deno.json into each project, or use:"
  warn "  deno install --minimum-dependency-age=${AGE_MINUTES}"
}

# ── uv ────────────────────────────────────────────────────────────────────────
# Global config: ~/.config/uv/uv.toml  (Linux / macOS)
# uv 0.9.17 added relative-duration support to exclude-newer ("dependency cooldowns").
# A relative value like "-1440m" means "packages uploaded in the last 1440 minutes".
# Unit: relative duration string  (e.g. "-1440m", "-1d", "-24h")
configure_uv() {
  if ! command -v uv &>/dev/null; then skip "uv not found, skipping"; return; fi

  local uv_config="$HOME/.config/uv/uv.toml"
  upsert_toml_key "$uv_config" "" "exclude-newer" "\"-${AGE_MINUTES}m\""
  log "uv: exclude-newer = \"-${AGE_MINUTES}m\"  (~/.config/uv/uv.toml)"
}

# ── main ─────────────────────────────────────────────────────────────────────
main() {
  printf '\n=== Minimum Release Age — %d minutes (%d days) ===\n\n' \
    "$AGE_MINUTES" $(( AGE_MINUTES / 1440 ))

  configure_pnpm
  configure_yarn
  configure_bun
  configure_deno
  configure_uv

  printf '\nDone.\n'
}

main
