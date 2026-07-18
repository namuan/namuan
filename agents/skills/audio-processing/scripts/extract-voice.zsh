#!/usr/bin/env zsh
# Separate the spoken voice from an audio file using Demucs with Apple GPU acceleration.
#
# Usage: ./extract-voice.zsh <input-file> [output-directory]
#
#   input-file      Path to audio file (MP3, WAV, etc.)
#   output-dir      Directory for separated stems (default: ./separated)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  print -u2 "Usage: ${0:t} <input-file> [output-directory]"
  exit 1
fi

input_file=$1
output_dir=${2:-"${input_file:h}/separated"}
cache_dir=${VOICE_EXTRACTION_CACHE_DIR:-"$HOME/.cache/voice-extraction"}

if [[ ! -f "$input_file" ]]; then
  print -u2 "Input file not found: $input_file"
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  print -u2 "This script needs uv. Install it from https://docs.astral.sh/uv/"
  exit 1
fi

mkdir -p "$output_dir" "$cache_dir"

print "Downloading Demucs on the first run, then separating vocals with Apple GPU acceleration…"
env \
  UV_CACHE_DIR="$cache_dir/uv-cache" \
  UV_TOOL_DIR="$cache_dir/uv-tools" \
  TORCH_HOME="$cache_dir/torch" \
  uv tool run --with torchcodec --from demucs demucs \
  -d mps \
  --two-stems=vocals \
  -n htdemucs \
  -o "$output_dir" \
  "$input_file"

track_name=${input_file:t:r}
print "\nDone. Voice stem: $output_dir/htdemucs/$track_name/vocals.wav"
print "Music stem:       $output_dir/htdemucs/$track_name/no_vocals.wav"
