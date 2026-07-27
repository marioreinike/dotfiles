#!/usr/bin/env bash
#
# repo-status.sh — Per-workspace freeness snapshot with full repo detail.
#
# Wraps dispatch's ws-scan.sh (same repos.conf / workspaces root) and
# reformats its per-workspace report into one table per workspace, one row
# per repo alias in it, so you can scan a workspace's full repo detail (and
# which repos are free) in aligned columns. Each workspace header also shows
# an overall FREE/BUSY verdict (FREE only when every repo in it is free,
# straight from ws-scan.sh's own verdict). Freeness rule and
# offline-comparison caveat are identical to ws-scan.sh — see its --help.
#
# Usage:
#   repo-status.sh             grouped-by-workspace table (default)
#   repo-status.sh [ws-scan flags…]
#
# All flags are forwarded to ws-scan.sh verbatim — nothing is re-declared here, so
# any flag ws-scan.sh gains (and its own validation of unknown flags) works through
# this wrapper automatically. E.g. -f|--fetch fetches origin for every distinct repo
# first; see ws-scan.sh --help for the full list.
#
# Two exceptions, both because this script's awk depends on ws-scan.sh's --report
# output format: --report is always appended last (so it wins over anything you
# pass), and --free is rejected outright — use ws-scan.sh --free directly for that.
#
# Env overrides (passed through to ws-scan.sh):
#   DISPATCH_CONF               path to repos.conf
#   DISPATCH_WORKSPACES         workspaces root
#   DISPATCH_WS_SCAN_PARALLEL   max concurrent per-worktree scans/fetches

set -uo pipefail

DISPATCH_SCAN="$HOME/.claude/skills/dispatch/scripts/ws-scan.sh"
if [ ! -x "$DISPATCH_SCAN" ]; then
  echo "error: dispatch's ws-scan.sh not found at $DISPATCH_SCAN" >&2
  exit 1
fi

scan_args=()
for arg in "$@"; do
  case "$arg" in
    -h|--help) sed -n '2,29p' "$0"; exit 0 ;;
    --free)
      echo "error: --free is incompatible with repo-status.sh (it needs ws-scan.sh's --report format)" >&2
      echo "       run: $DISPATCH_SCAN --free" >&2
      exit 2 ;;
    *) scan_args+=("$arg") ;;   # forwarded untouched; ws-scan.sh validates it
  esac
done
scan_args+=(--report)

raw="$("$DISPATCH_SCAN" "${scan_args[@]}")" || exit $?

echo "$raw" | awk '
  function trunc(s, n,   r) {
    if (length(s) <= n) return s
    r = substr(s, 1, n-1) "…"
    return r
  }
  function dirtylabel(d) {
    return (d == "0") ? "clean" : d " change(s)"
  }
  function pad(s, n) {
    while (length(s) < n) s = s " "
    return s
  }
  function colorstatus(s, n,   padded) {
    padded = pad(s, n)
    if (s == "FREE") return "\033[30;42m" padded "\033[0m"
    return "\033[97;41m" padded "\033[0m"
  }
  function colorstatus_right(s,   plain) {
    plain = s
    if (s == "FREE") return "\033[30;42m" plain "\033[0m"
    return "\033[97;41m" plain "\033[0m"
  }
  BEGIN {
    nws = 0
    HDRWIDTH = length(sprintf("%s %s %s %s %s %s %s", pad("repo",12), pad("status",6), pad("branch",30), pad("base",12), pad("ahead",5), pad("behind",6), pad("tree",10)))
  }
  /^=== / {
    wsname = $2
    verdict = ($4 == "FREE") ? "FREE" : "BUSY"
    wsverdict[wsname] = verdict
    if (!(wsname in seenws)) { seenws[wsname] = 1; wslist[nws++] = wsname }
    next
  }
  /^[ \t]*\[(free|BUSY)\]/ {
    line = $0
    sub(/^[ \t]+/, "", line)
    state = substr(line, 2, index(line, "]") - 2)
    rest = substr(line, index(line, "]") + 2)
    split(rest, f, " ")
    alias = f[1]
    repo = f[2]; sub(/^\(repo=/, "", repo); sub(/\)$/, "", repo)
    branch = f[3]; sub(/^branch=/, "", branch)
    base = f[4]; sub(/^base=/, "", base)
    dirty = f[5]; sub(/^dirty=/, "", dirty)
    ahead = f[6]; sub(/^ahead=/, "", ahead)
    behind = f[7]; sub(/^behind=/, "", behind)

    key = wsname SUBSEP alias
    state_[key] = state; branch_[key] = branch
    base_[key] = base; dirty_[key] = dirty; ahead_[key] = ahead; behind_[key] = behind
    nrows[wsname]++
    rows[wsname, nrows[wsname]] = alias
  }
  END {
    for (i = 0; i < nws; i++) {
      wsname = wslist[i]
      prefix = sprintf("[%s]", wsname)
      verdict = wsverdict[wsname]
      gap = HDRWIDTH - length(prefix) - length(verdict)
      if (gap < 1) gap = 1
      spacer = ""
      for (k = 0; k < gap; k++) spacer = spacer " "
      printf "\n\033[48;5;238m%s%s\033[0m%s\n", prefix, spacer, colorstatus_right(verdict)
      hdr = sprintf("%s %s %s %s %s %s %s", pad("repo",12), pad("status",6), pad("branch",30), pad("base",12), pad("ahead",5), pad("behind",6), pad("tree",10))
      print hdr
      for (k = 0; k < length(hdr); k++) printf "-"
      printf "\n"
      n = nrows[wsname]
      if (n == 0) {
        print "  (no worktrees — empty workspace)"
        continue
      }
      # sort alias names for this workspace
      for (a = 1; a <= n; a++) sorted[a] = rows[wsname, a]
      for (a = 1; a <= n; a++)
        for (b = a+1; b <= n; b++)
          if (sorted[b] < sorted[a]) { tmp = sorted[a]; sorted[a] = sorted[b]; sorted[b] = tmp }
      for (a = 1; a <= n; a++) {
        alias = sorted[a]
        key = wsname SUBSEP alias
        status = (state_[key] == "free") ? "FREE" : "BUSY"
        printf "%s %s %s %s %s %s %s\n", \
          pad(alias,12), colorstatus(status,6), pad(trunc(branch_[key],30),30), \
          pad(trunc(base_[key],12),12), pad(ahead_[key],5), pad(behind_[key],6), \
          pad(dirtylabel(dirty_[key]),10)
      }
      delete sorted
    }
  }
'
