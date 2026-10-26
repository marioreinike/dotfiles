# Bull Board instances (prod)

One NestJS service (`~/REPOS/bull-board`, ECS service `prod-bull-board`, deployed from `main`) mounts several boards, one per **instance**. Each instance has its own `path`, Redis (or Redis Cluster) connection and discovery loop. Config lives in the `prod-bull-board` Secrets Manager secret (`BULL_BOARD_INSTANCES`, JSON array) plus `BULL_BOARD_USERNAME` / `BULL_BOARD_PASSWORD`. A new instance is just a new JSON entry, so re-check the list with `GET /bull-board` (HTML) if `bb instances` looks stale.

All instances sit behind the same HTTP basic auth. URL pattern: `https://api.vambe.ai/bull-board/<path>/...`

| path | contents | owning repo (names verified present in its code) |
|---|---|---|
| `vambe` | core platform: messaging channels, appointments, exports, subscriptions, AI | `~/REPOS/backend` |
| `ads` | ads/Meta integrations, attribution exports, embeddings (kebab-case names) | `~/REPOS/ads-backend` |
| `corps` | per-client custom integrations | `~/REPOS/vambeai-corps-v2` |
| `apollo` | apollo-chat events, messages, proxies | `~/REPOS/apollo-chat` |
| `vibe-flow` | engine / proposer / workflow worker | `~/REPOS/vambe-vibe-flow` (`apps/worker/src/jobs/`) |
| `salesforce-bridge` | Salesforce CDC webhook delivery | `~/REPOS/salesforce-cdc-bridge` |

## HTTP endpoints (per instance)

| method | path | notes |
|---|---|---|
| GET | `/bull-board` | HTML list of instances with Redis ping and queue count |
| GET | `/<path>/health` | `{path, status, redis, discoveredQueues}` |
| GET | `/<path>/discovered-queues` | `{path, queues: [names]}` |
| GET | `/<path>/queues/api/queues` | all queues with counts and a few latest jobs each (huge) |
| GET | `/<path>/queues/api/queues?activeQueue=<Q>&status=<S>&page=1&jobsPerPage=<N>` | jobs of one queue by status |
| GET | `/<path>/queues/api/queues/<Q>/<jobId>` | `{status, job}` |
| GET | `/<path>/concurrency-admin/api/concurrencies` | `[{queue, concurrency, source}]`, source `redis` or `default` |
| PUT | `/<path>/concurrency-admin/api/concurrencies/<Q>` | **MUTATES live worker concurrency. Never use.** |
| PUT/POST/DELETE | under `/queues/api/...` | retry / promote / clean / pause / remove. **Never use.** |

Unauthenticated: only `GET /health` at the service root (ALB probe).

## How the board service behaves (why numbers look the way they do)

- **Discovery**: `SCAN` for `<prefix>:*:meta` every 5 s. Any BullMQ queue a producer or worker ever touched shows up. A listed queue has been used at least once; that does not prove a worker exists.
- **Prefixes**: each queue is read under its own prefix. On Redis Cluster, backend uses a hash-tagged prefix `{QUEUE_NAME}` per queue (shared `{exports}` for one FlowProducer group). Queues found under a prefix without `{}` on a multi-shard cluster are dropped as stale pre-migration copies.
- **BullMQ Pro**: queues are registered as `QueuePro` with Bull Board's `BullMQProAdapter`, so Pro **groups** are visible (grouped waiting jobs show in `waiting` as `name (group: <id>)`, folded into counts).
- **Workers**: `hasWorkers` is inferred from the `<prefix>:<queue>:stalled-check` heartbeat key (set every ~30 s by each worker), alive for 60 s after last seen. The service never runs `CLIENT LIST` (it took prod down on 2026-09-08).
- **Concurrency admin**: control plane only. Writes `queue:concurrency:<queue>` and publishes `queue:concurrency:changed` on `pubsubRedis` (backend uses a separate `REDIS_WS`), which backend's `WorkerConcurrencyBootstrapService` listens to. `source: default` means no override in Redis.

## Where queues are registered in code (to read by hand when `bb where` falls short)

- `backend`: queue-name constants under `src/**/consts/*.ts`, aggregated in `src/redis/const/queues.ts`; default concurrency in `src/queue-concurrency/consts/queue-concurrency-defaults.ts`; processors are `@Processor(NAME)` classes under `src/redis/consumers/` and feature modules; producers use `@InjectQueue(NAME)`.
- `ads-backend`: names in `src/redis/queues.ts`, processors in `src/redis/processors/`.
- `vambeai-corps-v2`: `src/queue/consts/queues.ts`, consumers under each client folder.
- `apollo-chat`: consumers in `src/redis/consumers/`.
- `salesforce-cdc-bridge`: `src/webhook/consts/queue.ts`, consumer in `src/redis/consumers/webhook/`.
- `vambe-vibe-flow`: `apps/worker/src/jobs/queue.ts`.
