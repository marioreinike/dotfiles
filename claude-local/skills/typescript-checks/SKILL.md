---
name: typescript-checks
description: Gate running TypeScript type checks, lints, or builds after editing code. Two rules — (1) finish all code edits for the task first, then run checks once at the end, never in the middle; (2) ALWAYS ask the user in plain text for permission before running them, even if the harness would auto-approve. Triggers whenever the agent is about to run `tsc`, `tsc --noEmit`, `eslint`, `prettier --check`, `next build`, `tsup`, `vite build`, `turbo build`, `turbo typecheck`, `nx build`, or any npm/pnpm/yarn/bun script whose name matches `build`, `typecheck`, `type-check`, `check-types`, `lint`, or `tsc` in a TypeScript project. Does NOT apply to tests, formatters that only rewrite, or to non-TypeScript languages.
---

# TypeScript Checks Gate

After editing TypeScript code, it is tempting to immediately run `tsc`, `eslint`, or `build` to verify the change. This skill enforces two rules around that.

## Rule 1 — Finish before you check

Complete every code edit the task requires **before** running any type check, lint, or build. Do not interleave edits with checks.

- If the task spans multiple files, edit them all first.
- If you discover follow-up work mid-task, fold it in and finish, then check once.
- A single end-of-task check is the goal — not a check after each file.

Why: running checks against half-finished work produces noise (errors that vanish once the next file is edited), wastes a slow command, and tends to derail the agent into chasing transient errors instead of completing the task.

## Rule 2 — Always ask before running

Before invoking a TypeScript type check, lint, or build, ask the user in plain text and wait for an explicit "yes". This applies even if:

- The harness is in bypass-permissions / auto mode.
- The command would otherwise be on an allow-list.
- The user previously approved a check in this session (each run needs its own yes).

Phrase the ask concretely, naming the exact command. For example:

> I've finished the edits. Want me to run `pnpm typecheck` to verify? (yes/no)

If the user says no, stop and report the task as done without the check. Do not re-ask in the same turn.

## What counts as a "check" under this rule

Covered (must finish-then-ask):

- `tsc`, `tsc --noEmit`, `tsc -b`, `tsc --build`
- `eslint`, `eslint .`, `eslint --fix` (the `--fix` variant still requires asking, since it runs the linter)
- TypeScript-aware builders: `next build`, `nuxt build`, `vite build`, `tsup`, `rollup -c`, `esbuild` build scripts, `turbo build`, `turbo typecheck`, `nx build`, `nx run-many`
- Any package-manager script whose name is `build`, `typecheck`, `type-check`, `check-types`, `check:types`, `lint`, `lint:ts`, or `tsc` — e.g. `npm run build`, `pnpm typecheck`, `yarn lint`, `bun run check-types`
- Wrapper aliases / Makefile targets that fan out to the above

Not covered (run normally per usual permission rules):

- Unit/integration/e2e test runners (`jest`, `vitest`, `playwright`, `mocha`)
- Pure formatters that only rewrite (`prettier --write`, `biome format --write`) — but `prettier --check` / `biome check` ARE covered as they act like a lint
- Dev servers (`next dev`, `vite`, `tsx watch`)
- Non-TypeScript languages: Python `mypy`/`ruff`, Go `go build`/`go vet`, Rust `cargo check`/`cargo build`, etc. This skill is TypeScript-only.
- Reading config files like `tsconfig.json` or `eslint.config.js` to understand the project — that's not running a check.

## When the user says "and run the typecheck" up front

If the user explicitly asks for the check as part of the original request (e.g. "fix this and run typecheck"), Rule 2 is satisfied for that one run — you still finish all edits first (Rule 1), then run the named check without re-asking. Any additional checks beyond what they named still require a fresh ask.
