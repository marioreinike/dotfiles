#!/usr/bin/env bash
#
# ws-scan.sh — Scan ~/WORKSPACES and report, per workspace, whether it is FREE
# or OCCUPIED, with per-worktree detail.
#
# Freeness rule ("clean + fully merged"):
#   A worktree is FREE when it has NO uncommitted/untracked changes AND 0 commits
#   ahead of its base branch (any feature work is already merged). Branch name is
#   ignored. A workspace is FREE only when every worktree in it is FREE.
#   A workspace with no worktrees is FREE (empty).
#
# Comparison is OFFLINE (no fetch) — it uses the local base branch ref, falling
# back to origin/<base>, then origin/HEAD. Run a fetch first if you need the
# absolute latest base.
#
# Usage:
#   ws-scan.sh             human-readable report of all workspaces
#   ws-scan.sh --report    same as above
#   ws-scan.sh --free      print only the names of FREE workspaces (one per line)
#
# Env overrides:
#   DISPATCH_CONF        path to repos.conf  (default: ../repos.conf)
#   DISPATCH_WORKSPACES  workspaces root     (default: ~/WORKSPACES)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="${DISPATCH_CONF:-$SCRIPT_DIR/../repos.conf}"
WS_ROOT="${DISPATCH_WORKSPACES:-$HOME/WORKSPACES}"

MODE="report"
case "${1:-}" in
  --free)             MODE="free" ;;
  --report|"")        MODE="report" ;;
  -h|--help)          sed -n '2,30p' "$0"; exit 0 ;;
  *) echo "usage: ws-scan.sh [--free|--report]" >&2; exit 2 ;;
esac

base_for_repo() {
  [ -f "$CONF" ] || return 0
  awk -v r="$1" '$1 !~ /^#/ && NF>=3 && $2==r {print $3; exit}' "$CONF"
}

resolve_base_ref() {
  # echoes a ref usable for rev-list: local branch, else origin/<base>, else origin/HEAD
  local repo_dir="$1" base="$2" def
  if [ -n "$base" ] && git -C "$repo_dir" show-ref --verify --quiet "refs/heads/$base"; then
    echo "$base"; return
  fi
  if [ -n "$base" ] && git -C "$repo_dir" show-ref --verify --quiet "refs/remotes/origin/$base"; then
    echo "origin/$base"; return
  fi
  def=$(git -C "$repo_dir" symbolic-ref -q refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  [ -n "$def" ] && echo "origin/$def" || echo ""
}

free_list=""
report=""

for ws in "$WS_ROOT"/*/; do
  [ -d "$ws" ] || continue
  wsname=$(basename "$ws")
  ws_free=1
  has_wt=0
  lines=""

  for d in "$ws"*/; do
    [ -e "$d/.git" ] || continue
    git -C "$d" rev-parse --is-inside-work-tree >/dev/null 2>&1 || continue
    common=$(git -C "$d" rev-parse --git-common-dir 2>/dev/null) || continue
    case "$common" in /*) ;; *) common="$d/$common" ;; esac
    repo_root=$(cd "$(dirname "$common")" 2>/dev/null && pwd) || continue
    reponame=$(basename "$repo_root")
    alias=$(basename "$d")
    has_wt=1

    branch=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null)
    base=$(base_for_repo "$reponame")
    baseref=$(resolve_base_ref "$repo_root" "$base")
    dirty=$(git -C "$d" status --porcelain 2>/dev/null | wc -l | tr -d ' ')

    ahead="?"; behind="?"
    if [ -n "$baseref" ]; then
      ahead=$(git -C "$d" rev-list --count "$baseref..HEAD" 2>/dev/null || echo "?")
      behind=$(git -C "$d" rev-list --count "HEAD..$baseref" 2>/dev/null || echo "?")
    fi

    wt_free=1
    [ "$dirty" != "0" ] && wt_free=0
    [ "$ahead" != "0" ] && wt_free=0   # "?" (unknown base) also counts as busy, to be safe
    [ "$wt_free" = "0" ] && ws_free=0

    state="free"; [ "$wt_free" = "0" ] && state="BUSY"
    lines="${lines}
    [$state] ${alias} (repo=${reponame}) branch=${branch} base=${base:-${baseref:-?}} dirty=${dirty} ahead=${ahead} behind=${behind}"
  done

  verdict="FREE"; [ "$ws_free" = "0" ] && verdict="OCCUPIED"
  report="${report}
=== ${wsname} : ${verdict} ==="
  [ "$has_wt" = "0" ] && report="${report}
    (no worktrees — empty workspace)"
  report="${report}${lines}"
  [ "$ws_free" = "1" ] && free_list="${free_list} ${wsname}"
done

if [ "$MODE" = "free" ]; then
  for w in $free_list; do echo "$w"; done
  exit 0
fi

echo "Workspace status (root: $WS_ROOT)"
echo "Rule: FREE = clean working tree AND 0 commits ahead of base (work merged)."
echo "${report}"
echo ""
echo "FREE workspaces:${free_list:- (none)}"
