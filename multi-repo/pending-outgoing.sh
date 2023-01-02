#!/usr/bin/env zsh

# git alias outgoing "log --abbrev-commit --graph @{u}.."

cd $HOME/workspace
./namuan/multi-repo/batch-run.py "git --no-pager outgoing | grep commit && idea . && echo 'Press ENTER to continue' && read"
