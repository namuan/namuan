#!/usr/bin/env zsh
# Extract vocals from an audio file, then cut to a specified duration.
#
# Usage: ./extract-and-cut.zsh <input-file> <duration> [output-directory]
#
#   input-file      Path to audio file (MP3, WAV, etc.)
#   duration        Duration to keep, e.g. 30, 29.5 (seconds)
#   output-dir      Directory for outputs (default: ./separated)

set -euo pipefail

if [[ $# -lt 2 ]]; then
  print -u2 "Usage: ${0:t} <input-file> <duration> [output-directory]"
  exit 1
fi

input_file=$1
duration=$2
output_dir=${3:-"${input_file:h}/separated"}
script_dir=${0:A:h}

# Step 1: Extract vocals
print "=== Step 1: Extracting vocals ==="
"$script_dir/extract-voice.zsh" "$input_file" "$output_dir"

# Step 2: Cut to duration
track_name=${input_file:t:r}
vocals_wav="$output_dir/htdemucs/$track_name/vocals.wav"

if [[ ! -f "$vocals_wav" ]]; then
  print -u2 "Vocals file not found at $vocals_wav — extraction may have failed."
  exit 1
fi

print "\n=== Step 2: Cutting vocals to ${duration}s ==="
"$script_dir/cut-audio.zsh" "$vocals_wav" "$duration"

print "\nAll done!"
