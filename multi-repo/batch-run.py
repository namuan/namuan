#!/usr/bin/env python3

# Runs something for every subdirectory
# For example:
# ./batch-run.py git status

import subprocess
import os
import sys


if __name__ == "__main__":
    ignored_folders = [
        ".gradle",
        ".vscode",
        "snippets-lab",
    ]
    dirs = [
        d
        for d in os.listdir(".")
        if os.path.isdir(d) and d not in ignored_folders
    ]
    dirs.sort()
    for d in dirs:
        command = sys.argv[1:]
        print(
            f"📂 \033[1m{d}\033[0m > Executing " + " ".join(command), flush=True
        )
        subprocess.call(command, cwd=d, shell=True)
