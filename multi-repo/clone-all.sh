#!/usr/bin/env zsh

cd "$HOME"/workspace || exit

curl -s https://api.github.com/users/namuan/repos\?per_page\=100 | jq -r ".[].ssh_url" | while read -r line; do
    repo_name=$(basename "$line" ".git")
    if test ! -d "$repo_name"; then
        git clone "$line"
    fi
done
