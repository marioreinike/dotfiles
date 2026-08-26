#!/usr/bin/env bash
# Shows how long the current foreground process in a pane has been running.
# Finds the tty's foreground process group (tpgid) and reports on it, unless
# it's just a bare shell prompt (nothing running). Args: pane_pid pane_tty
pane_pid="$1"
pane_tty="${2#/dev/}"

echo ""

fg_pgid=$(ps -o tpgid= -p "$pane_pid" 2>/dev/null | tr -d ' ')
line=""
if [ -n "$fg_pgid" ]; then
  line=$(ps -o pid=,etime=,command= -g "$fg_pgid" 2>/dev/null | head -1)
fi

if [ -n "$line" ]; then
  pid=$(echo "$line" | awk '{print $1}')
  etime=$(echo "$line" | awk '{print $2}')
  cmd=$(echo "$line" | sed -E 's/^ *[0-9]+ +[0-9:-]+ +//')
  cmdname=$(echo "$cmd" | awk '{print $1}')
  case "$cmdname" in
    -zsh | zsh | */zsh | -bash | bash | */bash | -sh | sh | */sh | -fish | fish | */fish)
      echo "  No foreground command running (shell idle)"
      ;;
    *)
      echo "  Running: $cmd"
      echo "  PID: $pid"
      echo "  Elapsed: $etime"
      ;;
  esac
else
  echo "  No foreground command running (shell idle)"
fi

echo ""
read -rsn1 </dev/tty
