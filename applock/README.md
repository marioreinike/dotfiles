# applock — single-host resource lease manager

When several agents each want to run *their* version of a repo for testing, the
host can only run a given app on a given port once. `applock` arbitrates that: a
lease is a `(service, port)` pair, guarded by an atomic lock with renewal and a
TTL. Agents compete for ports; whoever holds the lease runs the app.

- **CLI:** `~/.local/bin/applock` (tracked at `applock/applock`)
- **State dir:** `~/.applock/` (created on first use; **not** tracked)
  - `services.json` — the ports dictionary (service → allowed port(s))
  - `locks/<service>__<port>.json` — one file per live lease
  - `registry.lock` — flock file serializing every check-and-set (race-free)
  - `logs/` — detached-renewer logs

## The ports dictionary

`~/.applock/services.json` maps each service name to the port(s) it may use.
Most services get exactly one port; a lightweight service that can run several
instances gets several:

```json
{
  "backend":  [3000],
  "frontend": [5173],
  "worker":   [4000, 4001, 4002, 4003]
}
```

Seed it from `services.example.json`, or register entries on the fly:

```bash
applock add-service backend 3000
applock add-service worker 4000 4001 4002 4003
```

## Usage

### Recommended: `run` (auto acquire → run → renew → release)

```bash
applock run backend -- npm run dev
```

`applock` picks a free port from `backend`'s allowed list, sets `$PORT` (and
`$APPLOCK_PORT`), runs the command, renews the lease via a background thread,
and releases it when the command exits (or is interrupted). The lease lives
exactly as long as the app. If every port is held it **waits**, polling until
one frees. In Claude Code, launch this as a background task.

### Manual: `acquire` / `release`

When you can't wrap the command (e.g. the app is started elsewhere):

```bash
$ applock acquire backend
{"service": "backend", "port": 3000, "lease_id": "ab12…", "renewer_pid": 12345}
# ... start your app on port 3000 yourself ...
applock release --lease ab12…        # or: applock release backend 3000
```

`acquire` detaches a renewer process that heartbeats until you release. If the
agent forgets, the **TTL** expires the lease and another agent reclaims it.

### Inspect / housekeeping

```bash
applock status            # per-service availability + active leases + who's waiting
applock status --json     # machine-readable
applock waiters [service] # JSON: who is waiting on each held port right now
applock extend <lease> [secs]  # push a lease's max-hold cap further out
applock services          # print the dictionary
applock gc                # drop expired lease files
```

## Locking model

- **Atomicity** — every acquire/renew/release/steal runs inside `flock` on
  `registry.lock`, so two agents can never grab the same port.
- **OS-level check** — a port is only acquirable if it's both lease-free *and*
  actually bindable, so a process that never used applock (or a stale lease whose
  app is still bound) makes you wait/skip instead of handing out a doomed lease.
- **Renewal** — every `LOCK_RENEW_INTERVAL` (default 30s) the holder extends
  `expires_at = now + TTL`. A renewer verifies it still owns the lease before
  extending; if it was reclaimed, it stops and (for `run`) kills the app.
- **TTL** — `LOCK_TTL` (default 90s, ≥ interval) is the *crash* safety-net: if
  the holder dies the heartbeat stops and the lease expires. Default 90/30
  tolerates two missed heartbeats before a lease looks stale.
- **Max-hold cap** — `LOCK_MAX_HOLD` (default 1800s / 30 min) is the *idle*
  safety-net: a lease can't be renewed past `acquired_at + max_hold`, so a
  healthy-but-idle holder is reclaimed and (in `run` mode) its app stopped. The
  heartbeat warns as the cap approaches; `applock extend` pushes it out for a
  legitimately long run.
- **Cooperative yield** — a waiting agent stamps its demand on the held lease
  (self-pruning, so a dead waiter stops counting). The holder's heartbeat logs a
  `⚠ N agent(s) WAITING` notice and `applock status`/`waiters` report it. The
  holder decides when to release — applock **never** force-preempts a running
  app; only the max-hold cap is forced.
- **Waiting** — if all ports are held (and not expired/bindable), `acquire`/`run`
  poll every `APPLOCK_WAIT_INTERVAL` (default 5s) until a port frees or
  `--wait-timeout` elapses.

## Env knobs

| Var | Default | Meaning |
|---|---|---|
| `APPLOCK_HOME` | `~/.applock` | state directory |
| `LOCK_TTL` | `90` | lease TTL — crash safety-net (seconds) |
| `LOCK_RENEW_INTERVAL` | `30` | heartbeat interval (seconds, ≤ TTL) |
| `LOCK_MAX_HOLD` | `1800` | hard cap on total hold — idle safety-net (seconds) |
| `APPLOCK_WAIT_INTERVAL` | `5` | poll interval while waiting (seconds) |
| `APPLOCK_OWNER` | tmux session / `user@host:pid` | label stored on the lease |

Per-invocation flags `--ttl`, `--renew`, `--max-hold`, `--port`,
`--wait-interval`, `--wait-timeout` override the env defaults.
