#!/usr/bin/env bash
#
# repo-status.sh — Per-workspace freeness snapshot with full repo detail.
#
# Wraps dispatch's ws-scan.sh (same repos.conf / workspaces root) and
# reformats its per-workspace report into one table per workspace, one row
# per repo alias in it, so you can scan a workspace's full repo detail (and
# which repos are free) in aligned columns. Freeness rule and
# offline-comparison caveat are identical to ws-scan.sh — see its --help.
#
# Usage:
#   repo-status.sh          grouped-by-workspace table (default)
#
# Env overrides (passed through to ws-scan.sh):
#   DISPATCH_CONF        path to repos.conf
#   DISPATCH_WORKSPACES  workspaces root

set -uo pipefail

DISPATCH_SCAN="$HOME/.claude/skills/dispatch/scripts/ws-scan.sh"
if [ ! -x "$DISPATCH_SCAN" ]; then
  echo "error: dispatch's ws-scan.sh not found at $DISPATCH_SCAN" >&2
  exit 1
fi

raw="$("$DISPATCH_SCAN" --report)"

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
  BEGIN {
    nws = 0
  }
  /^=== / {
    wsname = $2
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
      printf "\n[%s]\n", wsname
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
          pad(alias,12), pad(status,6), pad(trunc(branch_[key],30),30), \
          pad(trunc(base_[key],12),12), pad(ahead_[key],5), pad(behind_[key],6), \
          pad(dirtylabel(dirty_[key]),10)
      }
      delete sorted
    }
  }
'
