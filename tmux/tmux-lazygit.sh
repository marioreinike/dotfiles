#!/usr/bin/env bash
# Open lazygit in the current directory.
# If cwd is not a git repo, offer to open lazygit in a direct child that is.
# Picker shows a p10k-style summary: branch ⇣N ⇡N +N !N ?N

set -u

DIR="${1:-$PWD}"
cd "$DIR" || exit 1

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exec lazygit
fi

candidates=()
for d in "$DIR"/*/; do
  [ -d "$d" ] || continue
  if git -C "$d" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    candidates+=("${d%/}")
  fi
done

if [ "${#candidates[@]}" -eq 0 ]; then
  printf '\n  Not a git repository, and no git repo children found in:\n  %s\n\n  Press any key to close...' "$DIR"
  read -rsn1 </dev/tty
  exit 0
fi

repo_summary() {
  local repo=$1
  local branch ahead=0 behind=0 staged=0 unstaged=0 untracked=0

  branch=$(git -C "$repo" symbolic-ref --short HEAD 2>/dev/null) \
    || branch=$(git -C "$repo" rev-parse --short HEAD 2>/dev/null) \
    || branch="?"

  local status header body
  status=$(git -C "$repo" status --porcelain=v1 -b 2>/dev/null) || status=""
  header=$(printf '%s\n' "$status" | head -n 1)
  body=$(printf '%s\n' "$status" | tail -n +2)

  [[ $header =~ ahead[[:space:]]([0-9]+)  ]] && ahead=${BASH_REMATCH[1]}
  [[ $header =~ behind[[:space:]]([0-9]+) ]] && behind=${BASH_REMATCH[1]}

  if [ -n "$body" ]; then
    read -r staged unstaged untracked < <(printf '%s\n' "$body" | awk '
      /^\?\?/ { u++; next }
      NF == 0 { next }
      {
        if (substr($0,1,1) != " " && substr($0,1,1) != "?") s++
        if (substr($0,2,1) != " " && substr($0,2,1) != "?") m++
      }
      END { printf "%d %d %d\n", s+0, m+0, u+0 }')
  fi

  local summary=$branch
  (( behind    > 0 )) && summary+=" ⇣$behind"
  (( ahead     > 0 )) && summary+=" ⇡$ahead"
  (( staged    > 0 )) && summary+=" +$staged"
  (( unstaged  > 0 )) && summary+=" !$unstaged"
  (( untracked > 0 )) && summary+=" ?$untracked"

  printf '%s' "$summary"
}

max_name_len=0
for repo in "${candidates[@]}"; do
  name=${repo##*/}
  (( ${#name} > max_name_len )) && max_name_len=${#name}
done

lines=()
for repo in "${candidates[@]}"; do
  name=${repo##*/}
  summary=$(repo_summary "$repo")
  lines+=("$(printf '%-*s  %s' "$max_name_len" "$name" "$summary")")
done

selected=$(printf '%s\n' "${lines[@]}" \
  | fzf --prompt="lazygit > " \
        --header="Not a repo. Pick a child repo (Esc to cancel):" \
        --height=100% --reverse --ansi)

[ -n "$selected" ] || exit 0

selected_name=$(printf '%s' "$selected" | awk '{print $1}')
cd "$DIR/$selected_name" || exit 1
exec lazygit
