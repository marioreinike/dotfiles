---
name: ui-preview
description: Fast visual check of frontend components in the turborepo-frontend monorepo (mercur, @vambe/* packages) without running the Next.js app. Mounts a component in a small Vite harness with the real Tailwind/theme/i18n, mocks the API at the axios layer (or a hook via module mocks), screenshots every state (default, loading, empty, error, dark, opened popovers) with headless Chrome, then the agent reads the PNGs to check the UI. Use after creating or changing a React component or page in turborepo-frontend, or when asked to see, preview, screenshot, or visually test UI. Keywords - ui preview, visual test, screenshot component, storybook alternative, verify ui, render component, mock api, frontend states.
allowed-tools: Bash, Read, Write, Edit
---

# ui-preview

Vite harness (no Next.js) that renders one component with mercur's providers and fixture-backed API. Start ~3s, a screenshot pass takes seconds. Running this Vite server locally is approved. It is not a typecheck/build/test command, and those stay forbidden in this repo.

`S=~/.claude/skills/ui-preview/scripts/ui-preview.sh` (all commands take `--repo PATH`, default = git toplevel of `$PWD`, worktrees OK; `--app mercur` is the only app wired so far)

## Workflow

1. **Start**: `$S start`. It installs the harness into `apps/mercur/.ui-preview/` (git-excluded through `info/exclude`, never commit it) and prints the URL. It is idempotent: if the server is already running for this checkout, it reuses it.
2. **Pick targets**: from `git diff --name-only <base>...HEAD`, choose the components a user would see that render the change. Previewing every file is unnecessary.
3. **Write a scenario** at `$($S path)/scenarios/<name>.preview.tsx` (the API is in [reference.md](reference.md)):
   ```tsx
   import { CallGuidePicker } from "@vambe/templates/src/call-guide/call-guide-picker";
   import { definePreview, fail, pending } from "ui-preview";
   const guides = [{ id: "g1", name: "Post-venta", objective_text: "…", assistant_id: null }];
   const view = () => <div style={{ width: 420 }}><CallGuidePicker selectedGuideId={null} onSelect={() => {}} onClear={() => {}} /></div>;
   const open = [{ click: "button[aria-expanded]" }];
   export default definePreview({
     title: "Call guide picker",
     api: { "GET /call-guide": guides },            // raw backend shape: snake_case
     states: {
       default: view,
       open: { render: view, interact: open },
       loading: { render: view, api: { "GET /call-guide": pending() }, interact: open },
       empty: { render: view, api: { "GET /call-guide": [] }, interact: open },
       error: { render: view, api: { "GET /call-guide": fail(500) }, interact: open },
       dark: { render: view, theme: "dark", interact: open },
     },
   });
   ```
   Cover each state the change touches: loading, empty, error, the moment right after a user retry/refetch, long text or overflow, disabled, dark mode, and opened overlays (via `interact`). For overflow, use a fixed-width wrapper with a visible `outline`: the default crop grows with overflowing content rather than clipping it. Use realistic data: shapes come from `packages/types/<domain>` and paths from `packages/api/src/<domain>/infrastructure/`. The `vambe-dbs` skill (dev DB) can supply real-looking rows.
4. **Shoot**: `$S shoot [scenario[:state] ...]` (no targets = every state of every scenario). It writes PNGs plus `report.json` to `$($S path)/out/latest/`, which is **overwritten on every run**: pass `--out <scratchpad dir>` to keep a set, or whenever another agent may share the checkout. It prints a summary line (`all clean`, or N states with problems) and, per state, `unmocked:` requests, errors, and timeouts. The first shoot after a cold start also pre-bundles deps (~30-60s).
   - `unmocked: GET /x`: add a fixture, then shoot again. Without one, the request answers 501 and the UI shows its error path.
   - A red "Render error" box or `useX must be used within Provider`: add that provider with `wrapper` (see reference).
5. **Inspect**: Read every PNG. Check layout, spacing, alignment, truncation and overflow, loading/empty/error visuals, dark-mode contrast, and raw i18n keys (e.g. `call-guide.placeholder` means a missing translation). Report concrete defects, not impressions.
6. **Iterate**: edit the code, then shoot again. Vite serves the edits with no restart. Edits to `mocks.json` restart the server automatically.
7. **Upload** (rules below), then `$S stop` when done with UI work in this checkout.

## Mocking

- **API (default)**: the `api` key in a scenario or state. Every `@vambe/api` call (axios) plus cross-origin and `/api/*` fetches go through fixtures; nothing reaches a real backend. Auth is a fake signed-in user (customize with `user`, `profile`, `auth`).
- **Hooks or modules**: use `.ui-preview/mocks.json` when the data does not come from HTTP (sockets, contexts, browser APIs) or to force a hook state. It matches on the resolved file, so barrel imports are covered. See reference.

## Upload rules

Screenshots always stay local. Upload only to entities that **already exist** for this work. Never create a PR, artifact, or task just to host screenshots. Decide whether an upload adds value (UI changed, reviewer benefits); skip it for throwaway iterations. Upload the final set once rather than every iteration, and curate it: the key states (about 12 at most), skipping near-duplicates.
- **PR exists** for the branch (`gh pr view` succeeds): `~/.claude/skills/ui-preview/scripts/upload-pr.sh --repo <repo> --comment --note "<what the shots show + defects found>" <abs png paths...>`. The push goes over SSH through 1Password and may wait for a Touch ID approval. If all 3 attempts fail, tell the user and rerun.
- **ClickUp task** linked to the work (from the conversation, branch name, or PR body): attach the PNGs (see reference).
- **Artifact** already published in this session for this work: republish it with the screenshots as supporting files.

Details, limitations and troubleshooting: [reference.md](reference.md).
