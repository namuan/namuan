#!/bin/bash

# Options
DRY_RUN=0
PRUNE=0

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    --prune|-p)   PRUNE=1  ;;
  esac
done

if [ $DRY_RUN -eq 1 ]; then
  echo "DRY RUN MODE - no changes will be made"
  echo ""
fi

# Determine script location regardless of where it's invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the source and target directories
SOURCE_DIR="$SCRIPT_DIR/skills"
TARGET_DIR="$HOME/.agents/skills"
PROMPTS_SOURCE_DIR="$SCRIPT_DIR/prompts"
PROMPTS_TARGET_DIR="$HOME/Library/Application Support/Code/User/prompts"
OPENCODE_COMMANDS_TARGET_DIR="$HOME/.config/opencode/commands"

# Create the target directory if it doesn't exist
if [ $DRY_RUN -eq 0 ]; then
  mkdir -p "$TARGET_DIR"
  mkdir -p "$PROMPTS_TARGET_DIR"
  mkdir -p "$OPENCODE_COMMANDS_TARGET_DIR"
else
  echo "Would create directories:"
  echo "  $TARGET_DIR"
  echo "  $PROMPTS_TARGET_DIR"
  echo "  $OPENCODE_COMMANDS_TARGET_DIR"
fi

# Process skills (symlink directories)
for SKILL in "$SOURCE_DIR"/*; do
  if [ -d "$SKILL" ]; then
    SKILL_NAME=$(basename "$SKILL")
    TARGET_PATH="$TARGET_DIR/$SKILL_NAME"

    if [ $DRY_RUN -eq 0 ]; then
      # Remove existing symlink or directory if it exists
      if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
        rm -rf "$TARGET_PATH"
      fi
      # Create the symlink
      ln -s "$SKILL" "$TARGET_PATH"
      echo "Symlinked $SKILL to $TARGET_PATH"
    else
      echo "Would symlink: $SKILL -> $TARGET_PATH"
      if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
        echo "  (would remove existing at $TARGET_PATH)"
      fi
    fi
  fi
done

# Process prompts recursively (copy files with folder prefix)
# Use find to get all files, then process them
while IFS= read -r -d '' FILE; do
  # Get relative path from prompts source directory
  REL_PATH="${FILE#$PROMPTS_SOURCE_DIR/}"
  
  # Determine the target filename
  if [[ "$REL_PATH" == */* ]]; then
    # File is in a subdirectory - prepend folder name(s)
    # Convert path separators to underscores, preserving extension
    DIR_PREFIX=$(dirname "$REL_PATH" | tr '/' '_')
    BASENAME=$(basename "$REL_PATH")
    TARGET_NAME="${DIR_PREFIX}-${BASENAME}"
  else
    # File is at top level
    TARGET_NAME="$REL_PATH"
  fi
  
  TARGET_FILE="$PROMPTS_TARGET_DIR/$TARGET_NAME"
  
  if [ $DRY_RUN -eq 0 ]; then
    # Remove existing file if it exists
    if [ -e "$TARGET_FILE" ] || [ -L "$TARGET_FILE" ]; then
      rm -f "$TARGET_FILE"
    fi
    # Create the symlink
    ln -s "$FILE" "$TARGET_FILE"
    echo "Symlinked $FILE to $TARGET_FILE"
  else
    echo "Would symlink: $FILE -> $TARGET_FILE"
    if [ -e "$TARGET_FILE" ] || [ -L "$TARGET_FILE" ]; then
      echo "  (would remove existing at $TARGET_FILE)"
    fi
  fi
done < <(find "$PROMPTS_SOURCE_DIR" -type f -print0)

# Same symlink to opencode commands
while IFS= read -r -d '' FILE; do
  REL_PATH="${FILE#$PROMPTS_SOURCE_DIR/}"

  if [[ "$REL_PATH" == */* ]]; then
    DIR_PREFIX=$(dirname "$REL_PATH" | tr '/' '_')
    BASENAME=$(basename "$REL_PATH")
    TARGET_NAME="${DIR_PREFIX}-${BASENAME}"
  else
    TARGET_NAME="$REL_PATH"
  fi

  TARGET_FILE="$OPENCODE_COMMANDS_TARGET_DIR/$TARGET_NAME"

  if [ $DRY_RUN -eq 0 ]; then
    if [ -e "$TARGET_FILE" ] || [ -L "$TARGET_FILE" ]; then
      rm -f "$TARGET_FILE"
    fi
    ln -s "$FILE" "$TARGET_FILE"
    echo "Symlinked $FILE to $TARGET_FILE"
  else
    echo "Would symlink: $FILE -> $TARGET_FILE"
    if [ -e "$TARGET_FILE" ] || [ -L "$TARGET_FILE" ]; then
      echo "  (would remove existing at $TARGET_FILE)"
    fi
  fi
done < <(find "$PROMPTS_SOURCE_DIR" -type f -print0)

# ── Prune orphaned symlinks ───────────────────────────────────────────────
prune_orphans() {
  local target_dir="$1"
  echo ""
  echo "Pruning orphans in $target_dir ..."
  for entry in "$target_dir"/*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    if [ -L "$entry" ] && [ ! -e "$entry" ]; then
      local name
      name=$(basename "$entry")
      if [ $DRY_RUN -eq 0 ]; then
        rm -f "$entry"
        echo "  Removed broken symlink: $name"
      else
        echo "  Would remove broken symlink: $name"
      fi
    fi
  done
}

if [ $PRUNE -eq 1 ]; then
  prune_orphans "$TARGET_DIR"
  prune_orphans "$PROMPTS_TARGET_DIR"
  prune_orphans "$OPENCODE_COMMANDS_TARGET_DIR"
fi

# Print completion message (only if not dry run)
if [ $DRY_RUN -eq 0 ]; then
  echo "All top-level folders in $SOURCE_DIR have been symlinked to $TARGET_DIR."
  echo "All files in $PROMPTS_SOURCE_DIR have been symlinked to $PROMPTS_TARGET_DIR and $OPENCODE_COMMANDS_TARGET_DIR."
else
  echo ""
  echo "Dry run complete. Run without --dry-run to execute changes."
fi