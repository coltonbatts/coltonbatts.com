#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Optimize Reel Video for Web
#
# Usage:
#   bash scripts/optimize-reel.sh
#   bash scripts/optimize-reel.sh path/to/export.mov
#   bash scripts/optimize-reel.sh path/to/export.mov web 720p
#
# Outputs to public/reel/:
#   colton-batts-reel.mp4   (H.264, ~5-8MB)
#   colton-batts-reel.webm  (VP9, ~3-6MB)
#   colton-batts-reel-poster.jpg (frame at 10% or 3s)
#
# Requirements: ffmpeg installed
# ─────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/public/reel"
mkdir -p "$OUTPUT_DIR"

BASE="colton-batts-reel"
WEB="mp4"     # mp4 or webm
RESOLUTION="" # empty=auto, 1080p, 720p

INPUT=""

# Parse args
for arg in "$@"; do
  case "$arg" in
    --web)     WEB="webm" ;;
    --720p)    RESOLUTION="720p" ;;
    --1080p)   RESOLUTION="1080p" ;;
    -h|--help) 
      echo "Usage: $0 [INPUT_FILE] [OPTIONS]"
      echo "Options:"
      echo "  --web      Output WebM instead of MP4"
      echo "  --720p     Force 720p output (smaller file)"
      echo "  --1080p    Force 1080p output"
      exit 0
      ;;
    *)       INPUT="$arg" ;;
  esac
done

# Detect input file
if [ -z "$INPUT" ]; then
  # Try common locations
  for candidate in "$REPO_ROOT/public/reel/raw/"*.mov "$REPO_ROOT/public/reel/raw/"*.mp4 "$REPO_ROOT/public/reel/raw/"*.m4v; do
    if [ -f "$candidate" ]; then
      INPUT="$candidate"
      break
    fi
  done
  if [ -z "$INPUT" ]; then
    echo "ERROR: No input file found."
    echo ""
    echo "Place your Premiere export in public/reel/raw/ or pass the path:"
    echo "  bash scripts/optimize-reel.sh /path/to/export.mov"
    exit 1
  fi
fi

if [ ! -f "$INPUT" ]; then
  echo "ERROR: File not found: $INPUT"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Input:  $INPUT"
echo "  Output: $WEB ($(if [ -n "$RESOLUTION" ]; then echo "$RESOLUTION"; else echo "auto-res"; fi))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get source resolution
SRC_HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$INPUT")
echo "Source height: ${SRC_HEIGHT}px"

# Determine output scale
if [ "$RESOLUTION" = "720p" ]; then
  SCALE="scale=-2:720"
elif [ "$RESOLUTION" = "1080p" ]; then
  SCALE="scale=-2:1080"
elif [ -n "$SRC_HEIGHT" ] && [ "$SRC_HEIGHT" -gt 1080 ] 2>/dev/null; then
  SCALE="scale=-2:1080"
else
  SCALE=null
fi

echo ""

# ─── MP4 Output ─────────────────────────
if [ "$WEB" = "mp4" ]; then
  OUT="$OUTPUT_DIR/$BASE.mp4"
  echo "Encoding H.264 MP4..."
  
  ffmpeg -y -i "$INPUT"     -vf "$SCALE"     -c:v libx264     -preset medium     -crf 23     -movflags +faststart     -c:a aac -b:a 128k     -maxrate 8000k -bufsize 12000k     "$OUT" 2>&1
  
  SIZE=$(du -h "$OUT" | cut -f1)
  echo "  Done: $OUT ($SIZE)"
  
  # If too large, make a 720p version
  SIZE_BYTES=$(stat -f%z "$OUT")
  if [ "$SIZE_BYTES" -gt 20000000 ]; then
    echo "  WARNING: File is over 20MB. Creating 720p fallback..."
    OUT720="$OUTPUT_DIR/$BASE-720p.mp4"
    ffmpeg -y -i "$INPUT"       -vf "scale=-2:720"       -c:v libx264       -preset medium       -crf 25       -movflags +faststart       -c:a aac -b:a 128k       "$OUT720" 2>&1
    SIZE720=$(du -h "$OUT720" | cut -f1)
    echo "  720p version: $OUT720 ($SIZE720)"
  fi
fi

# ─── WebM Output ────────────────────────
if [ "$WEB" = "webm" ]; then
  OUT="$OUTPUT_DIR/$BASE.webm"
  echo "Encoding VP9 WebM..."
  
  ffmpeg -y -i "$INPUT"     -vf "$SCALE"     -c:v libvpx-vp9     -crf 30     -b:v 3000k -maxrate 5000k -bufsize 8000k     -c:a libopus -b:a 128k     -speed 1     "$OUT" 2>&1
  
  SIZE=$(du -h "$OUT" | cut -f1)
  echo "  Done: $OUT ($SIZE)"
fi

# ─── Generate Poster Frame ──────────────
POSTER="$OUTPUT_DIR/$BASE-poster.jpg"
echo "Generating poster frame..."

# Use frame at 3 seconds or 10% of video, whichever is shorter
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT")
DURATION=$(echo "$DURATION" | cut -d. -f1)
if [ "$DURATION" -gt 10 ] 2>/dev/null; then
  SEEK=3
else
  SEEK=$((DURATION / 10 + 1))
fi

ffmpeg -y -ss "$SEEK" -i "$INPUT"   -vf "scale=1920:-1"   -frames:v 1 -q:v 2   "$POSTER" 2>&1

echo "  Poster: $POSTER"

# ─── Summary ────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results:"
ls -lh "$OUTPUT_DIR"/"$BASE"* 2>/dev/null | awk '{print "  " $9 " " $5}'
echo ""
echo "  Next step:"
echo "  1. Set reel.enabled = true in src/config.ts"
echo "  2. Push to deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
