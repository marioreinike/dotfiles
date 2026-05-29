#!/usr/bin/env bash
# banana.sh — generate or edit images via Google's Nano Banana (Gemini image models).
# Usage: banana.sh <prompt> [--model nb2|nb|pro|<model-id>] [--out dir] [--in image]...

set -euo pipefail

MODEL="gemini-3.1-flash-image-preview"
OUTDIR="${HOME}/Pictures/banana"
PROMPT=""
INPUT_IMAGES=()

usage() {
  cat >&2 <<'EOF'
usage: banana.sh <prompt> [--model nb2|nb|pro|<model-id>] [--out dir] [--in image]...
  --model   nb2 (default, gemini-3.1-flash-image-preview)
            nb  (gemini-2.5-flash-image)
            pro (gemini-3-pro-image-preview)
            Or pass any explicit model id.
  --out     Output directory (default: ~/Pictures/banana)
  --in      Input image path. Repeat for multiple input images.
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      [[ $# -ge 2 ]] || usage
      case "$2" in
        nb2|banana2) MODEL="gemini-3.1-flash-image-preview" ;;
        nb|banana)   MODEL="gemini-2.5-flash-image" ;;
        pro)         MODEL="gemini-3-pro-image-preview" ;;
        *)           MODEL="$2" ;;
      esac
      shift 2
      ;;
    --out)
      [[ $# -ge 2 ]] || usage
      OUTDIR="$2"; shift 2 ;;
    --in)
      [[ $# -ge 2 ]] || usage
      [[ -f "$2" ]] || { echo "error: input image not found: $2" >&2; exit 1; }
      INPUT_IMAGES+=("$2"); shift 2 ;;
    -h|--help) usage ;;
    *)
      PROMPT="${PROMPT:+$PROMPT }$1"; shift ;;
  esac
done

[[ -n "$PROMPT" ]] || usage
[[ -n "${GEMINI_API_KEY:-}" ]] || { echo "error: GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey" >&2; exit 1; }
command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 1; }
command -v curl >/dev/null || { echo "error: curl is required" >&2; exit 1; }

mkdir -p "$OUTDIR"

# Build the parts array (prompt + any input images), using temp files to avoid arg-size limits.
PARTS_JSON=$(mktemp)
trap 'rm -f "$PARTS_JSON" "$PARTS_JSON.new" "$BODY_JSON" "$RESP_JSON" 2>/dev/null || true' EXIT
jq -n --arg p "$PROMPT" '[{text:$p}]' > "$PARTS_JSON"

for img in "${INPUT_IMAGES[@]}"; do
  mime=$(file --mime-type -b "$img")
  B64TMP=$(mktemp)
  base64 -i "$img" | tr -d '\n' > "$B64TMP"
  jq --arg m "$mime" --rawfile d "$B64TMP" \
     '. + [{inlineData:{mimeType:$m, data:$d}}]' "$PARTS_JSON" > "$PARTS_JSON.new"
  mv "$PARTS_JSON.new" "$PARTS_JSON"
  rm -f "$B64TMP"
done

BODY_JSON=$(mktemp)
jq -n --slurpfile parts "$PARTS_JSON" \
   '{contents:[{parts:$parts[0]}], generationConfig:{responseModalities:["TEXT","IMAGE"]}}' \
   > "$BODY_JSON"

RESP_JSON=$(mktemp)
HTTP_CODE=$(curl -sS -o "$RESP_JSON" -w '%{http_code}' \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$BODY_JSON" \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "error: HTTP $HTTP_CODE from Gemini API" >&2
  jq . "$RESP_JSON" >&2 || cat "$RESP_JSON" >&2
  exit 1
fi

# Print any text the model returned.
jq -r '.candidates[0].content.parts[]? | select(.text) | .text' "$RESP_JSON"

# Save each inline image part.
TS=$(date +%Y%m%d-%H%M%S)
PARTS_TMP=$(mktemp)
jq -r '.candidates[0].content.parts[]? | select(.inlineData) | "\(.inlineData.mimeType)\t\(.inlineData.data)"' \
  "$RESP_JSON" > "$PARTS_TMP"

if [[ ! -s "$PARTS_TMP" ]]; then
  echo "error: response contained no image data" >&2
  jq . "$RESP_JSON" >&2
  rm -f "$PARTS_TMP"
  exit 1
fi

i=0
while IFS=$'\t' read -r mime b64; do
  ext="${mime##*/}"
  [[ "$ext" == "jpeg" ]] && ext="jpg"
  out="$OUTDIR/banana-${TS}-${i}.${ext}"
  printf '%s' "$b64" | base64 -d > "$out"
  echo "saved: $out"
  i=$((i+1))
done < "$PARTS_TMP"

rm -f "$PARTS_TMP"
