---
name: applock
description: MANDATORY before running this project's app/server for local testing on this host. Acquires a (service, port) lease so competing agents never collide on a port — locks with renewal + TTL, waits when the port is busy, auto-releases on exit. Use whenever you are about to start, serve, or boot the app to test a change (npm run dev, nest start, vite, uvicorn, docker compose up, go run, a dev server, etc.) — NOT for unit tests, builds, or type-checks that bind no port. Keywords - run the app, start the server, run my version, dev server, serve, boot, port, localhost, test it live, run for testing.
allowed-tools: Bash, Read
---

# applock — lease a port before running the app

On this host the app can only run on a given port once at a time, and several
agents may each want to run *their* version of the repo. **Before starting any
long-running app/server to test a change, you MUST hold an `applock` lease on
the port.** This prevents two agents from binding the same port.

This applies to anything that **binds a port and stays running**: dev servers,
API servers, `docker compose up`, a built app you launch to click through.
It does **not** apply to unit tests, builds, type-checks, linters, or one-shot
scripts that bind no port — run those normally.

## The one rule

Wrap the launch command with `applock run <service> -- <command>` and launch it
as a **background** task. `applock` picks a free port, exports `$PORT`, renews
the lease while the app runs, and releases it when the app stops.

```bash
applock run backend -- npm run dev
```

Make the app honor `$PORT` (applock sets it). If the framework reads a different
variable or a flag, pass the port through explicitly:

```bash
applock run backend -- npm run dev -- --port "$PORT"      # if $PORT isn't picked up
applock run api     -- uvicorn app:app --port "$PORT"
applock run frontend -- docker compose up                 # compose reads ${PORT} from env
```

If every allowed port is taken, `applock run` **waits** (polling) and prints a
line to stderr until one frees — that is expected; do not work around it by
picking a random port.

## Step 1 — make sure the service is registered

The host keeps a ports dictionary at `~/.applock/services.json` mapping each
service to its allowed port(s). Check it:

```bash
applock services
```

If the service you need to run is **not listed**, register it with the port the
app actually expects, then run:

```bash
applock add-service backend 3000        # one port (the common case)
applock add-service worker 4000 4001 4002  # several ports if multiple instances are OK
```

Pick the port the project conventionally uses (check the repo's README, `.env`,
`package.json` scripts, or compose file). One port per service unless the
service is lightweight and the host can safely run several instances.

## Step 2 — run the app under a lease (in the background)

Launch with `applock run` as a background task so you can keep working while it
serves, then read its logs / hit the port to verify your change. The lease is
released automatically when the process exits.

Useful overrides (rarely needed):

- `--port N` — force a specific port, bypassing the dictionary.
- `--ttl S` / `--renew S` — lease TTL and heartbeat (defaults 90s / 30s, TTL ≥ renew).
- `--wait-timeout S` — give up after S seconds instead of waiting forever.
- `--max-hold S` — change the hard cap on how long the lease may be held (default 1800s / 30 min).

## Step 3 — be a good neighbor (release when others are waiting)

Only one agent can hold a port at a time, so **don't sit on an idle app**. Two
rules:

1. **Release as soon as you're done testing.** Stop the background `run` task
   (that releases the lease instantly) — don't leave the server running after
   you've finished. If you used manual mode, run `applock release`.

2. **Yield when someone is waiting.** While your app runs, the `run` task's
   output prints a notice when another agent is blocked on your port:

   ```
   ⚠ 2 agent(s) WAITING for backend:3000 (oldest 1m20s): wsX-feat … — release when you reach a good stopping point
   ```

   When you see this (or check `applock status` / `applock waiters backend`),
   finish your current step, then release so the waiting agent can proceed. You
   decide the moment — applock will **not** kill your app to hand off the port.

The only forced limit is the **max-hold cap** (30 min by default): a lease can't
be renewed past it, so a forgotten or idle holder is reclaimed automatically and
its app stopped. If you have a legitimately long run and nobody is waiting, push
the cap out instead of being killed:

```bash
applock extend <lease_id> 1800      # add 30 more minutes to this lease's cap
```

## Checking state

```bash
applock status                 # ports free/held/stale, max-hold left, who's waiting
applock waiters backend        # JSON: who is waiting on this service right now
```

## Manual mode (only if you can't wrap the command)

If the app must be started by something you can't pass a command to, acquire and
release explicitly. **You are responsible for releasing** (the TTL is only a
safety net for crashes):

```bash
PORT=$(applock acquire backend | python3 -c 'import sys,json; print(json.load(sys.stdin)["port"])')
# ... start the app on $PORT yourself ...
applock release backend "$PORT"      # or: applock release --lease <id>
```

## Why

The lease = a `(service, port)` pair guarded by an atomic flock, with renewal,
a TTL (crash safety) and a max-hold cap (idle-holder safety). Acquiring is
race-free; a forgotten lease expires and is reclaimed; a busy port makes you
wait instead of colliding; waiters are visible to the holder so handoff is
cooperative. Full reference: `~/REPOS/dotfiles/applock/README.md`.
