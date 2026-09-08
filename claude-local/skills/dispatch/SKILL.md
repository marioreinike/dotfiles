---
name: dispatch
description: Workspace dispatcher for git worktrees. Find a free workspace, prepare a new feature (fork branches across the repos you're touching) and launch a Claude session in tmux; report the status of all workspaces (which are free, which still hold unfinished/unmerged work); merge a workspace's nested repos' .claude/{skills,commands,agents} into the workspace root so a session started there can see them; or, only when explicitly asked for bare/no-worktree, launch a Claude session directly inside a repo clone. Defaults to the workspace/worktree flow (PREPARE) — bare REPO mode requires explicit request. Use when asked to start/prepare a feature, spin up a workspace, dispatch work in a repo, check workspace/worktree status, or sync/resync/refresh/merge a workspace's skills, commands, or subagents. Keywords - dispatch, dispatcher, workspace, worktree, bare, no worktree, prepare feature, new feature, free workspace, spin up, ws status, seed prompt, starting prompt, run with model, specific model, effort, reasoning effort, xhigh, claimed workspace, replace claim, take over workspace, kill session, sync skills, sync commands, resync workspace, merge repo skills, refresh claude folder, workspace skills not showing up.
argument-hint: status | prepare <feature> in <repos…> [with <model>] [effort <level>] [: <objective>] | repo <alias> bare [with <model>] [effort <level>] [: <objective>] | sync [wsN]
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
---

# Dispatcher

You manage Mario's worktree-based workflow across two roots:

- **`~/REPOS/<repo>`** — the canonical clone of each repo, kept on its base/integration branch.
- **`~/WORKSPACES/wsN/<alias>`** — workspaces. Each `wsN` is a container; each child dir is a **git worktree** of a repo, named by an **alias** (e.g. `frontend` → repo `turborepo-frontend`). One feature occupies one workspace, with every touched repo on the **same branch**.

The alias → repo → base-branch map lives in `${CLAUDE_SKILL_DIR}/repos.conf` (whitespace table). Repos not listed fall back to their `origin/HEAD` default branch. Add a row when you adopt a new alias.

Four modes — **status** (read-only), **prepare** (worktree-based, mutating, always confirm first), **sync** (merge nested repos' `.claude/{skills,commands,agents}` into the workspace root — mutates only symlinks it owns, no confirmation needed), and **repo** (launch a session directly inside a `~/REPOS/<repo>` clone, no worktree).

**Mode selection defaults to PREPARE.** When asked to dispatch/launch a session for one or more repos, use PREPARE (workspace + worktree) unless the user's wording explicitly asks for bare/no-worktree — e.g. "bare", "no worktree", "directly in the repo clone", "without a worktree". Casual phrasing like "dispatch backend" or "spin up a session in backend" is PREPARE, not REPO. Only fall back to REPO mode on that explicit signal.

**Launch command (all modes).** Every Claude session starts in auto mode with its display name (`--name`) set to the tmux session (`$SESSION`). Three optional additions, assembled into flags once and reused by both launch modes:

- **Model** — if the user names one ("dispatch with opus", "use sonnet", "model fable"), pass it through with `--model`. Accepts an alias (`opus`, `sonnet`, `haiku`, `fable`) or a full model ID. Omit to inherit the default.
- **Effort** — if the user names a reasoning effort ("effort xhigh", "with high effort"), pass it through with `--effort <level>`. Valid levels: `low`, `medium`, `high`, `xhigh`, `max`. Omit to inherit the session default. (Confirm with `claude --help` if a level is ever rejected.)
- **Remote control** — opt-in; add `--remote-control "$SESSION"` *only* when the user explicitly says "remote".

```bash
MODEL_FLAG=""; [ -n "$MODEL" ] && MODEL_FLAG=" --model $MODEL"      # $MODEL = the model the user asked for, else empty
EFFORT_FLAG=""; [ -n "$EFFORT" ] && EFFORT_FLAG=" --effort $EFFORT" # $EFFORT = the effort level asked for, else empty
REMOTE_FLAG=""                                                      # only if the user asked "remote": REMOTE_FLAG=" --remote-control $SESSION"
```
Never launch plain `claude` (no auto mode, no name).

**Seeding the launch prompt — always, not just when there's a task.** Every launch writes a prompt file, even with no objective: a workspace directory can hold worktrees for repos this dispatch never touches (other features parked there), so the agent needs to be told up front which subdirectories are in scope and which to leave alone. The prompt is passed as a **positional argument read from a file**, so multi-line text, quotes, `$`, and backticks pass through verbatim (command-substitution output is a single argument, never re-parsed) — no `send-keys` escaping games:
```bash
mkdir -p "$HOME/.cache/dispatch"
PROMPT_FILE="$HOME/.cache/dispatch/${SESSION}.prompt"
# Always write, with the Write tool:
#  - the repos in scope for THIS session: alias, branch, base it forked from
#  - if other worktrees exist in this workspace dir for repos not requested, name them
#    explicitly and say they belong to unrelated work — do not explore or modify them
#  - the objective, if the user gave one; otherwise say the agent should wait for instructions
```

Launch always sends the prompt file (never a bare empty invocation) — call it **seeded** (has an objective) vs **scoped** (no objective, just the repo-focus note, agent waits for a human). `\$(cat …)` is escaped so the *pane's* shell expands it, not the dispatcher's:
```bash
tmux send-keys -t "$SESSION" "claude --permission-mode auto --name \"$SESSION\"$MODEL_FLAG$EFFORT_FLAG$REMOTE_FLAG \"\$(cat $PROMPT_FILE)\"" Enter
```
The prompt file is named per session and overwritten on re-dispatch; harmless to leave under `~/.cache/dispatch/`.

## Freeness rule

A workspace is **FREE** when *every* worktree in it is clean (no uncommitted/untracked changes) **and** 0 commits ahead of its base branch (any work is already merged). Branch name is ignored — a worktree parked on a merged `feat/*` branch is still free. Workspaces with no worktrees are free (empty).

A workspace qualifies for a new dispatch only when `ws-scan.sh`'s overall verdict is FREE — i.e. **every** worktree in it is free, not just the ones matching the requested aliases. A workspace holding unrelated BUSY worktrees (leftover from other features) does not qualify, even if all the requested aliases themselves would be free.

### CLAIMED workspaces (free, but a session is open)

`ws-scan.sh` only looks at git state. A workspace can be FREE by that rule and still have a live tmux session sitting in it — someone (usually another Claude agent) claimed it and either finished-and-merged or hasn't produced changes yet. Call that **CLAIMED**: usable, but only after Mario decides to evict the current occupant.

A workspace is claimed when a live tmux session is named after it — dispatch names sessions `<ws>-<slug>`, so any session equal to `$WS` or prefixed `$WS-`:
```bash
tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -E "^${WS}(-|$)"
```
Prefer unclaimed FREE workspaces; only offer a takeover when every FREE workspace is claimed (see PREPARE step 2). The `repo-status` skill shows this same state as an orange `CLAIMED` verdict.

---

## Mode: STATUS

For "status of my workspaces", "which workspaces are free", "anything unmerged", etc.

```bash
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh"                # full report (offline)
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh" --free         # just FREE workspace names
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh" --fetch        # fetch origin first (every distinct repo, deduped + parallelized), then full report
```

Present a tidy summary: list **FREE** workspaces first, then **OCCUPIED** ones and *why* (which worktree is dirty, or on an unmerged branch — show branch + ahead/behind). Scan is offline by default; if the user needs the absolute latest, add `--fetch` (or `-f`) instead of manually fetching each repo.

For a **fuller per-repo detail view** instead (branch/base/ahead/behind/tree columns per repo, grouped by workspace), use the separate `repo-status` skill — it wraps this same `ws-scan.sh`, so it's always in sync.

---

## Mode: SYNC

For "sync ws3's claude skills", "resync workspace commands", "merge repo skills into ws1", "refresh the workspace .claude folder", or when a session at a workspace root can't see a command/skill/agent that clearly exists inside one of its nested repos (e.g. "Unknown command: /review-pr" from a workspace root — that repo's `.claude/commands` hasn't been synced, or the running session predates the last sync).

A Claude session started at a workspace root (`~/WORKSPACES/wsN`, not inside any single repo worktree) does not natively discover `.claude/skills`, `.claude/commands`, or `.claude/agents` living inside its nested repo worktrees — Claude Code only discovers those at the exact directory a session starts in (confirmed empirically: neither on-demand discovery nor `alias:command` namespacing reaches across nested `.git` boundaries). This mode fixes that by symlinking them into the workspace root.

```bash
"${CLAUDE_SKILL_DIR}/scripts/ws-claude-sync.sh" [wsN]
```
- No argument → syncs `$PWD`, but only after validating it's actually `$HOME/WORKSPACES/ws1`–`ws9` (errors out otherwise rather than doing something to an arbitrary directory).
- `wsN` or an absolute path → syncs that workspace regardless of `$PWD`.

What it does: for every nested repo worktree with a `.claude/` dir, symlinks its `skills/*`, `commands/*`, `agents/*` entries into `wsN/.claude/{skills,commands,agents}/`. Collision handling differs by type because identity differs by type (confirmed empirically, not assumed):
- **Skills** (identity = directory name) and **commands** (identity = filename): a name unique to one repo keeps its bare name; a name shared by multiple repos gets `<alias>-<name>` for every owner, so nothing silently shadows.
- **Agents** (identity = the `name:` frontmatter field, *not* the filename): renaming the symlink doesn't change what gets exposed — two repos each shipping a `pr-reviewer.md` with `name: pr-reviewer` still collide even when symlinked as `backend-pr-reviewer.md` / `frontend-pr-reviewer.md`. The script keeps the first owner (alphabetical by alias) and prints `warning: agent name '<name>' collides ...` naming who got shadowed. It will not rewrite a repo's frontmatter to resolve this — that's a call for Mario to make in the source repo (rename one's `name:` field so both coexist).

Never touches `wsN/.claude/settings.json`, `settings.local.json`, `hooks/`, or `scheduled_tasks.lock` — those are real, per-workspace state (accumulated permission approvals, scheduled task locks), not managed by this script. Only manages symlinks inside the three subdirectories above; idempotent, safe to rerun any time (after a `git pull` in a repo, after manually adding/removing a worktree, etc).

Report the printed skills/commands/agents counts and relay any `warning:` lines verbatim. **Note the running-session caveat:** a Claude session already running in that workspace loaded its command/skill list at launch — syncing afterward doesn't hot-reload it; the session needs a restart to see the change. New PREPARE launches always get a fresh sync first (see PREPARE step 6), so this mainly matters for resyncing a workspace the user is about to reattach to, or one whose repos changed since it was dispatched.

---

## Mode: PREPARE

For "prepare a new feature", "start feature X touching backend+frontend", "spin up a workspace".

### 1. Collect inputs
- **feature** — the branch/slug. If it contains `/`, use it verbatim as the branch; otherwise the branch is `feat/<feature>`. The **slug** is the part after the last `/`.
- **repos** — the aliases being touched (e.g. `backend frontend`). If not given, ask.
- **objective** (optional) — a detailed task for the agent. Whether given or not, the session is always seeded with the repo scope resolved in step 4 (see **Launch command**); if an objective is given it's appended so the agent starts working immediately, otherwise the agent waits after being told its scope.
- **model** (optional) — a model alias or ID to run the session under (`--model`). If absent, inherits the default.
- **effort** (optional) — reasoning effort level for the session (`--effort`: `low`/`medium`/`high`/`xhigh`/`max`). If absent, inherits the default.

### 2. Pick a free workspace
```bash
"${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh" --free
tmux list-sessions -F '#{session_name}' 2>/dev/null   # which of them are CLAIMED
```
Only workspaces in the FREE list qualify (see Freeness rule above — the whole workspace must be free, not just the requested aliases). Split that list into **unclaimed** (no session named `<ws>` or `<ws>-*`) and **claimed**.

If none qualify → report status and stop. Otherwise pick from **unclaimed first**: prefer one that **already contains worktrees for all requested aliases** (fewest worktrees to create); break ties by lowest number. Set `WS` to its name. If the workspace also holds unrelated worktrees (aliases outside the requested set), note them — they'll need callout in the launch prompt (step 7) so the agent doesn't touch them.

**If every FREE workspace is claimed → ask Mario, never decide yourself.** Use `AskUserQuestion`: one option per claimed workspace (label `wsN`, description = its live session names, what's running in each pane, and which requested aliases it already has), so he picks whose claim gets replaced. Include a "none — abort" option. For each candidate show what would be killed:
```bash
for S in $(tmux list-sessions -F '#{session_name}' | grep -E "^${WS}(-|$)"); do
  echo "$S: $(tmux list-panes -a -t "$S" -F '#{pane_current_command}' | sort -u | paste -sd, -)"
done
```
A pane running `claude` means an agent is live in there — say so explicitly in the option's description, since replacing the claim kills it mid-work. Do not offer a takeover for BUSY workspaces: unmerged or dirty work is never evictable this way.

### 2b. Replace the claim (only after Mario picks a claimed workspace)
Run this **before** step 3's confirmation, so the plan reflects a clean workspace, and only for the workspace he chose:
```bash
for S in $(tmux list-sessions -F '#{session_name}' | grep -E "^${WS}(-|$)"); do
  tmux kill-session -t "$S"                       # kills the pane's claude process with it
  rm -f "$HOME/.cache/dispatch/${S}.prompt"       # stale seed prompt of the evicted session
done
```
The new dispatch then proceeds normally and gets the fresh name `${WS}-${SLUG}` from step 7 — because the old sessions are gone, the `-2` clash suffix must **not** kick in. If a name collision still shows up after the kills, something else owns that name: stop and report instead of silently suffixing. Killed sessions leave the worktrees exactly as they were (clean + merged, that's why they qualified); step 4 re-forks each requested alias from its base anyway.

**Hard cap: 9 workspaces (`ws1`–`ws9`), never more.** Never create a new `wsN` directory to work around a lack of free workspaces — `~/WORKSPACES` is capped at `ws1..ws9`, all managed manually by Mario. If every existing workspace is BUSY, dispatch **must fail**: report full status (which workspace, which repo, why it's busy) and stop. Do not fall back to creating `ws10` or higher.

### 3. Confirm the plan (REQUIRED before any mutation)
Show: chosen workspace, branch name, session name `${WS}-<slug>` (sanitize `/ : .` → `-`), the base branch per repo, which aliases already have a worktree vs. which will be **created**, any unrelated worktrees in the workspace that will be called out as off-limits, the **model** and **effort** (if any), whether the session will be **seeded** with the objective or just the scope note, and — if the workspace was claimed — which sessions were killed to replace the claim. Wait for the user to confirm.

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

### 6. Sync repo skills/commands/agents into the workspace root
Run **Mode: SYNC** above against `$WS` (`"${CLAUDE_SKILL_DIR}/scripts/ws-claude-sync.sh" "$WS"`) so the session launched in step 7 can see the repos' skills/commands/agents from the moment it starts. Relay any `warning:` lines it prints in the step 8 report.

### 7. Launch the Claude session (detached)
```bash
SESSION="${WS}-${SLUG}"   # already sanitized
tmux has-session -t "$SESSION" 2>/dev/null && SESSION="${SESSION}-2"   # avoid clash
tmux new-session -d -s "$SESSION" -c "$HOME/WORKSPACES/$WS"
```
Then assemble `MODEL_FLAG`/`EFFORT_FLAG`/`REMOTE_FLAG`. Always write `$PROMPT_FILE` with the per-repo branch/base scope from step 4, the workspace path, and — if any unrelated worktrees share this workspace — their aliases flagged as off-limits; if the user gave an objective, append it so the agent starts working immediately, otherwise close with an instruction to wait for a human. Launch per **Launch command (all modes)** above.

Do **not** auto-attach. Tell the user to run: `tmux attach -t "$SESSION"`.

### 8. Report
Summarize: workspace, session name + attach command, and per repo the branch created, base it forked from, whether the worktree was created or reused, and any env files copied or still pending. Note any unrelated worktrees in the workspace flagged as off-limits to the agent, any skill/command/agent sync warnings from step 6, and — on a takeover — the session names that were killed to free the claim.

---

## Mode: REPO (no worktree)

For explicit bare requests only — "dispatch backend bare", "spin up Claude inside backend, no worktree", "just launch Claude directly in the repo clone". No workspace, no worktree, no branch forking — just a tmux session running Claude in the canonical clone at `~/REPOS/<repo>`. As in PREPARE, accept an optional **model**, **effort**, and **objective** — if an objective is given it's appended to the seeded scope note so the agent starts immediately (see **Launch command**).

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
Show: the repo dir, its current branch, the session name, the **model** and **effort** (if any), and whether the session is **seeded** with an objective or just the scope note. Branch handling: stay on the **current branch by default**. Only create/switch a branch if the user explicitly asked — there's no worktree isolation here, so a checkout mutates the working clone. Wait for confirmation.

### 3. Launch the Claude session (detached)
```bash
SESSION="$repo"   # named exactly as the repo; sanitize / : . → -
tmux has-session -t "$SESSION" 2>/dev/null && SESSION="${SESSION}-2"   # avoid clash
tmux new-session -d -s "$SESSION" -c "$REPO"
```
Then assemble `MODEL_FLAG`/`EFFORT_FLAG`/`REMOTE_FLAG`. Always write `$PROMPT_FILE` with the repo dir and the branch it's on; if the user gave an objective, append it so the agent starts working immediately, otherwise close with an instruction to wait for a human. Launch per **Launch command (all modes)** above.

Do **not** auto-attach. Tell the user: `tmux attach -t "$SESSION"`.

### 4. Report
Summarize: repo dir, branch the session is on, session name + attach command.

---

## Notes
- Never run mutating git/tmux commands before the user confirms the plan (step 3). The one exception is the claim replacement in step 2b — it *is* the thing Mario just approved in the step 2 question, and it has to happen before the plan can name a clean workspace.
- Killing a claimed session is only ever allowed on Mario's explicit pick in step 2, one workspace at a time. Never kill sessions to "make room" on your own, never for a BUSY workspace, and never batch-kill several workspaces' sessions.
- If a requested alias isn't in `repos.conf` and isn't an obvious `~/REPOS` dir, ask the user for the repo dir + base branch, and offer to add a row to `repos.conf`.
- See `${CLAUDE_SKILL_DIR}/scripts/ws-scan.sh -h` for the scanner's exact rules and env overrides (`DISPATCH_CONF`, `DISPATCH_WORKSPACES`).
