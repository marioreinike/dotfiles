---
name: banana
description: Generate or edit images with Google's Nano Banana (Gemini image models). Invoke via /banana — does not auto-trigger because each call costs money. Keywords - banana, nano banana, gemini image, image generation, generate image, draw, create picture, edit image.
disable-model-invocation: true
argument-hint: <prompt> [--model nb2|nb|pro] [--out dir] [--in image]...
allowed-tools: Bash, Read
---

# Banana — Nano Banana image generation

Wraps Google's Gemini image-generation API (Nano Banana family). One prompt drops a PNG on disk.

## Prerequisites

`GEMINI_API_KEY` must be in env. Get one at https://aistudio.google.com/apikey, then add `export GEMINI_API_KEY=...` to `~/.zshrc` and `source` it. A redacted placeholder lives in `zsh/zshrc` in the dotfiles repo.

If `GEMINI_API_KEY` is unset when the user invokes `/banana`, stop and tell them — don't try to proceed.

## Models

| Alias | Model ID | When to pick |
|---|---|---|
| `nb2` (default) | `gemini-3.1-flash-image-preview` | Speed, up to 4K, 14 aspect ratios, up to 14 input imgs |
| `nb` | `gemini-2.5-flash-image` | Stable, 1K only, cheapest (~$0.039/img) |
| `pro` | `gemini-3-pro-image-preview` | Best legible in-image text + complex reasoning (most expensive) |

## Usage

The helper script lives at `${CLAUDE_SKILL_DIR}/scripts/banana.sh`. Forward `$ARGUMENTS` to it:

```bash
"${CLAUDE_SKILL_DIR}/scripts/banana.sh" $ARGUMENTS
```

Examples:

```bash
# Text-to-image (uses nb2)
banana.sh "a banana wearing a tuxedo at a fancy restaurant"

# Pick a model
banana.sh --model pro "infographic explaining mitochondria, with labels"

# Edit / compose: pass one or more input images with --in
banana.sh --in cat.jpg "make the cat pink and add a top hat"

# Override save location (default: ~/Pictures/banana/)
banana.sh --out . "logo for a coffee shop named Brava"
```

Outputs are named `banana-<YYYYMMDD-HHMMSS>-<n>.<ext>`. Any text returned by the model is also printed.

## Flow

1. Parse `$ARGUMENTS` into prompt + flags. If the user named input images (e.g., "edit this photo: foo.png"), translate each into a `--in <path>` flag.
2. Briefly confirm model + input files with the user before running — image generation costs money.
3. Run the script. Show the saved path(s) and any text response.
4. If the API returns no image (refusal, error, policy block), surface the raw error JSON so the cause is visible.

## Don't

- Don't loop the script for "variations" without checking with the user — each call is ~$0.04–$0.15.
- Don't default to `--model pro`; only when the user asks for high-fidelity text or complex composition.
- Don't try to remove the SynthID watermark — it's mandatory and embedded by Google.

## Caveats

- Transparent backgrounds aren't supported; use a flat white background for stickers/icons.
- The model doesn't always honor "give me N images" — you may get 1.
- Uppercase `K` matters in resolution flags (`4K`, not `4k`).
- Image generation is not available on every account tier; an HTTP 403 / "not supported" reply usually means the key needs billing enabled in AI Studio.
