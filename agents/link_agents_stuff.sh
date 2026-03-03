#!/bin/bash

# Dry run option
DRY_RUN=0
if [[ "$1" == "--dry-run" ]] || [[ "$1" == "-n" ]]; then
  DRY_RUN=1
  echo "DRY RUN MODE - no changes will be made"
  echo ""
fi

# Define the source and target directories
SOURCE_DIR="$(pwd)/skills"
TARGET_DIR="$HOME/.agents/skills"
PROMPTS_SOURCE_DIR="$(pwd)/prompts"
PROMPTS_TARGET_DIR="$HOME/Library/Application Support/Code/User/prompts"

# Create the target directory if it doesn't exist
if [ $DRY_RUN -eq 0 ]; then
  mkdir -p "$TARGET_DIR"
  mkdir -p "$PROMPTS_TARGET_DIR"
else
  echo "Would create directories:"
  echo "  $TARGET_DIR"
  echo "  $PROMPTS_TARGET_DIR"
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
    # Copy the file
    cp "$FILE" "$TARGET_FILE"
    echo "Copied $FILE to $TARGET_FILE"
  else
    echo "Would copy: $FILE -> $TARGET_FILE"
    if [ -e "$TARGET_FILE" ] || [ -L "$TARGET_FILE" ]; then
      echo "  (would remove existing at $TARGET_FILE)"
    fi
  fi
done < <(find "$PROMPTS_SOURCE_DIR" -type f -print0)

# Print completion message (only if not dry run)
if [ $DRY_RUN -eq 0 ]; then
  echo "All top-level folders in $SOURCE_DIR have been symlinked to $TARGET_DIR."
  echo "All files in $PROMPTS_SOURCE_DIR have been copied to $PROMPTS_TARGET_DIR."
else
  echo ""
  echo "Dry run complete. Run without --dry-run to execute changes."
fi