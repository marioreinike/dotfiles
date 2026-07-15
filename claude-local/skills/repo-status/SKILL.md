---
name: repo-status
description: Per-workspace freeness snapshot across all dispatch workspaces (~/WORKSPACES). Shows, per workspace, every repo alias in it with branch, base, commits ahead/behind, and working-tree cleanliness — so you can scan at a glance which workspaces/repos are free to use. Use when asked for a workspace/repo status snapshot, freeness overview, or "which repos are free" across workspaces. Keywords - repo status, workspace snapshot, freeness, which repos are free, repo overview, worktree status.
argument-hint: (no arguments)
allowed-tools: Bash
---

# Repo Status

One-shot snapshot of every workspace under `~/WORKSPACES/wsN/*`, grouped by workspace — answers "what's the full repo detail for workspace N" and "which repos in it are free" in one view.

It wraps dispatch's `ws-scan.sh` (same `repos.conf` / workspaces root, same freeness rule and offline-comparison caveat — run `git fetch` in a repo first if you need the absolute latest base) and reformats the result.

## Usage

```bash
"${CLAUDE_SKILL_DIR}/scripts/repo-status.sh"
```

Output: one table per workspace, columns `repo | status (FREE/BUSY) | branch | base | ahead | behind | tree (clean / N change(s))`, rows sorted by repo alias. A workspace's table only lists the repo aliases it actually has a worktree for — not every workspace has every repo.

Just run it and print the output verbatim (it's already formatted plain text) — no need to re-summarize into prose unless the user asks a follow-up question about it.

## Notes
- Reuses dispatch's `repos.conf` and `ws-scan.sh` directly — if you add a new alias there, it shows up here automatically, no changes needed in this skill.
- Freeness per row = clean working tree AND 0 commits ahead of that repo's base branch (see dispatch's Freeness rule). For picking a workspace for a **new** dispatch, freeness must be judged per the *specific repos that dispatch will touch* — a BUSY row for an unrelated repo in the same workspace doesn't disqualify it. See the dispatch skill's PREPARE mode, step 2.
- Env overrides `DISPATCH_CONF` / `DISPATCH_WORKSPACES` (same as `ws-scan.sh`) are passed through automatically since this script just shells out to it.
