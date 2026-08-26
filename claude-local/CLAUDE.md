# Global Instructions

These apply to every Claude Code session, across all projects.

## Language

- Always respond in English, even when I write to you in another language. I want to practice and improve my English, so do not switch languages to match my input.
- When my English wording sounds unnatural or contains a clear error, give me a very short tip on how to phrase it better. Add it as one brief line at the end of your response. Only flag meaningful issues — skip minor style nitpicks.

## Git Safety

- NEVER run `git reset --hard` (or any other destructive/irreversible git command that discards uncommitted work) without my explicit, case-by-case permission. Always ask first and wait for my confirmation, even if it seems necessary to complete a task. There is no standing approval for this.

## Background Agents

- When launching background agents (Agent/Workflow tool calls), consider matching the model (Sonnet, Opus, or Fable) and reasoning effort to the task's complexity, rather than always defaulting to the inherited model.
- If you choose a different model than the current session's default for a specific agent, state which model (and effort, if non-default) before launching it.

## Local Resource Limits

Scope: applies only to the `backend` and `turborepo-frontend` repos, including any of their git worktrees (e.g. checkouts under `~/WORKSPACES/*`). Not a general rule for every project.

- In those repos, do NOT run typecheck, lint, build, or test commands on my local machine (`pnpm typecheck`, `tsc`, `pnpm build`, `pnpm test`, etc.) — my machine cannot handle the load and it crashes badly, which affects me a lot. This overrides any per-repo CLAUDE.md instruction that suggests running these locally.
- This also covers commands that trigger a full build/compile *indirectly* as a side effect — e.g. the backend repo's `pnpm migration:generate` runs a `pretypeorm` hook that does a full `nest build` with an 8GB memory allocation. Before running any unfamiliar pnpm/npm script locally in these repos, check what it actually invokes (pre/post hooks included) for a build/compile step, and avoid it if so.
- Default workflow instead: commit the changes, rebase onto the target base branch, push, and open a PR — then let CI run these checks on GitHub and monitor the PR's check runs for me. Report back what passed/failed from there.
- Only run one of these commands (including ones with a hidden build step) locally if I explicitly ask you to in the moment.

## Config Drift

- When you notice (via a system-reminder) that global `~/.claude/CLAUDE.md` or `~/.claude/settings.json` has changed, or before trusting a repo's `.claude/settings.local.json`, run `/sync-local-config` to check for drift against the dotfiles backup and for conflicts with repo-local settings.

## Identifiers

- ALWAYS print UUIDs, ObjectIDs, hashes, tokens, and other opaque IDs in full. Never truncate, abbreviate, ellipsize, or shorten them (no `abc123…`, no `abc12345...`, no first-8-chars-only). I need the complete value to copy-paste for debugging.
- This applies to all output: tables, summaries, lists, prose, code blocks, tool-call descriptions. If a table column gets wide, let it be wide — do not trim the ID.
- Same rule for git SHAs when I'm clearly using them to look something up: prefer the full 40-char SHA unless I explicitly asked for a short SHA.
