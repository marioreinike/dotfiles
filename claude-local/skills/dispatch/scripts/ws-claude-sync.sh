#!/usr/bin/env bash
#
# ws-claude-sync.sh — Merge every repo's .claude/{skills,commands,agents} inside
# a workspace into the workspace-level .claude/, as symlinks, so a Claude Code
# session started at the WORKSPACE ROOT (e.g. ~/WORKSPACES/ws1) can see the
# skills/commands/agents that live inside its nested repo worktrees
# (~/WORKSPACES/ws1/backend/.claude/skills/..., .../frontend/.claude/..., etc).
#
# Why this exists: Claude Code does NOT discover .claude/skills, .claude/commands
# or .claude/agents across separate git repos nested as subdirectories — only at
# the exact directory Claude was started in (plus ~/.claude). A session started
# at a workspace root sees none of its nested repos' skills/commands/agents
# unless they're physically present (or symlinked) directly under
# <workspace>/.claude/{skills,commands,agents}.
#
# What this script does NOT touch (real, per-workspace state — never overwritten):
#   <workspace>/.claude/settings.json
#   <workspace>/.claude/settings.local.json
#   <workspace>/.claude/hooks/
#   <workspace>/.claude/scheduled_tasks.lock
# It only manages symlinks inside <workspace>/.claude/{skills,commands,agents}/.
#
# Collision handling for skills and commands: if a name (skill dir / command
# file) exists in more than one repo inside the workspace, EVERY owner gets a
# "<alias>-<name>" symlink (no bare name) so it's unambiguous which repo it came
# from. If a name is unique to one repo, it gets the bare name — e.g. a lone
# "deploy" command symlinks as "deploy.md"; a "review-pr" command that exists in
# backend, frontend AND infra symlinks as "backend-review-pr.md",
# "frontend-review-pr.md", "infra-review-pr.md" (no bare "review-pr.md"). This
# works because Claude Code identifies a skill by its DIRECTORY NAME and a
# command by its FILENAME — confirmed empirically — so renaming the symlink
# actually changes what gets exposed.
#
# Agents are DIFFERENT and handled separately (sync_agents below): a subagent's
# identity is the `name:` field in its frontmatter, NOT its filename — renaming
# the symlink does nothing to fix a collision there. Confirmed empirically: two
# repos each shipping an agents/pr-reviewer.md with `name: pr-reviewer` in
# frontmatter collide even when symlinked as backend-pr-reviewer.md and
# frontend-pr-reviewer.md — one silently shadows the other. So for agents this
# script keeps only the first owner (alphabetically by alias) per effective
# frontmatter name and prints a warning naming the shadowed one(s); it will NOT
# rewrite a repo's frontmatter to resolve the clash — that's Mario's call.
#
# Idempotent — safe to rerun any time repos/worktrees in the workspace change
# (rerun after `dispatch prepare`, after pulling a repo's new skills, etc). Each
# run wipes stale symlinks under the three managed dirs and rebuilds from
# scratch; it never deletes a non-symlink (so it can't eat a real file by
# mistake).
#
# Usage:
#   ws-claude-sync.sh            # syncs $PWD — must itself be a valid workspace root
#   ws-claude-sync.sh ws3        # syncs ~/WORKSPACES/ws3
#   ws-claude-sync.sh /abs/path  # syncs an absolute workspace path

set -euo pipefail

WORKSPACES_ROOT="$HOME/WORKSPACES"

if [ $# -ge 1 ]; then
  case "$1" in
    /*) WS_DIR="$1" ;;
    *)  WS_DIR="$WORKSPACES_ROOT/$1" ;;
  esac
else
  WS_DIR="$PWD"
fi
WS_DIR="${WS_DIR%/}"

if [ ! -d "$WS_DIR" ]; then
  echo "error: workspace dir not found: $WS_DIR" >&2
  exit 1
fi

WS_NAME="$(basename "$WS_DIR")"
WS_PARENT="$(cd "$WS_DIR/.." && pwd)"

if [ "$WS_PARENT" != "$WORKSPACES_ROOT" ] || ! [[ "$WS_NAME" =~ ^ws[1-9]$ ]]; then
  echo "error: '$WS_DIR' is not a workspace root (expected \$HOME/WORKSPACES/ws1..ws9)" >&2
  echo "  (run with no argument from inside the workspace root, or pass 'wsN' / an absolute path to one)" >&2
  exit 1
fi

sync_category() {
  # skills/commands only — identity is directory/file name, safe to rename on
  # collision. Agents need sync_agents instead (see header note).
  local category="$1"   # skills | commands
  local kind="$2"        # dir | file
  local dest="$WS_DIR/.claude/$category"
  mkdir -p "$dest"

  # wipe only symlinks we manage — never touches a real file/dir
  find "$dest" -maxdepth 1 -type l -delete

  declare -A owners=()
  local repo_dir alias src entry name
  for repo_dir in "$WS_DIR"/*/; do
    alias="$(basename "$repo_dir")"
    [ "$alias" = ".claude" ] && continue
    src="${repo_dir}.claude/$category"
    [ -d "$src" ] || continue
    if [ "$kind" = "dir" ]; then
      for entry in "$src"/*/; do
        [ -d "$entry" ] || continue
        name="$(basename "$entry")"
        owners["$name"]+="$alias "
      done
    else
      for entry in "$src"/*.md; do
        [ -f "$entry" ] || continue
        name="$(basename "$entry")"
        owners["$name"]+="$alias "
      done
    fi
  done

  local aliases count link_name
  for name in "${!owners[@]}"; do
    aliases="${owners[$name]}"
    count=$(wc -w <<<"$aliases")
    for alias in $aliases; do
      if [ "$count" -gt 1 ]; then
        link_name="${alias}-${name}"
      else
        link_name="$name"
      fi
      ln -sfn "$WS_DIR/$alias/.claude/$category/$name" "$dest/$link_name"
    done
  done
}

sync_agents() {
  # Agent identity = frontmatter `name:`, not filename — see header note.
  # Keep first owner (alphabetical by alias) per effective name; warn on the rest.
  local dest="$WS_DIR/.claude/agents"
  mkdir -p "$dest"
  find "$dest" -maxdepth 1 -type l -delete

  declare -A name_owner=()
  declare -A name_shadowed=()
  local repo_dir alias src entry file effective_name

  for repo_dir in "$WS_DIR"/*/; do
    alias="$(basename "$repo_dir")"
    [ "$alias" = ".claude" ] && continue
    src="${repo_dir}.claude/agents"
    [ -d "$src" ] || continue
    for entry in "$src"/*.md; do
      [ -f "$entry" ] || continue
      file="$(basename "$entry")"
      effective_name="$(awk '/^---[[:space:]]*$/{c++; next} c==1 && /^name:[[:space:]]*/{sub(/^name:[[:space:]]*/,""); print; exit}' "$entry")"
      [ -z "$effective_name" ] && effective_name="${file%.md}"

      if [ -z "${name_owner[$effective_name]:-}" ]; then
        name_owner["$effective_name"]="$alias:$file"
        ln -sfn "$entry" "$dest/${alias}-${file}"
      else
        name_shadowed["$effective_name"]+="$alias:$file "
      fi
    done
  done

  for effective_name in "${!name_shadowed[@]}"; do
    echo "warning: agent name '$effective_name' collides (frontmatter, not filename) — using ${name_owner[$effective_name]}, shadowing: ${name_shadowed[$effective_name]}. Rename the 'name:' frontmatter in one of the .md files to expose both." >&2
  done
}

sync_category skills   dir
sync_category commands file
sync_agents

repos=()
for repo_dir in "$WS_DIR"/*/; do
  alias="$(basename "$repo_dir")"
  [ "$alias" = ".claude" ] && continue
  [ -d "${repo_dir}.claude" ] && repos+=("$alias")
done

echo "synced $WS_DIR/.claude/{skills,commands,agents} from: ${repos[*]:-<none>}"
echo "  skills:   $(find "$WS_DIR/.claude/skills" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')"
echo "  commands: $(find "$WS_DIR/.claude/commands" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')"
echo "  agents:   $(find "$WS_DIR/.claude/agents" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')"
