#!/usr/bin/env sh

# Detect local repos that no longer exist on GitHub and optionally mark them.
# Identifies repos by reading remote.origin.url from .git/config
# (so local directory renames are handled correctly).
# POSIX-sh compatible.
set -eu

# GitHub username
: "${GITHUB_USER:=namuan}"

# Scan directory (default: ~/workspace)
: "${SCAN_DIR:=$HOME/workspace}"

# Set to 1 to create .removed-from-github marker files inside orphaned repos
: "${MARK_REMOVED:=0}"

cd "$SCAN_DIR" || { printf '%s\n' "failed to cd to $SCAN_DIR" >&2; exit 1; }

# dependencies
for cmd in curl jq git; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        printf 'error: %s is required but not installed\n' "$cmd" >&2
        exit 2
    fi
done

# Temporary file to store GitHub-side repo names
github_list=$(mktemp)
trap 'rm -f "$github_list"' EXIT

# Fetch all repo names from GitHub (handle pagination)
printf 'Fetching repo list from GitHub for user "%s"...\n' "$GITHUB_USER"
page=1
while true; do
    page_file=$(mktemp)
    http_code=$(curl -fsS -w '%{http_code}' -o "$page_file" \
        --location "https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}")

    if [ "$http_code" != "200" ]; then
        printf 'error: GitHub API returned HTTP %s\n' "$http_code" >&2
        rm -f "$page_file"
        exit 3
    fi

    count=$(jq 'length' < "$page_file")
    if [ "$count" -eq 0 ]; then
        rm -f "$page_file"
        break
    fi

    jq -r '.[].name' < "$page_file" >> "$github_list"
    rm -f "$page_file"
    page=$((page + 1))
done

sort -o "$github_list" "$github_list"
github_count=$(wc -l < "$github_list" | tr -d ' ')
printf 'Found %s repos on GitHub.\n' "$github_count"

# Scan local repos and identify orphans by remote URL
orphans=$(mktemp)
trap 'rm -f "$github_list" "$orphans"' EXIT

local_count=0
orphan_count=0

for dir in */; do
    dir_name=${dir%/}
    git_config="$dir_name/.git/config"
    [ -f "$git_config" ] || continue

    # Extract remote.origin.url from git config
    remote_url=$(git config --file "$git_config" --get remote.origin.url 2>/dev/null) || continue
    [ -n "$remote_url" ] || continue

    # Extract repo name from URL (handles both ssh and https)
    repo_name=$(basename "$remote_url" .git)
    local_count=$((local_count + 1))

    # Check if this repo name exists on GitHub
    if ! grep -qxF "$repo_name" "$github_list"; then
        printf '%s\t%s\n' "$dir_name" "$repo_name" >> "$orphans"
        orphan_count=$((orphan_count + 1))
    fi
done

printf 'Found %s local git repos in %s.\n' "$local_count" "$SCAN_DIR"

# Report and optionally mark orphaned repos
if [ -s "$orphans" ]; then
    printf '\n=== %s repo(s) present locally but NOT on GitHub ===\n' "$orphan_count"
    while IFS="$(printf '\t')" read -r dir_name repo_name; do
        printf '  - %s/%s (remote: %s)\n' "$SCAN_DIR" "$dir_name" "$repo_name"
        if [ "$MARK_REMOVED" = "1" ]; then
            marker_file="$dir_name/.removed-from-github"
            if [ ! -f "$marker_file" ]; then
                date '+%Y-%m-%d %H:%M:%S' > "$marker_file"
                printf '    -> marked with %s\n' "$marker_file"
            else
                printf '    -> already marked (%s exists)\n' "$marker_file"
            fi
        fi
    done < "$orphans"
    printf '=====================================================\n'
    if [ "$MARK_REMOVED" != "1" ]; then
        printf '\nTip: set MARK_REMOVED=1 to create .removed-from-github marker files.\n'
    fi
else
    printf '\nNo orphaned local repos found.\n'
fi
