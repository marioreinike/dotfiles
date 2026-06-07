---
name: dispatch
description: Workspace dispatcher for git worktrees. Find a free workspace, prepare a new feature (fork branches across the repos you're touching) and launch a Claude session in tmux — or report the status of all workspaces (which are free, which still hold unfinished/unmerged work). Use when asked to start/prepare a feature, spin up a workspace, dispatch work, or check workspace/worktree status. Keywords - dispatch, dispatcher, workspace, worktree, prepare feature, new feature, free workspace, spin up, ws status.
argument-hint: status | prepare <feature-name> in <repos…>
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
---

# Dispatcher

You manage Mario's worktree-based workflow across two roots:

- **`~/REPOS/<repo>`** — the canonical clone of each repo, kept on its base/integration branch.
- **`~/WORKSPACES/wsN/<alias>`** — workspaces. Each `wsN` is a container; each child dir is a **git worktree** of a repo, named by an **alias** (e.g. `frontend` → repo `turborepo-frontend`). One feature occupies one workspace, with every touched repo on the **same branch**.

The alias → repo → base-branch map lives in `${CLAUDE_SKILL_DIR}/repos.conf` (whitespace table). Repos not listed fall back to their `origin/HEAD` default branch. Add a row when you adopt a new alias.

Two modes — **status** (read-only) and **prepare** (mutating, always confirm first).

## Freeness rule

A workspace is **FREE** when *every* worktree in it is clean (no uncommitted/untracked changes) **and** 0 commits ahead of its base branch (any work is already merged). Branch name is ignored — a worktree parked on a merged `feat/*` branch is still free. Workspaces with no worktrees are free (empty).

---

## Mode: STATUS

For "status of my workspaces", "which workspaces are free", "anything unmerged", etc.

```bash
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh"            # full report
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh" --free     # just FREE workspace names
```

Present a tidy summary: list **FREE** workspaces first, then **OCCUPIED** ones and *why* (which worktree is dirty, or on an unmerged branch — show branch + ahead/behind). Scan is offline; if the user needs the absolute latest, mention they can `git fetch` the repos first.

---

## Mode: PREPARE

For "prepare a new feature", "start feature X touching backend+frontend", "spin up a workspace".

### 1. Collect inputs
- **feature** — the branch/slug. If it contains `/`, use it verbatim as the branch; otherwise the branch is `feat/<feature>`. The **slug** is the part after the last `/`.
- **repos** — the aliases being touched (e.g. `backend frontend`). If not given, ask.

### 2. Pick a free workspace
```bash
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh" --free
```
If none are free → report status and stop. Otherwise prefer a free workspace that **already contains worktrees for all requested aliases** (fewest worktrees to create); break ties by lowest number. Set `WS` to its name.

### 3. Confirm the plan (REQUIRED before any mutation)
Show: chosen workspace, branch name, session name `${WS}-<slug>` (sanitize `/ : .` → `-`), the base branch per repo, and which aliases already have a worktree vs. which will be **created**. Wait for the user to confirm.

### 4. Create branches per touched alias
Resolve each alias from `repos.conf`:
```bash
CONF="${CLAUDE_SKILL_DIR}/repos.conf"
repo=$(awk -v a="$alias" '$1!~/^#/&&$1==a{print $2}' "$CONF")
base=$(awk -v a="$alias" '$1!~/^#/&&$1==a{print $3}' "$CONF")
REPO="$HOME/REPOS/$repo"; WT="$HOME/WORKSPACES/$WS/$alias"
[ -z "$base" ] && base=$(git -C "$REPO" symbolic-ref -q refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
git -C "$REPO" fetch origin            # refresh origin/<base> before forking
```
Verify the new branch name is unused: `git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH"` should fail. Then:

- **Worktree exists** (`[ -e "$WT/.git" ]`): fork it fresh from base —
  ```bash
  git -C "$WT" checkout -b "$BRANCH" "origin/$base"
  ```
- **Worktree missing**: create it, then handle env vars (next step) —
  ```bash
  git -C "$REPO" worktree add -b "$BRANCH" "$WT" "origin/$base"
  ```

### 5. Env vars for newly created worktrees
New worktrees do **not** inherit gitignored env files. For each worktree you just created, list candidates and **ask before copying** (these hold secrets — never auto-copy without a yes):
```bash
find "$REPO" -maxdepth 3 \( -name '.env' -o -name '.env.*' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*'
```
On confirmation, copy each to the same relative path under `$WT` (`mkdir -p` parents as needed). Existing worktrees (re-forked) already have their env files — skip them.

### 6. Launch the Claude session (detached)
```bash
SESSION="${WS}-${SLUG}"   # already sanitized
tmux has-session -t "$SESSION" 2>/dev/null && SESSION="${SESSION}-2"   # avoid clash
tmux new-session -d -s "$SESSION" -c "$HOME/WORKSPACES/$WS"
tmux send-keys -t "$SESSION" 'claude' Enter
```
Do **not** auto-attach. Tell the user to run: `tmux attach -t "$SESSION"`.

### 7. Report
Summarize: workspace, session name + attach command, and per repo the branch created, base it forked from, whether the worktree was created or reused, and any env files copied or still pending.

---

## Notes
- Never run mutating git/tmux commands before the user confirms the plan (step 3).
- If a requested alias isn't in `repos.conf` and isn't an obvious `~/REPOS` dir, ask the user for the repo dir + base branch, and offer to add a row to `repos.conf`.
- See `${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh -h` for the scanner's exact rules and env overrides (`DISPATCH_CONF`, `DISPATCH_WORKSPACES`).
