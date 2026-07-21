---
name: mlx-swift
description: Development and debugging guide for MLX Swift apps on Apple Silicon. Use when building, debugging, or troubleshooting apps that depend on mlx-swift, speech-swift, or any MLX-based inference (TTS, ASR, LLM). Covers metallib compilation, cache management, tokenizer issues, silent crashes, threading, and memory diagnosis.
---

# MLX Swift — Development & Debugging

Hard-won knowledge from building and shipping an MLX Swift application on
Apple Silicon.

## When to Use This Skill

- App crashes silently with no crash report during MLX inference
- Model download hangs or is "stuck" at a percentage
- `IndexTTS2TokenizerError` / SentencePiece Viterbi failures
- MLX "Failed to load the default metallib" errors
- App freezes UI during GPU work
- Cache issues with HuggingFace Hub model files
- Memory (OOM) kills during inference

---

## 1. Metallib — Always Required

**The #1 silent crash cause.**

MLX requires a pre-compiled Metal shader library (`mlx.metallib`) next to
the binary. Without it the process dies with no crash report.

### Diagnosis

Run the binary and check stderr:

```bash
./.build/debug/MyApp 2>&1 | grep -i metallib
# "Failed to load the default metallib" → it's missing
```

### DO — Build the metallib

```bash
KERNELS_DIR=".build/checkouts/mlx-swift/Source/Cmlx/mlx/mlx/backend/metal/kernels"
TMP=$(mktemp -d)

# Compile each .metal shader to .air
find "$KERNELS_DIR" -name '*.metal' ! -name '*_nax.metal' | sort | while read src; do
    key=$(echo "$src" | shasum -a 256 | cut -c1-16)
    xcrun -sdk macosx metal -x metal -c "$src" \
        -I"$KERNELS_DIR" \
        -I".build/checkouts/mlx-swift/Source/Cmlx/mlx" \
        -o "$TMP/$key.air"
done

# Link .air files into .metallib
xcrun -sdk macosx metallib "$TMP"/*.air -o .build/debug/mlx.metallib
rm -rf "$TMP"
```

Or use the speech-swift helper:

```bash
BUILD_DIR="$(pwd)/.build" \
  bash .build/checkouts/speech-swift/scripts/build_mlx_metallib.sh debug
```

### DO — Ship the metallib with the app

The `.metallib` must live **in the same directory as the binary**:

```
MyApp.app/Contents/MacOS/
├── MyApp           ← Mach-O binary
└── mlx.metallib    ← 107 MB, 33 shaders
```

In `install.command`, after `swift build`:

```bash
cp .build/release/mlx.metallib "$DEST_APP/Contents/MacOS/mlx.metallib"
```

### DON'T

- Skip the metallib step because "it works in Xcode" (Xcode auto-builds it)
- Copy the metallib to a path that matches the executable name (overwrites the binary)
- Assume the AGENTS.md "~5x slower with JIT" note means it'll work — it often crashes

---

## 2. HuggingFace Hub Stale Locks

**Truly infinite hang — zero network, zero CPU.**

The HuggingFace downloader uses per-blob lock files. When a process is
killed mid-download, locks leak. The next `fromPretrained()` call waits
forever on a lock that will never release.

### Diagnosis

```bash
# Find the PID holding the lock
lsof -p <pid> 2>/dev/null | grep lock

# Find stale locks (no matching blob)
for f in ~/.cache/huggingface/hub/.locks/models--*/blobs/*.lock; do
    blob=$(dirname $(dirname $(dirname "$f")))/blobs/$(basename "$f" .lock)
    [ ! -f "$blob" ] && echo "STALE: $f"
done
```

Also check: process alive but `lsof -p <pid> -i` shows zero network connections.

### DO — Clear stale locks before every download

```swift
func clearStaleLocks() {
    let lockDir = cacheURL
        .appendingPathComponent("huggingface/hub/.locks/models--{org}--{repo}/blobs")
    let blobsDir = lockDir
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("blobs")

    for lockName in (try? FileManager.default.contentsOfDirectory(atPath: lockDir.path)) ?? [] {
        guard lockName.hasSuffix(".lock") else { continue }
        let blobName = String(lockName.dropLast(5))
        if !FileManager.default.fileExists(atPath: blobsDir.appendingPathComponent(blobName).path) {
            try? FileManager.default.removeItem(atPath: lockDir.appendingPathComponent(lockName).path)
        }
    }
}
```

### DO — Expose a "Clear Cache & Retry" button

Nuke all caches for the model:

```swift
func clearCache() {
    let paths = [
        cacheDir.appendingPathComponent("huggingface/hub/models--{org}--{repo}"),
        cacheDir.appendingPathComponent("huggingface/hub/.locks/models--{org}--{repo}"),
        cacheDir.appendingPathComponent("qwen3-speech/models/{org}/{repo}"),
    ]
    for path in paths where FileManager.default.fileExists(atPath: path.path) {
        try? FileManager.default.removeItem(at: path)
    }
}
```

### DON'T

- Show an indefinite spinner with no "retry" path
- Assume a stuck download will recover on its own

---

## 3. HF Hub Cache — Two Formats

There are **two** cache locations with **different** structures:

| Cache | Path | Format |
|-------|------|--------|
| Download cache | `~/Library/Caches/qwen3-speech/models/{org}/{repo}/` | Flat files |
| HF hub cache | `~/.cache/huggingface/hub/models--{org}--{repo}/` | Content-addressed blobs |

`fromPretrained()` checks the HF hub cache first. `fromBundle()` skips
both and loads directly.

### DO — Use fromBundle() for CI and smoke tests

```swift
let bundleDir = URL(filePath: "~/Library/Caches/qwen3-speech/models/aufklarer/IndexTTS2-MLX-fp16")
let model = try await IndexTTS2TTSModel.fromBundle(bundleDir)
```

No network. Loads in milliseconds. No lock issues.

### DO — Populate BOTH caches if pre-downloading

```bash
# Flat app cache (fromPretrained writes here)
SRC=/path/to/downloaded/bundle
DST=~/Library/Caches/qwen3-speech/models/aufklarer/IndexTTS2-MLX-fp16
rm -rf "$DST" && cp -R "$SRC" "$DST"

# Standard HF hub cache (fromPretrained checks here first)
REVISION=$(jq -r '.source_revision' "$SRC/soniqo_manifest.json")
HUB=~/.cache/huggingface/hub/models--aufklarer--IndexTTS2-MLX-fp16
mkdir -p "$HUB"/{blobs,snapshots,refs}
echo "$REVISION" > "$HUB/refs/main"

find "$SRC" -type f | while read f; do
    rel="${f#$SRC/}"
    hash=$(shasum -a 256 "$f" | cut -d' ' -f1)
    cp "$f" "$HUB/blobs/$hash"
    mkdir -p "$(dirname "$HUB/snapshots/$REVISION/$rel")"
    ln -sf "../../../blobs/$hash" "$HUB/snapshots/$REVISION/$rel"
done
```

---

## 4. SentencePiece Tokenizer Punctuation

The IndexTTS2 SentencePiece model uppercases text and joins words with `▁`
before Viterbi encoding. Characters like `!`, `.`, `?` may not exist in the
vocabulary → `IndexTTS2TokenizerError.unencodableText`.

### DO — Strip trailing punctuation

```swift
let cleaned = text
    .trimmingCharacters(in: .punctuationCharacters)
    .trimmingCharacters(in: .whitespacesAndNewlines)
guard !cleaned.isEmpty else { /* handle */ }
```

### DO — Normalize input text

- Uppercase is applied by the tokenizer (no need to pre-uppercase)
- Limit to 2,048 Unicode scalars
- Chinese text needs the upstream normalizer (not yet ported)

### DON'T

- Pass raw user input with punctuation directly to the tokenizer
- Assume all ASCII characters are in the vocabulary

---

## 5. MLX GPU Work Must Be Off MainActor

`model.generate()` is `async` but the GPU work is synchronous. Running it
on `@MainActor` freezes the UI and risks watchdog kills.

### DO — Use Task.detached

```swift
let samples: [Float] = try await Task.detached { [model] in
    return try await model.generate(
        text: cleanedText,
        referenceAudio: refURL,
        emotionControl: emotion,
        synthesisOptions: options)
}.value
```

The model is `@unchecked Sendable` — safe to capture in a detached task
because internal state isn't mutated during inference.

### DON'T

- Call `model.generate()` directly from a SwiftUI `Button` action closure
  without `Task.detached`
- Assume `async` means "non-blocking GPU work"

---

## 6. Logging for Silent Crashes

When the process is killed (SIGKILL, abort()), async log queues lose the
most important entries — the ones right before the crash.

### DO — Sync-log at critical checkpoints

```swift
/// Writes AND fsyncs immediately. Use only before operations that may crash.
func LogSync(_ message: String) {
    queue.sync {
        fileHandle?.write(data)
        fileHandle?.synchronizeFile()  // flush to disk NOW
    }
}
```

Instrument the pipeline between EVERY sub-step:

```swift
LogSync("→ 1/6: text tokenized")
LogSync("→ 2/6: runtime loaded")
LogSync("→ 3/6: reference conditioning…")
FlushLogs()  // ensure async entries from steps 1-2 are on disk
// … run the heavy operation …
LogSync("→ 3/6: conditioning done")
```

### DO — Track memory at key points

```swift
func MemoryLog(_ label: String) {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / 4)
    let kr = withUnsafeMutablePointer(to: &info) {
        $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
            task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
        }
    }
    let rssMB = kr == KERN_SUCCESS ? Int(info.resident_size) / 1048576 : -1
    LogSync("\(label) — RSS: \(rssMB) MB")
}
```

### DO — File-based rolling logger for diagnosis

```
~/Library/Logs/IndexTTS2Demo/
├── app.log       ← current (500 KB max)
├── app.1.log     ← rotated
├── app.2.log
└── app.3.log     ← oldest (keeps last 5 files)
```

### DON'T

- Use only `os_log` / `print` — they're lost on crash
- Rely on async log queues to capture the pre-crash state

---

## 7. Memory Reference

IndexTTS2 (1.5B-class FP16) on Apple Silicon:

| Stage | RSS | Notes |
|-------|-----|-------|
| App launch | ~22 MB | Empty SwiftUI shell |
| Model loaded | ~26 MB | Weights stay on GPU, not RSS |
| During synthesis | ~475 MB | Active MLX tensors in working memory |
| GPU memory (weights) | ~4.8 GB | `memoryFootprint` reported by model |
| **Total peak** | **~5.3 GB** | Comfortable on 16 GB+, risky on 8 GB |

Reference audio is clamped to 15 seconds internally.

### DO

- Use a short reference clip (3-10 seconds ideal)
- Warn the user if `PhysicalMemory - currentRSS < 6 GB`
- Consider INT8 variants for memory-constrained devices

### DON'T

- Assume a 5 MB WAV file means 5 MB of memory usage
- Process long reference audio without checking available RAM

---

## 8. SPM Asset / Binary Collisions

SPM places executables directly in `.build/debug/` or `.build/release/`
— no subdirectory. If you copy a file named `MyApp` into that directory,
it overwrites the binary.

### DO — Use distinct filenames for assets

```bash
# ✓ Correct
cp mlx.metallib .build/debug/mlx.metallib

# ✗ Wrong — overwrites the Mach-O binary
cp mlx.metallib .build/debug/MyApp
```

### Diagnosis

```bash
file .build/debug/MyApp
# "Mach-O 64-bit executable" ← correct binary
# "MetalLib executable"       ← you copied the metallib here
```

---

## 9. install.command Checklist

Every `install.command` for an MLX app must:

```
1. swift build -c release        ← compile Swift code
2. Build mlx.metallib            ← compile 33 Metal shaders (107 MB)
3. Create .app bundle            ← Info.plist + entitlements + binary
4. Copy mlx.metallib into bundle ← Contents/MacOS/mlx.metallib
5. Copy to ~/Applications/       ← final install location
6. open "$DEST_APP"              ← launch
```

**One missing step = silent crash at runtime.**

---

## 10. Smoke Test Pattern

Write a standalone CLI target (`main.swift`) that exercises the full
pipeline without user input:

```swift
import AudioCommon
import IndexTTS2TTS

let model = try await IndexTTS2TTSModel.fromBundle(bundleDir)
let samples = try await model.generate(
    text: "The quick brown fox jumps over the lazy dog.",
    referenceAudio: refURL)
try WAVWriter.write(samples: samples, sampleRate: model.sampleRate, to: outputURL)

// Validate signal
let rms = sqrt(samples.reduce(0) { $0 + $1*$1 } / Float(samples.count))
guard rms > 1e-6 else { fatalError("silent output") }
```

Add it as an executable target in `Package.swift`:

```swift
.executableTarget(
    name: "SmokeTest",
    dependencies: [
        .product(name: "IndexTTS2TTS", package: "speech-swift"),
        .product(name: "AudioCommon", package: "speech-swift"),
    ],
    path: "Sources/SmokeTest"
),
```

Run: `swift run SmokeTest`

Benefits:
- Verify the pipeline works end-to-end before launching the GUI
- No UI code, no user interaction, no `@MainActor` issues
- Easy to run in CI
- Output WAV file can be inspected for signal quality
