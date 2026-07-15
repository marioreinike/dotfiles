# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This repo is Mario's personal dotfiles/setup repository. It stores all computer configurations and Claude Code configurations as a single source of truth. When Mario asks to update a configuration, the workflow is:

1. **Read** the current config from the live location on the computer
2. **Modify** the config as requested (on the computer if instructed, or just in the repo)
3. **Update** the corresponding file in this repo
4. **Commit** the change with a short, precise message

## Repo Structure

```
.claude/          → Project-level: sync skills and repo permissions (NOT backed up configs)
claude-local/     → Mirror of ~/.claude/ (backup for restoring on a new computer)
git/              → Git config (~/.gitconfig, includes delta diff config) and global gitignore (~/.config/git/ignore)
lazygit/          → Lazygit config (~/.config/lazygit/config.yml)
zsh/              → Zsh shell config (~/.zshrc) and Powerlevel10k theme (~/.p10k.zsh)
atuin/            → Atuin shell history config (~/.config/atuin/config.toml)
gh/               → GitHub CLI config (~/.config/gh/config.yml)
zed/              → Zed editor settings and keymap (~/.config/zed/)
1password/        → 1Password SSH agent config (~/.config/1Password/ssh/agent.toml)
nvim/             → Neovim config with NvChad (~/.config/nvim/lua/ and .stylua.toml)
tmux/             → Tmux terminal multiplexer config (~/.config/tmux/)
nano/             → Nano editor config (~/.nanorc)
agent-monitor/    → Claude Code agent dashboard scripts (~/.local/bin/)
applock/          → Port-lease manager so competing agents don't collide running apps (~/.local/bin/applock)
```

## File-to-System Mapping

| Repo file | Live location |
|---|---|
| `git/gitconfig` | `~/.gitconfig` |
| `git/gitignore_global` | `~/.config/git/ignore` |
| `lazygit/config.yml` | `~/.config/lazygit/config.yml` |
| `zsh/zshrc` | `~/.zshrc` |
| `zsh/p10k.zsh` | `~/.p10k.zsh` |
| `atuin/config.toml` | `~/.config/atuin/config.toml` |
| `gh/config.yml` | `~/.config/gh/config.yml` |
| `zed/settings.json` | `~/.config/zed/settings.json` |
| `zed/keymap.json` | `~/.config/zed/keymap.json` |
| `1password/ssh-agent.toml` | `~/.config/1Password/ssh/agent.toml` |
| `nvim/lua/*` | `~/.config/nvim/lua/*` |
| `nvim/.stylua.toml` | `~/.config/nvim/.stylua.toml` |
| `nano/nanorc` | `~/.nanorc` |
| `nano/typescript.nanorc` | `~/.nano/typescript.nanorc` |
| `tmux/tmux.conf` | `~/.config/tmux/tmux.conf` |
| `tmux/tmux-cheatsheet` | `~/.config/tmux/tmux-cheatsheet` |
| `tmux/tmux-pane-manager.sh` | `~/.config/tmux/tmux-pane-manager.sh` |
| `agent-monitor/claude-dashboard` | `~/.local/bin/claude-dashboard` |
| `agent-monitor/claude-notify` | `~/.local/bin/claude-notify` |
| `agent-monitor/claude-state-hook` | `~/.local/bin/claude-state-hook` |
| `agent-monitor/claude-format-hook` | `~/.local/bin/claude-format-hook` |
| `applock/applock` | `~/.local/bin/applock` |
| `applock/services.example.json` | (seeds `~/.applock/services.json` on first use; runtime state under `~/.applock/` is NOT tracked) |
| `claude-local/CLAUDE.md` | `~/.claude/CLAUDE.md` |
| `claude-local/settings.json` | `~/.claude/settings.json` |
| `claude-local/plugins/config.json` | `~/.claude/plugins/config.json` |
| `claude-local/plugins/installed_plugins.json` | `~/.claude/plugins/installed_plugins.json` |
| `claude-local/plugins/known_marketplaces.json` | `~/.claude/plugins/known_marketplaces.json` |
| `claude-local/skills/*/` (whole dir: SKILL.md + bundled scripts/config) | `~/.claude/skills/*/` |
| `claude-local/statusline.sh` | `~/.claude/statusline.sh` |
| `claude-local/mcp-servers.json` | `~/.claude.json` (mcpServers key only) |

## Commit Conventions

- Keep commits atomic: group related changes logically
- Messages should be short and precise (e.g., "add lazygit alias to zshrc", "update delta side-by-side config")

## Security

- **Never commit secrets** (API tokens, passwords, keys)
- The `zsh/zshrc` file has `CLAUDE_API_TOKEN` and `NPM_TASKFORCESH_TOKEN` redacted with `# REDACTED - set this manually`
- The `claude-local/mcp-servers.json` file has Datadog and Metabase API keys redacted with `# REDACTED - set this manually`
- If adding new env vars with secrets to zshrc or MCP configs, always redact them in the repo copy

## Oh My Zsh Details

- Framework: Oh My Zsh at `~/.oh-my-zsh`
- Theme: `powerlevel10k/powerlevel10k` (custom theme)
- Plugins: `git`, `zsh-autosuggestions`, `zsh-syntax-highlighting` (last two are custom plugins)

## Git Diff Tools (delta + lazygit)

Two linked tools handle git diffs; their configs live in two different files:

- **delta** — the diff pager. Configured entirely in `~/.gitconfig` (tracked at `git/gitconfig`), NOT in a delta-specific file. Relevant sections: `[core] pager`, `[interactive] diffFilter`, `[delta]`, and the named feature blocks `[delta "default"]` (side-by-side, line numbers, navigate — used for normal `git diff`) and `[delta "lazygit"]` (a compact, non-side-by-side variant).
- **lazygit** — the TUI. Config at `~/.config/lazygit/config.yml` (tracked at `lazygit/config.yml`). On Linux that's lazygit's default location; on macOS lazygit defaults to `~/Library/Application Support/lazygit/`, so `zsh/zshrc` exports `XDG_CONFIG_HOME="$HOME/.config"` to point lazygit (and other XDG-aware tools) at `~/.config` on every OS. It only sets its pager to `delta --paging=never --features lazygit`, which pulls in the `[delta "lazygit"]` feature block from gitconfig.

So delta's appearance inside lazygit is controlled by the `[delta "lazygit"]` section in `git/gitconfig`, not by the lazygit config. Lazygit's `state.yml` (sibling of `config.yml`) is runtime state and is intentionally NOT tracked.

## Key Shell Aliases

- `lg` → lazygit, `lgs` → lazygit with delta side-by-side
- `lt` → `ls -lht`
- `py` → python3, `tf` → terraform
- `cdwt <branch>` → navigate to git worktree by branch name
- Git: `pl`=pull, `ps`=push, `cm`=commit -m, `s`=status, `ch`=checkout, `l`=log --oneline

## Claude Code Skills and Commands

**Project skills** (in `.claude/commands/`, for this repo only):
- `/push` — Read live configs from the computer and update this repo
- `/pull` — Pull from origin, then restore configs from this repo to the computer

**User-level skills** (backed up in `claude-local/skills/`, synced to `~/.claude/skills/`):
- `/tmux` — Inspect tmux environment: list panes, read output, send commands, create panes/windows/sessions
- `/metabase` — Query Vambe production data (backend Postgres + apollo Mongo) via Metabase MCP. Auto-invokes when a question could be answered with prod data; gates the MCP behind one-time per-session approval.
- `/dispatch` — Workspace dispatcher for git worktrees. Reports workspace status (free vs. unfinished/unmerged) and prepares new features: finds a free workspace, forks branches across the touched repos, and launches a Claude session in a fresh tmux session `wsN-<feature>`. Bundles `scripts/ws-scan.sh` + `repos.conf` (alias→repo→base map).
- `/repo-status` — Per-workspace freeness snapshot across all dispatch workspaces: for each workspace, lists every repo alias in it with branch/base/ahead/behind/tree-cleanliness columns. Wraps dispatch's `ws-scan.sh`/`repos.conf` directly (`scripts/repo-status.sh`), so it stays in sync automatically.
- `/applock` — Lease a `(service, port)` before running an app for local testing, so competing agents never bind the same port. Atomic flock acquire + heartbeat renewal + TTL reclaim; waits when the port is busy; auto-releases on exit. Backed by the `~/.local/bin/applock` CLI (tracked at `applock/applock`); ports dictionary at `~/.applock/services.json`.
- `/playwright` — Drive a real Chromium browser via the Playwright MCP (navigate, click, fill forms, screenshot, scrape JS-rendered pages, save page PDFs, e2e checks). Documents the shared-persistent-profile **single-driver constraint** (only one session can drive the browser at a time; logins persist), how to recover from a stale `Browser is already in use` lock, and the close-when-done discipline.

When Mario asks to create global skills, save them to both `~/.claude/skills/<name>/SKILL.md` and `claude-local/skills/<name>/SKILL.md`.

## MCP Servers (Global)

Global MCP servers are configured in `~/.claude.json` (mcpServers key). The full `~/.claude.json` is NOT tracked (too large/ephemeral), but the `mcpServers` portion is backed up in `claude-local/mcp-servers.json` with secrets redacted.

To restore on a new computer, use the `/pull` skill which merges `mcp-servers.json` into `~/.claude.json`, then manually set the redacted secrets:
- `datadog-mcp`: headers `DD_API_KEY` and `DD_APPLICATION_KEY`
- `metabase`: env `METABASE_API_KEY`
- `vambe-product-os`: header `Authorization` (Bearer `vbpk_…` product key)

The `playwright` entry is **platform-specific**. The backed-up values are macOS (`--browser chrome`, `--user-data-dir /Users/mario/.cache/playwright-mcp-profile`). On Linux the live config uses `--browser chromium` and `--user-data-dir /home/mario/.cache/playwright-mcp-profile` (Playwright's managed Chromium under `~/.cache/ms-playwright/`; no system Chrome installed there) — adjust after `/pull` on a Linux box. The profile is shared and persistent, so only one Claude session can drive the browser at a time — see the `/playwright` skill for the single-driver constraint and lock recovery.

Tool permissions for these servers are tracked in `claude-local/settings.json`.

## Adding New Configurations

When a new tool config needs tracking:
1. Create a new directory in the repo named after the tool
2. Copy the config file(s) with secrets redacted
3. Add the mapping to the table above (edit this CLAUDE.md)
4. Commit with a descriptive message
