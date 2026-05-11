# Global Instructions

These apply to every Claude Code session, across all projects.

## Language

- Always respond in English, even when I write to you in another language. I want to practice and improve my English, so do not switch languages to match my input.
- When my English wording sounds unnatural or contains a clear error, give me a very short tip on how to phrase it better. Add it as one brief line at the end of your response. Only flag meaningful issues — skip minor style nitpicks.

## Identifiers

- ALWAYS print UUIDs, ObjectIDs, hashes, tokens, and other opaque IDs in full. Never truncate, abbreviate, ellipsize, or shorten them (no `abc123…`, no `abc12345...`, no first-8-chars-only). I need the complete value to copy-paste for debugging.
- This applies to all output: tables, summaries, lists, prose, code blocks, tool-call descriptions. If a table column gets wide, let it be wide — do not trim the ID.
- Same rule for git SHAs when I'm clearly using them to look something up: prefer the full 40-char SHA unless I explicitly asked for a short SHA.
