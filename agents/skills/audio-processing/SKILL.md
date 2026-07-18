---
name: audio-processing
description: Extract vocals from audio files using Demucs with Apple GPU acceleration, and cut/trim audio to a specified duration. Use when the user asks to: (1) separate or extract vocals/voice from music, (2) remove vocals from a song, (3) cut or trim an audio file to a shorter length, (4) extract vocals AND trim them in one step. Handles MP3, WAV, and other common formats. Requires macOS with Apple Silicon (M-series) for GPU acceleration and the `uv` tool.
---

# Audio Processing

Three scripts are provided in `scripts/`. All accept inputs via arguments — run any script with no arguments to see usage.

## Scripts

### `extract-voice.zsh`
Separate vocals from music using Demucs (htdemucs model) with MPS GPU acceleration.

```bash
scripts/extract-voice.zsh <input-file> [output-directory]
```

Outputs `vocals.wav` and `no_vocals.wav` under `output-dir/htdemucs/<track-name>/`.

### `cut-audio.zsh`
Trim an audio file to an exact duration using ffmpeg (re-encodes for sample-accurate cuts).

```bash
scripts/cut-audio.zsh <input-file> <duration> [output-file]
```

Duration accepts any ffmpeg `-t` format: `30`, `29.5`, `1:30`, etc.

### `extract-and-cut.zsh`
Run both steps — extract vocals then cut to duration.

```bash
scripts/extract-and-cut.zsh <input-file> <duration> [output-directory]
```

Use this when the user wants the final trimmed vocal stem in one command.

## Requirements

- **macOS with Apple Silicon** (M1/M2/M3/M4) — uses `-d mps` for GPU acceleration
- **`uv`** — install from https://docs.astral.sh/uv/
- **`ffmpeg`** — for cutting: `brew install ffmpeg`

Demucs and its dependencies (PyTorch, torchcodec) are auto-installed by `uv` on first run and cached under `~/.cache/voice-extraction/`. Override with `VOICE_EXTRACTION_CACHE_DIR` env var.
