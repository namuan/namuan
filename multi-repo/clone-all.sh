#!/usr/bin/env sh

# POSIX-sh compatible. Does not require zsh.
set -eu

# Parse arguments
use_https=false
while [ $# -gt 0 ]; do
    case $1 in
        --use-https) use_https=true ;;
        *) printf 'Unknown option: %s\n' "$1" >&2; exit 1 ;;
    esac
    shift
done

# Set URL field based on flag (default: ssh_url)
if [ "$use_https" = true ]; then
    url_field='clone_url'
else
    url_field='ssh_url'
fi

# destination directory (optional override): DEST_DIR or default to ~/workspace
: "${DEST_DIR:=$HOME/workspace}"

cd "$DEST_DIR" || { printf '%s\n' "failed to cd to $DEST_DIR" >&2; exit 1; }

# dependencies
if ! command -v jq >/dev/null 2>&1; then
    printf 'error: jq is required but not installed\n' >&2
    exit 2
fi
if ! command -v git >/dev/null 2>&1; then
    printf 'error: git is required but not installed\n' >&2
    exit 2
fi

# fetch repos and clone if missing
curl -fsS --location "https://api.github.com/users/namuan/repos?per_page=100" \
  | jq -r ".[].${url_field}" \
  | while IFS= read -r line; do
      repo_name=$(basename "$line" .git)
      if [ ! -d "$repo_name" ]; then
          git clone "$line" || printf 'warning: clone failed for %s\n' "$line" >&2
      fi
  done
