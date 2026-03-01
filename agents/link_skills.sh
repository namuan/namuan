#!/bin/bash

# Define the source and target directories
SOURCE_DIR="$(pwd)/skills"
TARGET_DIR="$HOME/.agents/skills"

# Create the target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Loop through each top-level folder in the source directory and create a symlink
for SKILL in "$SOURCE_DIR"/*; do
  if [ -d "$SKILL" ]; then
    SKILL_NAME=$(basename "$SKILL")
    TARGET_PATH="$TARGET_DIR/$SKILL_NAME"

    # Remove existing symlink or directory if it exists
    if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
      rm -rf "$TARGET_PATH"
    fi

    # Create the symlink
    ln -s "$SKILL" "$TARGET_PATH"
    echo "Symlinked $SKILL to $TARGET_PATH"
  fi
done

# Print completion message
echo "All top-level folders in $SOURCE_DIR have been symlinked to $TARGET_DIR."