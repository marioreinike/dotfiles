#!/usr/bin/env bash
# Shows how long the currently running foreground command in a pane has
# been running (elapsed time), by comparing the pane's terminal foreground
# process group (tpgid) against the pane's shell pid. Args: pane_pid pane_tty
pane_pid="$1"
pane_tty="${2#/dev/}"

echo ""

fg_pgid=$(ps -o tpgid= -p "$pane_pid" 2>/dev/null | tr -d ' ')

if [ -n "$fg_pgid" ] && [ "$fg_pgid" != "$pane_pid" ]; then
  line=$(ps -o pid=,etime=,command= -g "$fg_pgid" 2>/dev/null | head -1)
  if [ -n "$line" ]; then
    pid=$(echo "$line" | awk '{print $1}')
    etime=$(echo "$line" | awk '{print $2}')
    cmd=$(echo "$line" | sed -E 's/^ *[0-9]+ +[0-9:-]+ +//')
    echo "  Running: $cmd"
    echo "  PID: $pid"
    echo "  Elapsed: $etime"
  else
    echo "  No foreground command running (shell idle)"
  fi
else
  echo "  No foreground command running (shell idle)"
fi

echo ""
read -rsn1 </dev/tty
