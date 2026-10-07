#!/usr/bin/env bash
# Upload screenshots to the PR of the current (or given) branch and optionally comment.
#
#   upload-pr.sh --repo PATH [--pr N] [--comment] [--note TEXT] [--width PX] file.png...
#
# Images are committed (git plumbing, worktree untouched) to the hidden ref
# refs/ui-previews/pr-<N> on origin. Hidden refs are not fetched by normal
# clones, so teammates never download them. Links use the commit SHA, so they
# stay valid after later uploads. Prints the markdown; --comment also posts it.
# Exit 2 = the branch has no PR (nothing uploaded).
#
# Cleanup once the PR is merged/closed:  git push origin :refs/ui-previews/pr-<N>
set -euo pipefail

repo=""; pr=""; comment=0; note=""; width=480; files=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) repo="$2"; shift 2 ;;
    --pr) pr="$2"; shift 2 ;;
    --comment) comment=1; shift ;;
    --note) note="$2"; shift 2 ;;
    --width) width="$2"; shift 2 ;;
    *) files+=("$1"); shift ;;
  esac
done
repo="${repo:-$(git rev-parse --show-toplevel)}"
cd "$repo"
[[ ${#files[@]} -gt 0 ]] || { echo "error: no files given" >&2; exit 1; }

if ! pr_json="$(gh pr view ${pr:+"$pr"} --json number,url,state 2>/dev/null)"; then
  echo "no PR for this branch; nothing uploaded" >&2; exit 2
fi
pr="$(jq -r .number <<<"$pr_json")"
pr_url="$(jq -r .url <<<"$pr_json")"
nwo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
ref="refs/ui-previews/pr-$pr"
stamp="$(date +%Y%m%d-%H%M%S)"

tmp_index="$(mktemp)"; trap 'rm -f "$tmp_index"' EXIT
commit=""
for attempt in 1 2 3; do
  parent=""
  if git fetch -q origin "$ref" 2>/dev/null; then parent="$(git rev-parse FETCH_HEAD)"; fi
  rm -f "$tmp_index"
  if [[ -n "$parent" ]]; then GIT_INDEX_FILE="$tmp_index" git read-tree "$parent"; else GIT_INDEX_FILE="$tmp_index" git read-tree --empty; fi
  for f in "${files[@]}"; do
    blob="$(git hash-object -w "$f")"
    GIT_INDEX_FILE="$tmp_index" git update-index --add --cacheinfo "100644,$blob,$stamp/$(basename "$f")"
  done
  tree="$(GIT_INDEX_FILE="$tmp_index" git write-tree)"
  commit="$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "ui-preview screenshots for PR #$pr ($stamp)")"
  # SSH pushes go through the 1Password agent, which may wait for a Touch ID approval.
  if push_err="$(git push -q origin "$commit:$ref" 2>&1)"; then break; fi
  echo "push attempt $attempt failed: $(tail -3 <<<"$push_err")" >&2
  commit=""
  sleep $((attempt * 2))
done
[[ -n "$commit" ]] || { echo "error: push to $ref failed 3 times (if the 1Password Touch ID prompt was missed, rerun)" >&2; exit 1; }

body="$(mktemp)"
{
  echo "### UI preview · $stamp"
  [[ -n "$note" ]] && { echo; echo "$note"; }
  echo
  echo "<table><tr>"
  i=0
  for f in "${files[@]}"; do
    name="$(basename "$f" .png)"
    url="https://github.com/$nwo/blob/$commit/$stamp/$(basename "$f")?raw=true"
    printf '<td valign="top"><sub>%s</sub><br><img src="%s" width="%s"></td>\n' "$name" "$url" "$width"
    i=$((i + 1))
    if (( i % 2 == 0 )) && (( i < ${#files[@]} )); then echo "</tr><tr>"; fi
  done
  echo "</tr></table>"
  echo
  echo "<sub>Rendered in isolation with mocked API data (ui-preview), not from a running app.</sub>"
} > "$body"

if (( comment )); then
  gh pr comment "$pr" --body-file "$body" >/dev/null
  echo "commented on $pr_url"
fi
cat "$body"
rm -f "$body"
