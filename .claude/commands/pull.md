Restore configurations from this repo to the computer.

First, run `git pull origin main` to get the latest changes from the remote.

Then, compare ALL files before applying anything:
1. For each mapping in CLAUDE.md's File-to-System Mapping table, read the repo file and the live file on the computer
2. For claude-local/ files, compare against their ~/.claude/ counterparts
3. Build a summary of ALL changes (files that differ, new files, unchanged files)
4. Present the full summary to the user with diffs for each changed file
5. Ask for a single confirmation before applying all changes

Only after the user confirms, apply all changes:
- Copy each changed config to its live location
- Copy claude-local/settings.json → ~/.claude/settings.json
- Copy claude-local/plugins/*.json → ~/.claude/plugins/
- If claude-local/commands/ has files, copy them → ~/.claude/commands/
- For claude-local/skills/, copy each skill directory RECURSIVELY → ~/.claude/skills/<name>/ (whole dir, including bundled scripts/, *.conf, and reference files; restore the executable bit on scripts via `chmod +x`)
- Merge claude-local/mcp-servers.json into ~/.claude.json (mcpServers key only — preserve all other keys). Never overwrite live secret values with redacted placeholders — only add/update server structure and non-secret fields.
- Create parent directories if they don't exist

Ignore these known differences when comparing:
- zsh/zshrc: lines containing CLAUDE_API_TOKEN or NPM_TASKFORCESH_TOKEN (redacted in repo, live values on computer). Never overwrite these lines — the live values must be preserved.
- claude-local/plugins/known_marketplaces.json: `lastUpdated` timestamp differences are cosmetic, ignore them.
- claude-local/mcp-servers.json: values containing `# REDACTED` are placeholders — the live values in ~/.claude.json must be preserved.

IMPORTANT:
- Never overwrite ~/.claude/.credentials.json
- When copying zsh/zshrc to the computer, preserve the live values of redacted env vars (do not replace them with the redacted placeholders)
