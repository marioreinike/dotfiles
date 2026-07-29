---
name: repo-status
description: Per-workspace freeness snapshot across all dispatch workspaces (~/WORKSPACES). Shows, per workspace, every repo alias in it with branch, base, commits ahead/behind, and working-tree cleanliness, plus whether a live tmux session is open in it — so you can scan at a glance which workspaces/repos are free to use. Use when asked for a workspace/repo status snapshot, freeness overview, or "which repos are free" across workspaces. Keywords - repo status, workspace snapshot, freeness, which repos are free, repo overview, worktree status, claimed workspace, active session.
argument-hint: [-f|--fetch] [--no-tmux]
allowed-tools: Bash
---

# Repo Status

One-shot snapshot of every workspace under `~/WORKSPACES/wsN/*`, grouped by workspace — answers "what's the full repo detail for workspace N" and "which repos in it are free" in one view.

It wraps dispatch's `ws-scan.sh` (same `repos.conf` / workspaces root, same freeness rule) and reformats the result. By default the scan is offline (no fetch) — pass `-f`/`--fetch` to fetch `origin` first for every distinct repo discovered across the scanned worktrees (deduped, parallelized) if you need the absolute latest base.

## Usage

```bash
"${CLAUDE_SKILL_DIR}/scripts/repo-status.sh"            # offline (default)
"${CLAUDE_SKILL_DIR}/scripts/repo-status.sh" --fetch    # fetch origin first, then report
"${CLAUDE_SKILL_DIR}/scripts/repo-status.sh" --no-tmux  # git state only, ignore tmux sessions
```

Flags are forwarded to `ws-scan.sh` verbatim (it does the validation), so anything it accepts works here. Two exceptions: `--free` is rejected (this script's table needs `ws-scan.sh`'s `--report` output, always forced on), and `--no-tmux` is handled locally.

Output: one table per workspace, columns `repo | status (FREE/BUSY) | branch | base | ahead | behind | tree (clean / N change(s))`, rows sorted by repo alias. A workspace's table only lists the repo aliases it actually has a worktree for — not every workspace has every repo.

### Workspace verdicts

The workspace header carries a three-state verdict, precedence `BUSY > CLAIMED > FREE`:

| Verdict | Color | Meaning |
|---|---|---|
| `FREE` | green | every repo clean and fully merged, and no tmux session open in it |
| `CLAIMED` | orange | git-free, but a live tmux session is open in it — probably still in use, prefer another workspace |
| `BUSY` | red | at least one repo is dirty or ahead of its base (unmerged work) |

Any workspace with live sessions names them in the header row itself — orange `tmux: <sessions>` between the workspace name and the right-aligned verdict, truncated with `…` to the space left there — whatever the verdict, so you see open sessions on `BUSY` workspaces too. Session-to-workspace matching follows dispatch's naming (`<ws>-<feature>`): a session belongs to `ws7` when it is named `ws7` or starts with `ws7-`. Per-repo rows stay `FREE`/`BUSY`, since a tmux session belongs to a workspace, not to a single repo.

Just run it and print the output verbatim (it's already formatted plain text) — no need to re-summarize into prose unless the user asks a follow-up question about it.

## Notes
- Reuses dispatch's `repos.conf` and `ws-scan.sh` directly — if you add a new alias there, it shows up here automatically, no changes needed in this skill.
- Freeness per row = clean working tree AND 0 commits ahead of that repo's base branch (see dispatch's Freeness rule). For picking a workspace for a **new** dispatch, freeness must be judged per the *specific repos that dispatch will touch* — a BUSY row for an unrelated repo in the same workspace doesn't disqualify it. See the dispatch skill's PREPARE mode, step 2.
- `CLAIMED` is this skill's own signal, not part of `ws-scan.sh`'s git-only verdict — it comes from `tmux list-sessions` here. It's a hint, not proof: a session left open after the work was merged still reads as `CLAIMED` (kill it, or use `--no-tmux`), and a workspace with no session can still be someone's in-flight work.
- Env overrides `DISPATCH_CONF` / `DISPATCH_WORKSPACES` (same as `ws-scan.sh`) are passed through automatically since this script just shells out to it.
