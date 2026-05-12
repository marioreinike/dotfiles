---
name: skill-author
description: Create or edit Claude Code skills (SKILL.md files). Use when the user asks to create a new skill, edit an existing skill, or improve a skill. Keywords - skill, command, slash command, SKILL.md.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Skill Author

Create and edit Claude Code skills following best practices.

## Before you start — verify the format is current

The skill format (frontmatter fields, file layout, invocation rules) evolves with Claude Code releases. The summary below is a snapshot, not the source of truth. **Before authoring or substantially editing a skill, confirm the current format against the official docs.** Pick whichever applies:

1. **Preferred — spawn the `claude-code-guide` agent** with a focused question like *"What is the current SKILL.md frontmatter schema and the rules for auto-invocation? Cite the docs."* That agent has WebFetch + WebSearch and is purpose-built for Claude Code feature questions.
2. **Or WebFetch directly** from `https://docs.claude.com/en/docs/claude-code/skills` (and the agent-skills overview page it links to) if you only need a quick lookup.

Skip this step only for trivial wording tweaks where the frontmatter is not changing.

If the docs and this SKILL.md disagree, trust the docs and update this file afterwards.

## Skill structure

Every skill lives in a directory with at least a `SKILL.md`:

```
skill-name/
├── SKILL.md           # Required — frontmatter + instructions
├── reference.md       # Optional — detailed docs Claude loads on demand
├── examples.md        # Optional — usage examples
└── scripts/           # Optional — helper scripts
```

## SKILL.md format

```yaml
---
name: my-skill
description: What it does and when to use it. Include keywords users would say.
allowed-tools: Read, Edit, Write, Bash
---

Instructions here...
```

### Frontmatter fields

| Field | Required | Purpose |
|---|---|---|
| `name` | No | Lowercase, hyphens/numbers only, max 64 chars. Becomes `/slash-command`. Defaults to directory name. |
| `description` | Yes | What + when. Claude uses this for auto-invocation — include trigger keywords. |
| `argument-hint` | No | Autocomplete hint, e.g. `[issue-number]` |
| `disable-model-invocation` | No | `true` to prevent auto-invocation. Use for side effects (deploy, commit, send). |
| `user-invocable` | No | `false` to hide from `/` menu. Use for background knowledge. |
| `allowed-tools` | No | Tools allowed without permission prompt when skill is active. |
| `model` | No | Model override when skill is active. |
| `context` | No | `fork` to run in isolated subagent. |
| `agent` | No | Subagent type when `context: fork` (e.g. `Explore`, `Plan`). |

## Key rules

1. **SKILL.md under 100 lines** — keep it focused on decision logic and instructions
2. **Move reference material to supporting files** — link with `[name](file.md)` so Claude loads on demand
3. **Clear, keyword-rich description** — Claude matches user intent against this to auto-invoke
4. **Use `disable-model-invocation: true`** for anything with side effects (deploys, sends, commits, destructive actions)
5. **Use `user-invocable: false`** for background knowledge that isn't a command

## Dynamic content

- `$ARGUMENTS` — all arguments passed (e.g. `/skill-name foo bar` → `foo bar`)
- `$0`, `$1`, `$N` — specific argument by index
- `${CLAUDE_SKILL_DIR}` — directory containing SKILL.md (reference bundled scripts)
- `` !`command` `` — run shell command before content is sent to Claude (inject dynamic context)

Example:
```yaml
---
name: pr-summary
allowed-tools: Bash(gh *)
---

PR diff: !`gh pr diff`
Summarize this pull request.
```

## Dual-save workflow

For this repo, always save skills to both locations:
1. `~/.claude/skills/<name>/SKILL.md` (live)
2. `claude-local/skills/<name>/SKILL.md` (repo backup)
3. Commit the repo copy

## Now: execute

Create or edit the skill as requested. Follow the rules above. If the skill has substantial reference material, split it into SKILL.md + supporting files.
