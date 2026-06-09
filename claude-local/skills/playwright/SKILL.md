---
name: playwright
description: Drive a real browser via the Playwright MCP — navigate, click, fill forms, screenshot, scrape rendered pages, save a page to PDF, or test a web UI end-to-end. Auto-invoke whenever a task needs a live browser rather than a raw HTTP fetch — e.g. "open this URL", "click the button", "fill the login form", "screenshot the page", "scrape this site that needs JS", "check the app in the browser", "save this page as PDF". Keywords - playwright, browser, navigate, open url, click, type, fill form, screenshot, snapshot, scrape, render, headless, web automation, page pdf, e2e, web ui.
---

# Playwright (browser automation via MCP)

The Playwright MCP gives you a real Chromium browser. Tools are exposed as `mcp__playwright__browser_*` (navigate, snapshot, click, type, fill_form, take_screenshot, evaluate, pdf_save, network_requests, tabs, etc.). They are deferred — load schemas with ToolSearch (`select:mcp__playwright__browser_navigate,...`) before the first call.

Use it when a plain HTTP fetch is not enough: pages that need JavaScript to render, flows that require clicking/typing/logging in, visual checks (screenshots), or saving a rendered page to PDF. For static HTML or JSON APIs, prefer WebFetch — it's cheaper and doesn't hold the browser lock.

## How it's set up on this machine (Linux)

Configured in `~/.claude.json` (`mcpServers.playwright`), backed up at `~/REPOS/dotfiles/claude-local/mcp-servers.json`:

```
npx -y @playwright/mcp@latest \
  --browser chromium \
  --user-data-dir /home/mario/.cache/playwright-mcp-profile \
  --caps pdf,vision
```

- **`--browser chromium`** — uses Playwright's managed Chromium under `~/.cache/ms-playwright/` (there is no system Chrome/Chromium on PATH here). On macOS this is `--browser chrome` with `/Users/mario/...`.
- **`--user-data-dir ...playwright-mcp-profile`** — a **persistent** profile, so logins/cookies survive across sessions. This is the deliberate trade-off chosen for this machine (see constraint below).
- **`--caps pdf,vision`** — enables `browser_pdf_save` and vision (coordinate-based mouse) tools.

## Single-driver constraint (IMPORTANT — read before using)

The profile is **shared and persistent**. Chromium enforces one instance per `--user-data-dir`, so **only ONE Claude session can drive the browser at a time**. Every session spawns its own MCP server process, but they all point at the same profile dir.

Consequence: if another session already has the browser open, your first `browser_navigate` fails with:

> `Error: Browser is already in use for /home/mario/.cache/playwright-mcp-profile, use --isolated to run multiple instances of the same browser`

This is expected, not a bug. The benefit in exchange is that logins persist (no re-auth every run).

### Rules to respect the constraint

1. **Close when done.** Always call `mcp__playwright__browser_close` at the end of a browsing task so you release the lock for other sessions. Don't leave the browser open across unrelated work.
2. **One driver at a time.** If you get "already in use", another live session legitimately holds it. Prefer to **wait / retry** or do other work first — do NOT kill processes you didn't create just to grab the lock; that can disrupt another active Claude session.
3. **Don't switch to `--isolated`** to dodge the lock — that would lose the persistent login the profile exists for. (If a future task truly needs parallel isolated browsers, that's a config change to discuss with Mario, not a per-session override.)

### Recovering from a STALE lock (only when no live session owns it)

If the lock is held by a **dead** session (e.g. a Chromium left running for days, no active Claude using it), it can be cleared. Confirm it's stale first, and prefer to ask Mario before killing processes:

```sh
# 1. See what holds the profile — note start times; old ones are likely stale
pgrep -af 'chrome-linux64/chrome.*playwright-mcp-profile'

# 2. Kill ONLY the chromium browser tree (NOT the npx/node MCP servers —
#    those may belong to other live sessions)
pkill -TERM -f 'chrome-linux64/chrome.*playwright-mcp-profile'

# 3. Remove the singleton lock files
rm -f ~/.cache/playwright-mcp-profile/Singleton{Lock,Cookie,Socket}
```

After that, the next `browser_navigate` launches a fresh browser and acquires the lock. The persistent profile data (logins) is untouched by clearing only the `Singleton*` files.

Note: stale `npx @playwright/mcp` node servers from closed sessions can also pile up and waste memory, but they don't hold the browser lock and may belong to live panes — leave them unless Mario asks to clean them up.

## Typical flow

1. `browser_navigate` to the URL.
2. `browser_snapshot` — accessibility tree of the page; **prefer this over screenshots** for reading/acting on content (it gives stable element refs for clicks/typing).
3. Act: `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, using refs from the snapshot.
4. Verify: another `browser_snapshot`, or `browser_take_screenshot` for a visual artifact, or `browser_pdf_save` to capture the page.
5. `browser_close` to release the lock.

## Don't

- Don't use the browser for things WebFetch handles (static pages, JSON APIs).
- Don't leave the browser open — always `browser_close` when finished.
- Don't kill processes you didn't create to seize the lock while another session may be active.
- Don't run `browser_run_code_unsafe` / `browser_evaluate` with untrusted code against sensitive logged-in sites without a clear reason.
