---
name: bullboard
description: Query Vambe prod BullMQ queues read-only through the Bull Board HTTP API (basic auth, creds from 1Password). Use for any question about queue state - failed/waiting/active/delayed jobs, why a job failed, queue backlog, which code handles a queue, worker concurrency, whether workers are alive. Covers 6 instances (vambe, ads, corps, apollo, vibe-flow, salesforce-bridge). Keywords - bull board, bullmq, queue, cola, colas, job, jobs, failed jobs, backlog, stalled, worker, concurrency, redis queue, bull-board.
allowed-tools: Bash
---

# Bull Board (Vambe prod) - read-only

Use the bundled helper `~/.claude/skills/bullboard/scripts/bb`. Never call the API with raw `curl`.

## Rules (non-negotiable)

- **GET only.** The Bull Board API also exposes retry, promote, clean, pause, remove, and `PUT .../concurrency-admin/api/concurrencies/:queue` (changes live worker concurrency). Never send those. If the user explicitly wants a mutation, stop and confirm that exact action first.
- **Never put credentials in argv, env exports, logs or output.** `bb` reads them from 1Password once and caches a curl config (dir `0700`, file `0600`, under `$TMPDIR/bb-<uid>/`) for 60 min (`BB_TTL_MIN`), so Touch ID is asked once, not per call. Never `cat` that file.
- Job `data` can hold customer PII. `bb` shows only payload **keys** by default; pass `--data` only when the user asks for values, and don't paste more than needed.
- Run `bb purge` when the investigation is done.
- If 1Password says `authorization prompt dismissed`, stop and ask the user to unlock/approve 1Password. Don't loop retries.
- **Never keep a list of queue names** in docs, memory or this skill. Repos add and rename queues. Always ask the live API (`bb names`, `bb queues`) and the live code (`bb where`).

## Commands

```bash
bb=~/.claude/skills/bullboard/scripts/bb
$bb instances                                   # vambe ads corps apollo vibe-flow salesforce-bridge
$bb health <instance>                           # redis ok? discovered queue count
$bb names <instance>                            # queue names only (cheap)
$bb queues <instance> [failed|active|waiting|delayed|completed|name]   # counts per queue, sorted desc
$bb jobs <instance> <queue> [status=failed] [n=5] [--data]   # n<=50
$bb job <instance> <queue> <jobId> [--data]
$bb concurrency <instance> [queue]              # worker concurrency, source redis|default
$bb where <instance> <queue>                    # definition, processor, producer in the local repo checkout
$bb purge
```

Statuses: `active waiting waiting-children prioritized completed failed delayed paused latest`.

## How to investigate

1. Find the queue: `bb names <instance> | grep -i <term>`.
2. Pressure: `bb queues <instance> waiting | head`, then `failed`.
3. Failures: `bb jobs <instance> <queue> failed 5` (reason, first stack line, payload keys).
4. Code: `bb where <instance> <queue>`, then read the files it lists. It greps the local checkout of the owning repo at its **current branch**, which may not be what prod runs (it prints the branch).

`bb where` limits: it finds the literal string and the constant holding it. Queues defined through a map/enum (`ads`: `QUEUES.FETCH_INSIGHTS`) show the map line but not processors; `vibe-flow` defines queues in `apps/worker/src/jobs/queue.ts` and has no literal match. Read those by hand.

## Gotchas

- **Failed counts cap at 10000** on busy queues (`removeOnFail` keeps ~10k). `failed=10000` means "at least".
- **Completed shows 200** on most queues for the same reason. Not a throughput number.
- `no-workers` in `bb queues` is a heartbeat (`stalled-check` key seen in the last 60 s), not real connections. A dead worker takes up to a minute to show; workers with `skipStalledCheck: true` look absent even if alive.
- `GET .../queues` returns every queue (~750 KB for `vambe`). `bb` filters it.
- Counts and timestamps are a live snapshot. `timestamp`/`processedOn`/`finishedOn` are epoch ms.
- API base: `https://api.vambe.ai/bull-board/<instance>/queues/api/...` (note `/queues/api`; `/bull-board/<instance>/api` is 404).
- Credentials item: 1Password "BullMQ Dashboard" (vault t55mxbkmcbpqhryz54z6agitai, account vambe.1password.com).

## References

- `references/instances.md` - the 6 instances, owning repos, endpoints, how the board service works (`~/REPOS/bull-board`).
