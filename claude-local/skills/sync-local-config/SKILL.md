---
name: sync-local-config
description: Detect and reconcile config drift between global Claude Code config (~/.claude/CLAUDE.md, ~/.claude/settings.json) and its dotfiles backup, and between global config and repo-local settings that may now conflict with it. Invoke when a system-reminder notes that global CLAUDE.md or settings.json changed, or before trusting a repo's .claude/settings.local.json.
---

# Sync Local Config

Two independent kinds of drift this skill checks for. Run both unless the trigger clearly implies only one.

## 1. Live global config vs. dotfiles backup

Compare:
- `~/.claude/CLAUDE.md` vs. `/Users/mario/REPOS/dotfiles/claude-local/CLAUDE.md`
- `~/.claude/settings.json` vs. `/Users/mario/REPOS/dotfiles/claude-local/settings.json`

If they differ, don't guess which side is correct. Show the diff and ask the user whether to:
- `/push` (live → repo), if the live file has the newer/intended change, or
- `/pull` (repo → live), if the repo is the source of truth and live drifted.

## 2. New global rule vs. repo-local settings conflicts

Only relevant when the global file's *content* actually changed (not just drifted from backup — a genuine new/edited rule).

Scan for `.claude/settings.local.json` in these repos (hardcoded, extend as new conflicts surface):
- `backend` (including any worktrees under `~/WORKSPACES/*`)
- `turborepo-frontend` (including any worktrees under `~/WORKSPACES/*`)

For each one found:
1. Read its allow/deny permission rules.
2. Check whether any rule now conflicts with the new/changed global CLAUDE.md instruction or global `settings.json` permission (e.g. a repo-local allow-rule for a command the global config now says never to run locally — see the "Local Resource Limits" section as the precedent case from 2026-08).
3. If a conflict is found, summarize it clearly (what the global rule says, what the repo-local rule allows, why they clash) and hand off to the `update-config` skill to actually edit the repo-local file. Do not edit `settings.local.json` yourself inline — always delegate to `update-config` and let the user confirm.

## Notes

- This skill is agent-noticed, not hook-enforced: it relies on an agent seeing a "file changed" system-reminder or being asked to trust repo-local settings. There's no guaranteed trigger.
- Never auto-apply repo-local settings changes without surfacing the conflict to the user first — these affect what commands run unattended in other repos.
