#!/usr/bin/env zsh

cd "$HOME"/workspace || exit
./namuan/multi-repo/batch-run.py "git status | grep modified && idea . && echo 'Press ENTER to continue' && read"