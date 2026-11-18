#!/usr/bin/env bash
# Fixed-width CPU / RAM readout for the tmux status bar.
# Wraps tmux-cpu-mem-monitor's scripts and left-pads the result to 6 chars
# ("100.0%" is the widest value), so the centred window list does not shift
# whenever the numbers change width.
# Usage: tmux-stat.sh cpu|mem
plugin="$HOME/.config/tmux/plugins/tmux-cpu-mem-monitor"
case "$1" in
  cpu|mem) ;;
  *) echo "usage: $0 cpu|mem" >&2; exit 1 ;;
esac
out="$("$plugin/venv/bin/python" "$plugin/src/$1.py" 2>/dev/null)"
printf '%6s' "${out:-?}"
