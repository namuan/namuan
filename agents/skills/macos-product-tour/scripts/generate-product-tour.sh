#!/usr/bin/env bash
#
# generate-product-tour.sh
#
# Regenerates a macOS app product tour in a single step:
#   1. Activates the target app and reads its live window position.
#   2. Captures a full-screen screenshot.
#   3. Renders one full-screen image per feature (colored outline + centered
#      description band at the bottom).
#   4. Regenerates product-tour/PRODUCT_TOUR.md.
#
# No feature buttons are clicked — this only captures and annotates.
#
# Usage:
#   bash scripts/generate-product-tour.sh
#
# Env overrides:
#   SCALE=2            Display scale factor (default 2 for Retina).
#   KEEP_SOURCE=1      Keep the raw screenshot as product-tour/source.png.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOUR_DIR="$REPO_ROOT/product-tour"
mkdir -p "$TOUR_DIR"

# ═══════════════════════════════════════════════════════════════════════════
# Per-app configuration — update these for each application
# ═══════════════════════════════════════════════════════════════════════════

APP_NAME="{{APP_PROCESS_NAME}}"             # System Events process name
DEFAULT_WIN_X={{DEFAULT_WINDOW_X}}          # default window logical x (pixels / SCALE)
DEFAULT_WIN_Y={{DEFAULT_WINDOW_Y}}          # default window logical y (pixels / SCALE)
SCREEN_W={{SCREENSHOT_PIXEL_WIDTH}}         # full-screen capture pixel width

# Feature annotation coordinates are authored as screen pixels for the
# window in its default position.  They will be offset automatically when
# the user has moved the window.
#
# gen  filename   color    x1   y1   x2   y2   "Description — explanatory text."
#      ^out.png   ^hex     ^--- pixel coordinates of the outline ---^
#
# ── replace the lines below with your app's features ──────────────────────
gen() { :; }  # placeholder — remove and add your own gen calls below
# gen f01-toolbar   "#FF3B30" 180  78  610 182  "Toolbar — Filter Active, Add Project, ..."
# gen f02-search    "#FF9500"  36 200  554 256  "Search — Filter by name or path."
# ...

# ═══════════════════════════════════════════════════════════════════════════
# Infrastructure — do not edit below unless extending the tool
# ═══════════════════════════════════════════════════════════════════════════

# --- Font selection (ImageMagick needs an explicit font on macOS) -----------
FONT=""
for candidate in \
  /System/Library/Fonts/Helvetica.ttc \
  /System/Library/Fonts/Supplemental/Arial.ttf \
  /System/Library/Fonts/Menlo.ttc \
  /System/Library/Fonts/Monaco.ttf; do
  if [ -f "$candidate" ]; then FONT="$candidate"; break; fi
done
if [ -z "$FONT" ]; then
  echo "error: no suitable font found for ImageMagick" >&2
  exit 1
fi

command -v magick >/dev/null 2>&1 || { echo "error: ImageMagick ('magick') not found" >&2; exit 1; }
command -v screencapture >/dev/null 2>&1 || { echo "error: screencapture not found" >&2; exit 1; }

SCALE="${SCALE:-2}"
BH=260

# --- Capture ----------------------------------------------------------------
echo "Activating ${APP_NAME}..."
osascript -e "tell application \"${APP_NAME}\" to activate" >/dev/null 2>&1 || true
sleep 1

# Read actual window position so annotations track the window if it was moved.
POS="$(osascript -e "tell application \"System Events\" to tell process \"${APP_NAME}\" to get position of window 1" 2>/dev/null || echo "{$DEFAULT_WIN_X, $DEFAULT_WIN_Y}")"
WX="$(echo "$POS" | tr -d '{}' | cut -d, -f1 | tr -d ' ')"
WY="$(echo "$POS" | tr -d '{}' | cut -d, -f2 | tr -d ' ')"
WX="${WX:-$DEFAULT_WIN_X}"; WY="${WY:-$DEFAULT_WIN_Y}"
DX=$(( WX * SCALE - DEFAULT_WIN_X * SCALE ))
DY=$(( WY * SCALE - DEFAULT_WIN_Y * SCALE ))
echo "Window at logical ($WX,$WY); annotation offset = ($DX,$DY) px"

SOURCE="$TOUR_DIR/source.png"
echo "Capturing screenshot -> $SOURCE"
screencapture -x "$SOURCE"

# --- Render one annotated full-screen shot per feature ----------------------
gen() {
  local name="$1" col="$2" x1="$3" y1="$4" x2="$5" y2="$6" desc="$7"
  local X1=$(( x1 + DX )) Y1=$(( y1 + DY )) X2=$(( x2 + DX )) Y2=$(( y2 + DY ))
  local tmp; tmp="$(mktemp "${TMPDIR:-/tmp}/pt.XXXXXX.png")"
  magick "$SOURCE" -stroke "$col" -strokewidth 10 -fill none \
    -draw "rectangle $X1,$Y1 $X2,$Y2" "$tmp"
  magick -size "${SCREEN_W}x${BH}" -background 'rgba(28,28,30,0.85)' -fill white \
    -font "$FONT" -pointsize 60 -gravity Center caption:"$desc" "${tmp}.banner.png"
  magick "$tmp" "${tmp}.banner.png" -gravity South -composite "$TOUR_DIR/$name.png"
  rm -f "$tmp" "${tmp}.banner.png"
  echo "  wrote $name.png"
}

echo "Rendering feature shots..."
# ═══════════════════════════════════════════════════════════════════════════
# Feature definitions — paste your gen calls here (replacing the placeholder)
# ═══════════════════════════════════════════════════════════════════════════

# --- Regenerate markdown ---------------------------------------------------
echo "Writing $TOUR_DIR/PRODUCT_TOUR.md"
cat > "$TOUR_DIR/PRODUCT_TOUR.md" <<'MD'
# Product Tour

*Replace this file with your app's feature descriptions. Each section should match a gen call above.*

![Feature](f01-toolbar.png)

Description.
MD

# --- Cleanup ----------------------------------------------------------------
if [ "${KEEP_SOURCE:-0}" = "1" ]; then
  echo "Kept raw screenshot at $SOURCE"
else
  rm -f "$SOURCE"
fi
rm -f "$TOUR_DIR"/01-annotated.png "$TOUR_DIR"/0[2-8]-*.png

echo "Product tour regenerated in $TOUR_DIR"
