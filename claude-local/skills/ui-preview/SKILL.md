---
name: ui-preview
description: Fast visual check of frontend components in the turborepo-frontend monorepo (mercur, @vambe/* packages) without running the Next.js app. Mounts a component in a small Vite harness with the real Tailwind/theme/i18n, mocks the API at the axios layer (or a hook via module mocks), screenshots every state (default, loading, empty, error, retry, overflow, dark, locales, opened popovers) with headless Chrome into contact sheets the agent reads to check the UI. Use after creating or changing a React component or page in turborepo-frontend, or when asked to see, preview, screenshot, or visually test UI. Keywords - ui preview, visual test, screenshot component, storybook alternative, verify ui, render component, mock api, frontend states.
allowed-tools: Bash, Read, Write, Edit
---

# ui-preview

Vite harness (no Next.js) that renders a component with mercur's providers and fixture-backed API. Running this Vite server locally is approved. It is not a typecheck/build/test command, and those stay forbidden in this repo.

`S=~/.claude/skills/ui-preview/scripts/ui-preview.sh` (all commands take `--repo PATH`, default = git toplevel of `$PWD`, worktrees OK; `--app mercur` is the only app wired so far)

## Workflow

1. **Start + context, in one call**: `$S start && $S context [--base origin/dev] [files...]`.
   - `start` installs the harness into `apps/mercur/.ui-preview/` (git-excluded, never commit it). If a server is already running, it says `reused`.
   - `context` prints, for each changed component: the import line and props type, every `@vambe/api` hook resolved to a **ready fixture key** (`"GET /call-guide"`) with its response type file and whether to write snake_case, the hook's retry policy, other hooks that may need providers, who renders the component, any **existing scenarios to extend**, and the changed i18n keys side by side in every locale.
   - `⚠` lines are deterministic findings: `TERMINOLOGY` (a new string renames an established product term, e.g. pt "guia de chamada" vs "guia de ligação") and `UNTHEMED COLORS` (classes that do not flip in dark mode). Put them in your report unless a screenshot disproves them.
   - Trust this output. Open source files only for the props types and the response type, plus the diff of the component to learn which states it adds.
2. **Write or extend a scenario** at `$($S path)/scenarios/<component-name>.preview.tsx`. Name it after the component, so later runs reuse it.
   ```tsx
   import { CallGuidePicker } from "@vambe/templates/src/call-guide/call-guide-picker";
   import { Box, definePreview, fail, pending, sequence } from "ui-preview";
   const guides = [{ id: "g1", client_id: "c1", name: "Post-venta", objective_text: "…", assistant_id: null }]; // snake_case
   const view = (w = 420) => () => <Box width={w}><CallGuidePicker selectedGuideId={null} onSelect={() => {}} onClear={() => {}} /></Box>;
   const open = [{ click: "button[aria-expanded]" }];
   export default definePreview({
     title: "CallGuidePicker",
     api: { "GET /call-guide": guides },
     states: {
       open: { render: view(), interact: open },
       loading: { render: view(), api: { "GET /call-guide": pending() }, interact: open },
       empty: { render: view(), api: { "GET /call-guide": [] }, interact: open },
       error: { render: view(), api: { "GET /call-guide": fail(500) }, interact: open },
       "retry-in-flight": { render: view(), api: { "GET /call-guide": sequence([fail(500), 4], pending()) },
         interact: [...open, { click: "text=Reintentar" }, { wait: 300 }] },
       narrow: { render: view(220), api: { "GET /call-guide": fail(500) } },
       "dark-loading": { render: view(), theme: "dark", api: { "GET /call-guide": pending() }, interact: open },
       "pt-error": { render: view(), locale: "pt", api: { "GET /call-guide": fail(500) }, interact: open },
     },
   });
   ```
   **State matrix**: build every row that applies to the change.
   - Data states: default, loading, empty, error (5xx and 4xx when retry policies differ).
   - Transitions: **retry/refetch in flight**, and retry then success. Use `sequence(...)`: the first item answers the first call, and so on.
   - Edge content: long text in a narrow `Box`, disabled/selected variants.
   - Each prop variant the diff touches.
   - Dark mode for the new visuals.
   - One state per locale whose strings changed.
   - Open overlays via `interact`.

   Text selectors must match the state's locale, which is **es** by default (`text=Reintentar`, not `text=Retry`). Take the strings from `context`, or prefer ARIA selectors (`button[aria-expanded]`, `[role=option]`). A failing step stops after 5s and lists the clickable texts.

   API details are in [reference.md](reference.md). Only open it for module mocks, `wrapper` providers, or troubleshooting.
3. **Shoot**: `$S shoot --out "$($S path)/out/<component>-$(date +%H%M%S)" [scenario[:state] ...]` (no targets = every state). It prints a summary line, problems per state, and **contact sheets** (labelled grids of 6 states). The first shoot after a cold start pre-bundles deps (~30-60s).
   - `unmocked: GET /x`: add a fixture, then shoot again.
   - A red "Render error" box or `useX must be used within Provider`: add that provider with `wrapper` (see reference).
4. **Inspect**: Read **all contact sheets in one parallel batch**. Open a single state's PNG only to zoom in on something suspicious. Go through the checklist below and report concrete defects with cause and fix.
5. **Iterate**: after a code fix, shoot only the affected states. Vite serves the edits with no restart.
6. **Upload** (rules below), then `$S stop` unless `start` said `reused`.

## Defect checklist (frequent in this codebase)

- **Truncation/overflow**: `truncate` needs `min-w-0` (or `overflow-hidden`) on every flex ancestor up to the sized box. A `Button` with `flex-1` and no `min-w-0` never shrinks. Radix Popover content takes the trigger's width, so a wide trigger means a wide popover.
- **React Query v5 transitions**: refetching an errored query with no data turns `isLoading` true again. A Retry click then swaps the error UI for the loading UI (a flicker/layout shift), and spinners tied to `isFetching` never show. Always capture the `retry-in-flight` state.
- **Dark-mode colors**: most palettes (`slate`, `blue`, `red`, …) are var-backed and flip in dark mode, so `text-slate-500` is fine. `bg-white`, `bg-black`, `text-black` and un-themed palettes do not flip; `context` flags them (`UNTHEMED COLORS`). Prefer `bg-card` and `bg-background`. Check the dark shots.
- **Copy**: act on the `TERMINOLOGY` flags. Also compare the changed keys across es/en/pt and the tone of neighbouring keys. A raw key in a shot (e.g. `call-guide.retry`) means a missing translation.
- **Layout shift between states**: the height or width jumps, or inputs or footers appear and disappear between loading, error and success.
- **Dark mode**: skeleton, border and muted-text contrast.

## Upload rules

Screenshots always stay local. Upload only to entities that **already exist** for this work. Never create a PR, artifact, or task just to host screenshots. Upload the final set once rather than every iteration, and curate it: about 12 key individual PNGs at most, with no near-duplicates (the contact sheets are for review, not for upload).
- **PR exists** for the branch (`gh pr view` succeeds): `~/.claude/skills/ui-preview/scripts/upload-pr.sh --repo <repo> --comment --note "<what the shots show + defects found>" <abs png paths...>`. The push goes over SSH through 1Password and may wait for a Touch ID approval. If all 3 attempts fail, tell the user and rerun.
- **ClickUp task** linked to the work (from the conversation, branch name, or PR body): attach the PNGs (see reference).
- **Artifact** already published in this session for this work: republish it with the screenshots as supporting files.
