Sync all live configurations from this computer into this repo.

For each mapping in CLAUDE.md's File-to-System Mapping table:
1. Read the live file from the computer
2. Read the current repo copy
3. Compare them — if different, update the repo copy
4. For zsh/zshrc: redact CLAUDE_API_TOKEN and NPM_TASKFORCESH_TOKEN values with `# REDACTED - set this manually`

For claude-local/ (mirrors ~/.claude/):
1. Copy ~/.claude/settings.json → claude-local/settings.json
2. Copy ~/.claude/plugins/config.json → claude-local/plugins/config.json
3. Copy ~/.claude/plugins/installed_plugins.json → claude-local/plugins/installed_plugins.json
4. Copy ~/.claude/plugins/known_marketplaces.json → claude-local/plugins/known_marketplaces.json
5. If ~/.claude/commands/ exists, copy all files → claude-local/commands/
6. For ~/.claude/skills/, sync each skill directory RECURSIVELY → claude-local/skills/<name>/ (whole dir, not just SKILL.md — include bundled scripts/, *.conf, and reference files; preserve the executable bit on scripts)
7. Extract mcpServers from ~/.claude.json → claude-local/mcp-servers.json (redact secrets: replace API key/token values with `# REDACTED - set this manually`)

Ignore these known differences when comparing:
- claude-local/plugins/known_marketplaces.json: `lastUpdated` timestamp differences are cosmetic, do not update the repo copy for timestamp-only changes.

After updating, show a summary of what changed and ask if I should commit the changes.
