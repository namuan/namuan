#!/usr/bin/env zsh
# Cut/trim an audio file to a specified duration using ffmpeg.
#
# Usage: ./cut-audio.zsh <input-file> <duration> [output-file]
#
#   input-file   Path to audio file (WAV, MP3, etc.)
#   duration     Duration to keep, e.g. 30, 29.5, 1:30 (ffmpeg -t format)
#   output-file  Output path (default: <input-name>_<duration>s.wav)

set -euo pipefail

if [[ $# -lt 2 ]]; then
  print -u2 "Usage: ${0:t} <input-file> <duration> [output-file]"
  exit 1
fi

input_file=$1
duration=$2
output_file=${3:-"${input_file:r}_${duration}s.${input_file:e}"}

if [[ ! -f "$input_file" ]]; then
  print -u2 "Input file not found: $input_file"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  print -u2 "This script needs ffmpeg. Install it with: brew install ffmpeg"
  exit 1
fi

# Re-encode for exact duration (stream copy may overshoot with PCM)
ffmpeg -i "$input_file" -t "$duration" -acodec pcm_s16le -ar 44100 -ac 2 -y "$output_file"

orig_dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input_file" 2>/dev/null || echo "?")
new_dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$output_file" 2>/dev/null || echo "?")

print "Cut ${orig_dur}s → ${new_dur}s: $output_file"
