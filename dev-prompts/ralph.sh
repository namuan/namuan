#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [max_iterations]
#        ./ralph.sh --help

set -e

show_help() {
  cat <<'EOF'
Usage: ./ralph.sh [max_iterations]
       ./ralph.sh --help

Runs Ralph Wiggum's long-lived amp loop.

Arguments:
  max_iterations  Optional number of loop iterations (defaults to 10).
  --help          Show this help message and exit.
EOF
  exit 0
}

MAX_ITERATIONS_ARG=""

while (( $# )); do
  case "$1" in
    --help|-h)
      show_help
      ;;
    *)
      if [ -z "$MAX_ITERATIONS_ARG" ]; then
        MAX_ITERATIONS_ARG="$1"
      else
        echo "Too many arguments: $1" >&2
        show_help
      fi
      ;;
  esac
  shift
done

MAX_ITERATIONS=${MAX_ITERATIONS_ARG:-10}
PROJECT_DIR="$(pwd)" # Directory where this script is running
PROGRESS_FILE="$PROJECT_DIR/progress.txt"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════════════════"
  
  # Run with the ralph prompt
  opencode --model opencode/minimax-m2.1-free run "Read the PRD at prd.json (in the same directory as this file), read existing progress files in progress/ (check AGENTS.md for patterns), start work by creating a mob branch using mob start -i -b, pick the highest priority user story where passes: false, implement that single user story, run make check to ensure your code passes all quality checks, update AGENTS.md files if you discover reusable patterns (see below), update the PRD to set passes: true for the completed story, create a progress file for the story at progress/[story-id].md, run mob next to commit your changes and move on to the next story. If all tasks done, sleep 5s and exit. NEVER GIT PUSH."
  
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
