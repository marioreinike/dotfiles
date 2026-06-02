#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "unknown"')
DIR=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
USED=$(echo "$input" | jq -r '
  .context_window.current_usage as $u |
  if $u == null then 0
  else (($u.input_tokens // 0) + ($u.cache_creation_input_tokens // 0) + ($u.cache_read_input_tokens // 0))
  end
')
TOTAL=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
fmt_tokens() {
  local t=$1
  if [ "$t" -ge 1000000 ]; then
    printf "%.1fM" "$(echo "scale=1; $t / 1000000" | bc)"
  elif [ "$t" -ge 1000 ]; then
    printf "%.0fK" "$(echo "scale=0; $t / 1000" | bc)"
  else
    echo "$t"
  fi
}
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
TEXT="📁 ${DIR/#$HOME/~} [$MODEL] Context: $(fmt_tokens "$USED") / $(fmt_tokens "$TOTAL") (${PCT}%)"
if [ "$USED" -ge 250000 ]; then
  echo -e "\033[31m${TEXT}\033[0m"
else
  echo "$TEXT"
fi
