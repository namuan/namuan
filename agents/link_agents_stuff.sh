#!/bin/bash

# Define the source and target directories
SOURCE_DIR="$(pwd)/skills"
TARGET_DIR="$HOME/.agents/skills"
PROMPTS_SOURCE_DIR="$(pwd)/prompts"
PROMPTS_TARGET_DIR="$HOME/Library/Application Support/Code/User/prompts"

# Create the target directory if it doesn't exist
mkdir -p "$TARGET_DIR"
mkdir -p "$PROMPTS_TARGET_DIR"

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

# Loop through each file in the prompts source directory and create a symlink
for PROMPT in "$PROMPTS_SOURCE_DIR"/*; do
  if [ -f "$PROMPT" ]; then
    PROMPT_NAME=$(basename "$PROMPT")
    TARGET_PROMPT_PATH="$PROMPTS_TARGET_DIR/$PROMPT_NAME"

    # Remove existing symlink or file if it exists
    if [ -e "$TARGET_PROMPT_PATH" ] || [ -L "$TARGET_PROMPT_PATH" ]; then
      rm -f "$TARGET_PROMPT_PATH"
    fi

    # Create the symlink
    ln -s "$PROMPT" "$TARGET_PROMPT_PATH"
    echo "Symlinked $PROMPT to $TARGET_PROMPT_PATH"
  fi
done

# Print completion message
echo "All top-level folders in $SOURCE_DIR have been symlinked to $TARGET_DIR."
echo "All files in $PROMPTS_SOURCE_DIR have been symlinked to $PROMPTS_TARGET_DIR."