# ui-preview reference

## How it works

- `scripts/ui-preview.sh start` rsyncs `harness/` into `<repo>/apps/<app>/.ui-preview/` (it keeps `scenarios/`, `mocks/`, `mocks.json`, and `out/`), adds `.ui-preview/` to `$(git rev-parse --git-common-dir)/info/exclude`, and runs the repo's own Vite (the copy vitest depends on) with cwd `apps/<app>`. That way the app's `postcss.config.cjs` and `tailwind.config.ts` apply unchanged. The port is the first free one from 6100, and its state lives in `.ui-preview/server.json`.
- Vite config (`harness/vite.config.mjs`):
  - Aliases `@/` to the app's `src`.
  - Swaps Next-only modules for stand-ins: `next/router`, `next/navigation`, `next/image`, `next/link`, `next/dynamic`, `next/head`, `next/script`, `next/font/*`, and `next-i18next` (which becomes react-i18next).
  - Uses Next's own browser polyfills for Node built-ins, and an empty module for `fs`, `net`, and similar.
  - Replaces the Firebase client with a fake signed-in user.
  - Sets `process.env` = `NEXT_PUBLIC_*` (from `env.mjs` and `.env*`), with the backend pointed at `https://api.ui-preview.invalid`.
  - Resolves bare imports that a shared package does not declare from the app instead (Next tolerates those).
- Provider tree (`harness/src/apps/mercur.tsx`): ThemeProvider → MotionProvider → I18nextProvider (locales from `apps/mercur/public/locales`, default `es`) → I18nextTranslationProvider → QueryClientProvider (no retries by default, `retryDelay: 0`, `staleTime: Infinity`) → NuqsTestingAdapter (query from `route.query`) → AuthContext (fake user). Intentionally left out: Permission, WebSocket, Panda*, CallProviders, Alert, ChatConfigs, ShowSidePanel. Add them with `wrapper` when needed.
- A state counts as ready when fonts have loaded, no finite fixture request or React Query fetch has been in flight for 400ms, and `waitFor` (if set) matches. The timeout is 15s, after which the report shows `ready timeout`.
- `pending()` requests are parked forever and do not block readiness, which is how loading states get captured.

## Scenario API (`import { … } from "ui-preview"`)

`definePreview({ title?, states, ...options })`. Each state is either `() => ReactNode` or `{ render, ...options }`. State options override top-level options, and `api`/`route`/`user`/`auth` are shallow-merged.

| option | meaning |
|---|---|
| `api` | fixtures, see below |
| `theme` | `"light"` (default) or `"dark"` |
| `locale` | `"es"` (default), `"en"`, `"pt"` |
| `viewport` | `{ width, height }`, default 1280×800 (`shoot --viewport WxH` changes the default) |
| `route` | `{ pathname, query }` for `useRouter`/`usePathname`/`useSearchParams`/nuqs |
| `user` / `profile` / `auth` | merged into the fake `useAuth()` value |
| `wrapper` | `(children) => <Provider>{children}</Provider>` |
| `interact` | Playwright steps after ready: `{click: sel}`, `{hover: sel}`, `{fill: sel, value}`, `{press: "Escape"}`, `{wait: ms}` |
| `capture` | `"viewport"`, or a CSS selector. The default crops to the rendered content plus portals (popovers, dialogs) |
| `frame` | `"none"` renders edge to edge and captures the full page (use it for whole pages/layouts) |
| `waitFor` | selector that must exist before the shot |

### Fixtures

The key is `"METHOD /path"`, matched against the path relative to the backend base URL. The query string is ignored. Patterns are supported: `"GET /tag/:id"`, `"GET /ai-contact/*"`, `"* /ping"`. For third-party hosts, use the full URL as the path (`"GET https://api.example.com/x"`).

The value can be:
- plain data, which answers 200;
- `res(data, { status, delay, headers })`;
- `pending()` (loading forever);
- `fail(status?, body?)`;
- a function `(req) => value`, where `req` has `{ method, path, query, params, body, headers }`. Use this for search, pagination, or to echo a mutation.

Write bodies in the **raw backend shape (snake_case)**. Infrastructure calls that use `camelize: true` get camelized by the real axios interceptor, and the ones that don't use it expect raw data anyway. The infrastructure file for the domain shows the exact path and verb. Hooks that define their own `retry` (e.g. retry 5xx 3×) still retry, just without delay. Use a 4xx when you want a single attempt.

A function fixture can return any of the values above, including `res`, `pending()` and `fail()`. Every state loads a fresh page, so module-level variables in the scenario reset between states. That makes call counters safe. For example, "fail through the hook's retries, then hang on the user's manual Retry" captures the retrying UI:
```tsx
let calls = 0;
const failThenHang = () => (++calls <= 4 ? fail(500) : pending()); // 1 try + 3 retries, then the Retry click
// state: { render: view, api: { "GET /call-guide": failThenHang },
//          interact: [{ click: "button[aria-expanded]" }, { wait: 300 }, { click: "[role=alert] button" }, { wait: 300 }] }
```

For `interact`, prefer stable selectors: ARIA attributes (`button[aria-expanded]`, `[role=alert] button`, `[role=option]`), `input[placeholder*=…]`, or `text=Reintentar` (Playwright selector syntax works).

Every request is logged in `window.__UI_PREVIEW__.requests`. `report.json` is a **JSON array** with one object per state: `{ scenario, state, url, file, ready, unmocked[], errors[], navigations[], requests, failure? }`.
- `requests` is the request count, useful to verify retry policies (a 5xx with 3 retries gives 4, a 4xx gives 1).
- `navigations` lists calls to `router.push` and link clicks, which are recorded and never followed.

## Module mocks (`.ui-preview/mocks.json`)

```json
{ "packages/api/src/call-guide/hooks/use-call-guides.ts": "mocks/use-call-guides.ts" }
```
- The key is a repo-relative file or a bare specifier. The value is a mock file relative to `.ui-preview/`. The mock replaces the module for every importer, barrels included. Saving `mocks.json` restarts Vite.
- Inside the mock, import the real module with the `?original` suffix. Re-export everything and override what you need (a local export takes precedence over `export *`):
  ```ts
  export * from "../../../../packages/api/src/call-guide/hooks/use-call-guides.ts?original";
  import { useCallGuides as real } from "../../../../packages/api/src/call-guide/hooks/use-call-guides.ts?original";
  import { previewState } from "ui-preview";
  export function useCallGuides(o?: { enabled?: boolean }) {
    const r = real(o);
    return previewState()?.state === "forced" ? { ...r, data: [/* camelCase */], isLoading: false } : r;
  }
  ```
- Mocks are global, so use `previewState()` to vary them per scenario or state. Remove an entry when it is no longer needed. Prefer API fixtures whenever the data comes over HTTP.

## Limitations

- WebSocket and EventSource never connect, so realtime-driven UI stays idle. Drive it with a module mock.
- Static image imports become URL strings. `next/image` handles that, but code that reads `logo.src` directly gets `undefined`.
- Pages that depend on `getServerSideProps` data: render the page component and pass the props yourself, with `frame: "none"`.
- Anything that needs real auth flows, the Firebase SDK, or Stripe/Google widgets will not work.
- Only `apps/mercur` is wired. To add an app, create `harness/src/apps/<app>.tsx`, mirroring that app's `_app.tsx` (CSS imports, providers, `initApp`), then run `start --app <app>`.

## Troubleshooting

| symptom | fix |
|---|---|
| `Failed to resolve import "x"` | Package missing from both the importer and the app. Add a module mock or a bare-specifier mock to an empty stub. |
| `does not provide an export named X` | Wrong subpath, or a CJS/ESM mismatch. Import from the file that really exports it. |
| `X must be used within a Provider` | Add the provider via `wrapper` (import it from where `_app.tsx` imports it). |
| Node built-in errors (`Buffer`, `promisify`) | Should be covered by the polyfills. If a server-only module still breaks, mock the module that imports it. |
| `ready timeout` | Something keeps fetching (polling or `refetchInterval`), or `waitFor` never matches. Check `requests` in report.json. |
| Blank or broken after dependency changes | `$S stop && rm -rf $($S path)/.vite && $S start`. |
| Port or server confusion | `$S status`, then `$S stop`. Only one server runs per checkout and app. |

Vite log: `.ui-preview/vite.log`. Manual browsing: the root URL lists every scenario and state as links, and `/?s=<scenario>&state=<state>` renders one.

## Upload recipes

**GitHub PR**:
```bash
OUT="$(~/.claude/skills/ui-preview/scripts/ui-preview.sh path --repo <repo>)/out/latest"
~/.claude/skills/ui-preview/scripts/upload-pr.sh --repo <repo> --comment \
  --note "Loading/empty/error states of the guide picker; defect: trigger overflows at 220px" \
  "$OUT"/call-guide-picker--open-list.png "$OUT"/call-guide-picker--open-error.png
```
- Exit 2 means there is no PR, so skip.
- Images go to the hidden ref `refs/ui-previews/pr-<N>` (not fetched by normal clones). Links point at the commit SHA, so earlier comments keep working.
- After the PR is merged or closed: `git push origin :refs/ui-previews/pr-<N>`.

**ClickUp** (only when a task is already linked):
- For each PNG, call `clickup_request_attachment_upload` (task_id, file_name), then upload with `curl` exactly as the returned instructions say (method, URL, multipart field).
- Small files (<200KB) can go through `clickup_attach_task_file` with base64 `file_data` instead.
- Optionally add one task comment that says what the screenshots show.

**Artifact** (only when this session already published one for this work): republish the same file path, adding `files: {"shots/<name>.png": "<local png>"}`, and reference them with `<img src="shots/<name>.png">` in the page.
