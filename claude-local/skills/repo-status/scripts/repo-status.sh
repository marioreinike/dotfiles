#!/usr/bin/env bash
#
# repo-status.sh — Per-workspace freeness snapshot with full repo detail.
#
# Wraps dispatch's ws-scan.sh (same repos.conf / workspaces root) and
# reformats its per-workspace report into one table per workspace, one row
# per repo alias in it, so you can scan a workspace's full repo detail (and
# which repos are free) in aligned columns. Each workspace header also shows
# an overall FREE/CLAIMED/BUSY verdict (FREE only when every repo in it is free,
# straight from ws-scan.sh's own verdict). Freeness rule and
# offline-comparison caveat are identical to ws-scan.sh — see its --help.
#
# CLAIMED (orange) is this script's own third state, layered on top of
# ws-scan.sh's git-only verdict: the workspace is git-free, but a live tmux
# session is open in it, so an agent is probably still working there — treat it
# as maybe-in-use rather than grabbing it. Dispatch names sessions
# "<ws>-<feature>", so a session belongs to a workspace when its name equals the
# workspace or is prefixed with "<ws>-". Precedence is BUSY > CLAIMED > FREE
# (unmerged work stays red), and any workspace with live sessions names them in
# its header row — between the workspace name and the verdict, truncated to the
# space left there — regardless of verdict. A BUSY workspace with no live
# session gets a bare dot after its badge, flagging unfinished work nobody
# is actively working on right now.
#
# Run -h/--help for flags. All args are forwarded to ws-scan.sh untouched, except
# --report (always forced, the awk below needs that format) and --free (rejected).

set -uo pipefail

DISPATCH_SCAN="$HOME/.claude/skills/dispatch/scripts/ws-scan.sh"
if [ ! -x "$DISPATCH_SCAN" ]; then
  echo "error: dispatch's ws-scan.sh not found at $DISPATCH_SCAN" >&2
  exit 1
fi

usage() {
  cat <<EOF
repo-status.sh — per-workspace freeness snapshot: one table per workspace, one row
per repo in it (branch, base, ahead, behind, tree). Wraps dispatch's ws-scan.sh.

Usage: repo-status.sh [flags]

Workspace verdicts:
  FREE     every repo clean and fully merged, no tmux session open
  CLAIMED  git-free, but a live tmux session is open in it (maybe in use)
  BUSY     at least one repo dirty or ahead of its base
           (a dot after BUSY marks a workspace with no live tmux session —
           unfinished work that nobody is actively working on right now)

Flags:
  -f, --fetch     fetch origin for every distinct repo before scanning
      --no-tmux   ignore tmux sessions (never report CLAIMED)
  -h, --help      show this help

Any other flag is forwarded to ws-scan.sh, which validates it. Exceptions:
--report is always forced (the table needs it) and --free is not supported here
(run ws-scan.sh --free instead).

Env: DISPATCH_CONF, DISPATCH_WORKSPACES, DISPATCH_WS_SCAN_PARALLEL — see ws-scan.sh
EOF
}

scan_args=()
USE_TMUX=1
for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    --no-tmux) USE_TMUX=0 ;;   # handled here, not a ws-scan.sh flag
    --free)
      echo "error: --free is incompatible with repo-status.sh (it needs ws-scan.sh's --report format)" >&2
      echo "       run: $DISPATCH_SCAN --free" >&2
      exit 2 ;;
    *) scan_args+=("$arg") ;;   # forwarded untouched; ws-scan.sh validates it
  esac
done
scan_args+=(--report)

raw="$("$DISPATCH_SCAN" "${scan_args[@]}")" || exit $?

# Live tmux session names, space-separated (empty when --no-tmux, tmux is missing,
# or no server is running). Matched against workspace names in the awk below.
sessions=""
if [ "$USE_TMUX" = "1" ] && command -v tmux >/dev/null 2>&1; then
  sessions="$(tmux list-sessions -F '#{session_name}' 2>/dev/null | tr '\n' ' ')"
fi

echo "$raw" | awk -v sessions="$sessions" '
  function trunc(s, n,   r) {
    if (length(s) <= n) return s
    r = substr(s, 1, n-1) "…"
    return r
  }
  function dirtylabel(d) {
    return (d == "0") ? "clean" : d " change(s)"
  }
  # Display width. awk here counts BYTES, and the "…" trunc() inserts is 3 bytes
  # but renders as one column — so discount 2 per occurrence, or every truncated
  # cell ends up 2 columns short and the table loses alignment.
  function dlen(s,   t, n) {
    t = s
    n = gsub(/…/, "", t)
    return length(s) - 2 * n
  }
  function pad(s, n) {
    while (dlen(s) < n) s = s " "
    return s
  }
  function colorstatus(s, n,   padded) {
    padded = pad(s, n)
    if (s == "FREE") return "\033[30;42m" padded "\033[0m"
    if (s == "CLAIMED") return "\033[30;48;5;208m" padded "\033[0m"
    return "\033[97;41m" padded "\033[0m"
  }
  function colorstatus_right(s) {
    return colorstatus(s, length(s))
  }
  # tmux sessions belonging to workspace ws, comma-separated ("" if none).
  function ws_sessions(ws,   i, out) {
    out = ""
    for (i = 1; i <= nsess; i++)
      if (sess[i] == ws || index(sess[i], ws "-") == 1)
        out = (out == "") ? sess[i] : out ", " sess[i]
    return out
  }
  BEGIN {
    nws = 0
    nsess = split(sessions, sess, " ")
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
      mysess = ws_sessions(wsname)
      # git-free but a session is still open in it: maybe in use, not free.
      if (verdict == "FREE" && mysess != "") verdict = "CLAIMED"
      # Session list shares the header row: "[wsN]  tmux: a, b        VERDICT",
      # truncated to whatever space is left between the name and the verdict.
      sesspart = ""
      if (mysess != "") {
        avail = HDRWIDTH - length(prefix) - length(verdict) - 3   # 2 lead spaces + 1 min gap
        if (avail >= 12) sesspart = "  tmux: " trunc(mysess, avail - 8)
      }
      # A bare dot after the BUSY badge flags a busy workspace with no live
      # tmux session in it — i.e. unfinished/unmerged work nobody is actively
      # working on right now, as opposed to BUSY-with-a-session.
      dot = (verdict == "BUSY" && mysess == "") ? " \033[91m\xe2\x97\x8f\033[0m" : ""
      gap = HDRWIDTH - length(prefix) - dlen(sesspart) - length(verdict)
      if (gap < 1) gap = 1
      spacer = ""
      for (k = 0; k < gap; k++) spacer = spacer " "
      printf "\n\033[48;5;238m%s\033[38;5;208m%s\033[39m%s\033[0m%s%s\n", prefix, sesspart, spacer, colorstatus_right(verdict), dot
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
