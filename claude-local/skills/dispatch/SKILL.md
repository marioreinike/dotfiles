---
name: dispatch
description: Workspace dispatcher for git worktrees. Find a free workspace, prepare a new feature (fork branches across the repos you're touching) and launch a Claude session in tmux; launch a Claude session directly inside a repo clone (no worktree); or report the status of all workspaces (which are free, which still hold unfinished/unmerged work). Use when asked to start/prepare a feature, spin up a workspace, dispatch work in a repo, or check workspace/worktree status. Keywords - dispatch, dispatcher, workspace, worktree, no worktree, in repo, prepare feature, new feature, free workspace, spin up, ws status, seed prompt, starting prompt, run with model, specific model.
argument-hint: status | prepare <feature> in <repos…> [with <model>] [: <objective>] | repo <alias> [with <model>] [: <objective>]
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
---

# Dispatcher

You manage Mario's worktree-based workflow across two roots:

- **`~/REPOS/<repo>`** — the canonical clone of each repo, kept on its base/integration branch.
- **`~/WORKSPACES/wsN/<alias>`** — workspaces. Each `wsN` is a container; each child dir is a **git worktree** of a repo, named by an **alias** (e.g. `frontend` → repo `turborepo-frontend`). One feature occupies one workspace, with every touched repo on the **same branch**.

The alias → repo → base-branch map lives in `${CLAUDE_SKILL_DIR}/repos.conf` (whitespace table). Repos not listed fall back to their `origin/HEAD` default branch. Add a row when you adopt a new alias.

Three modes — **status** (read-only), **prepare** (worktree-based, mutating, always confirm first), and **repo** (launch a session directly inside a `~/REPOS/<repo>` clone, no worktree).

**Launch command (all modes).** Every Claude session starts in auto mode with its display name (`--name`) set to the tmux session (`$SESSION`). Two optional additions, assembled into flags once and reused by both launch modes:

- **Model** — if the user names one ("dispatch with opus", "use sonnet"), pass it through with `--model`. Accepts an alias (`opus`, `sonnet`, `haiku`) or a full model ID. Omit to inherit the default.
- **Remote control** — opt-in; add `--remote-control "$SESSION"` *only* when the user explicitly says "remote".

```bash
MODEL_FLAG=""; [ -n "$MODEL" ] && MODEL_FLAG=" --model $MODEL"   # $MODEL = the model the user asked for, else empty
REMOTE_FLAG=""                                                   # only if the user asked "remote": REMOTE_FLAG=" --remote-control $SESSION"
```
Never launch plain `claude` (no auto mode, no name).

**Seeding a task prompt (optional) — the agent starts working on launch instead of idling.** Only when the user gave a **detailed objective**; without one, launch idle. The prompt is passed as a **positional argument read from a file**, so multi-line text, quotes, `$`, and backticks pass through verbatim (command-substitution output is a single argument, never re-parsed) — no `send-keys` escaping games:
```bash
mkdir -p "$HOME/.cache/dispatch"
PROMPT_FILE="$HOME/.cache/dispatch/${SESSION}.prompt"
# Write the composed prompt to $PROMPT_FILE with the Write tool (multi-line, no escaping).
# Compose it from the objective PLUS the scope you resolved — the repos in play, the branch each is
# on and the base it forked from, and the working dir — so the agent knows its boundaries.
```

Launch — **seeded** (objective given) vs **idle** (none). `\$(cat …)` is escaped so the *pane's* shell expands it, not the dispatcher's:
```bash
# seeded — agent starts immediately on the prompt:
tmux send-keys -t "$SESSION" "claude --permission-mode auto --name \"$SESSION\"$MODEL_FLAG$REMOTE_FLAG \"\$(cat $PROMPT_FILE)\"" Enter
# idle — empty prompt, waits for a human:
tmux send-keys -t "$SESSION" "claude --permission-mode auto --name \"$SESSION\"$MODEL_FLAG$REMOTE_FLAG" Enter
```
The prompt file is named per session and overwritten on re-dispatch; harmless to leave under `~/.cache/dispatch/`.

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
- **objective** (optional) — a detailed task for the agent. If given, it's seeded so the session starts working on launch (see **Launch command**); compose the final prompt from this plus the repo scope resolved in step 4. If absent, the session launches idle.
- **model** (optional) — a model alias or ID to run the session under (`--model`). If absent, inherits the default.

### 2. Pick a free workspace
```bash
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh" --free
```
If none are free → report status and stop. Otherwise prefer a free workspace that **already contains worktrees for all requested aliases** (fewest worktrees to create); break ties by lowest number. Set `WS` to its name.

### 3. Confirm the plan (REQUIRED before any mutation)
Show: chosen workspace, branch name, session name `${WS}-<slug>` (sanitize `/ : .` → `-`), the base branch per repo, which aliases already have a worktree vs. which will be **created**, the **model** (if any), and whether the session will be **seeded** with the objective or launch idle. Wait for the user to confirm.

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
```
Then assemble `MODEL_FLAG`/`REMOTE_FLAG` and launch per **Launch command (all modes)** above. If the user gave an objective, first write it — plus the per-repo branch/base scope from step 4 and the workspace path — to `$PROMPT_FILE` and use the **seeded** launch so the agent starts immediately; otherwise use the **idle** launch.

Do **not** auto-attach. Tell the user to run: `tmux attach -t "$SESSION"`.

### 7. Report
Summarize: workspace, session name + attach command, and per repo the branch created, base it forked from, whether the worktree was created or reused, and any env files copied or still pending.

---

## Mode: REPO (no worktree)

For "dispatch a session in <repo>", "spin up Claude inside backend (no worktree)", "just launch Claude in the repo". No workspace, no worktree, no branch forking — just a tmux session running Claude in the canonical clone at `~/REPOS/<repo>`. As in PREPARE, accept an optional **model** and **objective** — if an objective is given the session is seeded so the agent starts immediately (see **Launch command**).

### 1. Resolve the repo dir
Accept an **alias** (resolved via `repos.conf`) or a bare repo/dir name:
```bash
CONF="${CLAUDE_SKILL_DIR}/repos.conf"
repo=$(awk -v a="$arg" '$1!~/^#/&&$1==a{print $2}' "$CONF")   # alias → repo
[ -z "$repo" ] && repo="$arg"                                 # else treat arg as the repo dir name
REPO="$HOME/REPOS/$repo"
```
If `$REPO` isn't an existing git repo, report it and stop.

### 2. Confirm (REQUIRED before launching)
Show: the repo dir, its current branch, the session name, the **model** (if any), and whether the session is **seeded** with an objective or idle. Branch handling: stay on the **current branch by default**. Only create/switch a branch if the user explicitly asked — there's no worktree isolation here, so a checkout mutates the working clone. Wait for confirmation.

### 3. Launch the Claude session (detached)
```bash
SESSION="$repo"   # named exactly as the repo; sanitize / : . → -
tmux has-session -t "$SESSION" 2>/dev/null && SESSION="${SESSION}-2"   # avoid clash
tmux new-session -d -s "$SESSION" -c "$REPO"
```
Then assemble `MODEL_FLAG`/`REMOTE_FLAG` and launch per **Launch command (all modes)** above. If the user gave an objective, first write it — plus the repo dir and the branch it's on — to `$PROMPT_FILE` and use the **seeded** launch; otherwise use the **idle** launch.

Do **not** auto-attach. Tell the user: `tmux attach -t "$SESSION"`.

### 4. Report
Summarize: repo dir, branch the session is on, session name + attach command.

---

## Notes
- Never run mutating git/tmux commands before the user confirms the plan (step 3).
- If a requested alias isn't in `repos.conf` and isn't an obvious `~/REPOS` dir, ask the user for the repo dir + base branch, and offer to add a row to `repos.conf`.
- See `${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh -h` for the scanner's exact rules and env overrides (`DISPATCH_CONF`, `DISPATCH_WORKSPACES`).
