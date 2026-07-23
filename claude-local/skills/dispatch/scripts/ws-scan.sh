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
# Comparison is OFFLINE (no fetch) — it uses origin/<base>, falling back to the
# local base branch ref, then origin/HEAD. origin/<base> is preferred because it
# gets refreshed by any `git fetch` in that repo, whereas a local base branch only
# updates if someone explicitly checks it out and pulls it — a stale local base
# branch otherwise reports false "commits ahead". Run a fetch first if you need
# the absolute latest base.
#
# Per-worktree git checks (all read-only: rev-parse/status/show-ref/rev-list) run
# in parallel, capped at DISPATCH_WS_SCAN_PARALLEL concurrent jobs, since they're
# independent of each other and dominated by process-spawn overhead rather than
# CPU work. Worktrees of the same repo share one object database but each has its
# own index/HEAD, so concurrent read-only git calls across them are safe.
#
# With --fetch/-f, `git fetch origin` runs first against every DISTINCT repo
# discovered across the scanned worktrees (deduped by shared git-common-dir, so a
# repo checked out in 5 workspaces is only fetched once) — also parallelized and
# capped at DISPATCH_WS_SCAN_PARALLEL. Repo discovery comes from the worktrees
# actually present under WS_ROOT, not from repos.conf or a full ~/REPOS scan, so
# it never fetches repos you aren't actively dispatching work in.
#
# Usage:
#   ws-scan.sh               human-readable report of all workspaces
#   ws-scan.sh --report      same as above
#   ws-scan.sh --free        print only the names of FREE workspaces (one per line)
#   ws-scan.sh -f|--fetch    fetch origin for every distinct repo first (combine
#                            with --free/--report in any order)
#
# Env overrides:
#   DISPATCH_CONF               path to repos.conf  (default: ../repos.conf)
#   DISPATCH_WORKSPACES         workspaces root     (default: ~/WORKSPACES)
#   DISPATCH_WS_SCAN_PARALLEL   max concurrent per-worktree scans/fetches (default: nproc)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="${DISPATCH_CONF:-$SCRIPT_DIR/../repos.conf}"
WS_ROOT="${DISPATCH_WORKSPACES:-$HOME/WORKSPACES}"

MODE="report"
FETCH=0
while [ $# -gt 0 ]; do
  case "$1" in
    --free)             MODE="free" ;;
    --report)           MODE="report" ;;
    -f|--fetch)         FETCH=1 ;;
    -h|--help)          sed -n '2,42p' "$0"; exit 0 ;;
    *) echo "usage: ws-scan.sh [--free|--report] [-f|--fetch]" >&2; exit 2 ;;
  esac
  shift
done

default_parallel() {
  if command -v nproc >/dev/null 2>&1; then nproc
  elif command -v sysctl >/dev/null 2>&1; then sysctl -n hw.ncpu
  else echo 4
  fi
}
MAX_PARALLEL="${DISPATCH_WS_SCAN_PARALLEL:-$(default_parallel)}"

base_for_repo() {
  [ -f "$CONF" ] || return 0
  awk -v r="$1" '$1 !~ /^#/ && NF>=3 && $2==r {print $3; exit}' "$CONF"
}

resolve_base_ref() {
  # echoes a ref usable for rev-list: origin/<base>, else local branch, else origin/HEAD
  local repo_dir="$1" base="$2" def
  if [ -n "$base" ] && git -C "$repo_dir" show-ref --verify --quiet "refs/remotes/origin/$base"; then
    echo "origin/$base"; return
  fi
  if [ -n "$base" ] && git -C "$repo_dir" show-ref --verify --quiet "refs/heads/$base"; then
    echo "$base"; return
  fi
  def=$(git -C "$repo_dir" symbolic-ref -q refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  [ -n "$def" ] && echo "origin/$def" || echo ""
}

tmpdir=$(mktemp -d "${TMPDIR:-/tmp}/ws-scan.XXXXXX")
trap 'rm -rf "$tmpdir"' EXIT

# Pass 1 (cheap, sequential): walk workspaces/worktrees and record which dirs
# are real worktrees, in the exact grouped order the report needs.
declare -a WS_ORDER WS_HAS_WT
declare -a WT_WS WT_DIR WT_ALIAS WT_REPO WT_ROOT
total=0

for ws in "$WS_ROOT"/*/; do
  [ -d "$ws" ] || continue
  wsname=$(basename "$ws")
  WS_ORDER+=("$wsname")
  has_wt=0

  for d in "$ws"*/; do
    [ -e "$d/.git" ] || continue
    git -C "$d" rev-parse --is-inside-work-tree >/dev/null 2>&1 || continue
    common=$(git -C "$d" rev-parse --git-common-dir 2>/dev/null) || continue
    case "$common" in /*) ;; *) common="$d/$common" ;; esac
    repo_root=$(cd "$(dirname "$common")" 2>/dev/null && pwd) || continue
    reponame=$(basename "$repo_root")
    walias=$(basename "$d")
    has_wt=1

    WT_WS[$total]="$wsname"
    WT_DIR[$total]="$d"
    WT_ALIAS[$total]="$walias"
    WT_REPO[$total]="$reponame"
    WT_ROOT[$total]="$repo_root"
    total=$((total + 1))
  done
  WS_HAS_WT+=("$has_wt")
done

if [ "$FETCH" = "1" ]; then
  # Dedupe repo roots (a repo checked out in N workspaces is fetched once).
  declare -a UNIQUE_ROOTS
  if [ "$total" -gt 0 ]; then
    while IFS= read -r root; do
      [ -n "$root" ] && UNIQUE_ROOTS+=("$root")
    done < <(printf '%s\n' "${WT_ROOT[@]}" | sort -u)
  fi

  if [ "${#UNIQUE_ROOTS[@]}" -gt 0 ]; then
    echo "Fetching ${#UNIQUE_ROOTS[@]} distinct repo(s)..." >&2
    fetch_repo() {
      local root="$1" out
      if ! out=$(git -C "$root" fetch --quiet origin 2>&1); then
        echo "warning: fetch failed for $(basename "$root"): $out" >&2
      fi
    }
    fetch_pids=()
    for root in "${UNIQUE_ROOTS[@]}"; do
      fetch_repo "$root" &
      fetch_pids+=("$!")
      if [ "${#fetch_pids[@]}" -ge "$MAX_PARALLEL" ]; then
        wait "${fetch_pids[0]}"
        fetch_pids=("${fetch_pids[@]:1}")
      fi
    done
    wait
  fi
fi

# Pass 2 (expensive, parallel): per-worktree git checks, each writing its
# result to an indexed temp file so reassembly order is deterministic.
scan_worktree() {
  local i="$1" d="$2" walias="$3" reponame="$4" repo_root="$5"
  local branch base baseref dirty ahead behind wt_free state

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

  state="free"; [ "$wt_free" = "0" ] && state="BUSY"
  {
    echo "$wt_free"
    echo "    [$state] ${walias} (repo=${reponame}) branch=${branch} base=${base:-${baseref:-?}} dirty=${dirty} ahead=${ahead} behind=${behind}"
  } > "$tmpdir/$i.out"
}

running_pids=()
for ((i = 0; i < total; i++)); do
  scan_worktree "$i" "${WT_DIR[$i]}" "${WT_ALIAS[$i]}" "${WT_REPO[$i]}" "${WT_ROOT[$i]}" &
  running_pids+=("$!")
  if [ "${#running_pids[@]}" -ge "$MAX_PARALLEL" ]; then
    wait "${running_pids[0]}"
    running_pids=("${running_pids[@]:1}")
  fi
done
wait

# Reassemble: walk workspaces in original order, consuming worktree results in
# the same grouped order they were recorded in (WT_WS is grouped by construction).
free_list=""
report=""
idx=0

for wi in "${!WS_ORDER[@]}"; do
  wsname="${WS_ORDER[$wi]}"
  has_wt="${WS_HAS_WT[$wi]}"
  ws_free=1
  lines=""

  while [ "$idx" -lt "$total" ] && [ "${WT_WS[$idx]}" = "$wsname" ]; do
    wt_free=$(sed -n '1p' "$tmpdir/$idx.out")
    line=$(sed -n '2p' "$tmpdir/$idx.out")
    [ "$wt_free" = "0" ] && ws_free=0
    lines="${lines}
${line}"
    idx=$((idx + 1))
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
