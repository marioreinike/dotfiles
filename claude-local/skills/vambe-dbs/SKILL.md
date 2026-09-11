---
name: vambe-dbs
description: Query Vambe's databases directly via MCP — postgres-vambe-prod, postgres-vambe-dev, mongo-vambe, mongo-apollo. Use whenever a question could be answered from real data instead of reading code — counting/checking records, validating a migration, debugging a customer report, cross-checking metrics, inspecting conversation/chat history. Keywords - postgres, mongo, mongodb, vambe data, production data, dev data, backend db, apollo db, chat history, conversations, query, users, leads, stats, metrics, count, sql, read replica.
---

# Vambe DBs (Postgres + MongoDB)

Four DB MCPs are available. Pick the right one by what the question is about.

## The four databases

### `postgres-vambe-prod`
- **What**: Vambe's main SaaS Postgres, **production read replica** (`vambeai-prod-read-replica-1`, database `railway`). Read-only by nature (replica) — treat all access as read-only regardless.
- **Repo / schema source**: `backend` (TypeORM). Confirm table/column names against `~/REPOS/backend/src/**/*.entity.ts` before writing SQL.
- **Covers**: users, organizations, leads, agents, plans, billing, integrations, scheduling — the core SaaS backend data model.
- **Use for**: real prod counts/rates/distributions, current state of a specific record, validating a migration landed, debugging a customer report against real data, cross-checking a metric.

### `postgres-vambe-dev`
- **What**: Same schema/shape as prod, but the **dev** Postgres instance (`dev-db.vambe.ai`, database `railway`).
- **Repo / schema source**: `backend` (same TypeORM entities as prod).
- **Use for**: anything scoped to local/dev/staging data, or when you want to poke at data without touching prod at all (e.g. verifying a migration script's behavior before it ever runs against prod).

### `mongo-vambe`
- **What**: Vambe's MongoDB (`cluster0`, prod cluster) — the Mongo-side data the backend also owns (via `@nestjs/mongoose` in `backend`), separate from its Postgres/TypeORM data.
- **Repo / schema source**: `backend` (mongoose schemas/models).
- **Use for**: whatever `backend` models in Mongo rather than Postgres — check the mongoose schema files in `~/REPOS/backend/src` when unsure whether a given collection lives here.

### `mongo-apollo`
- **What**: Apollo's MongoDB (`apollo-prod` cluster) — conversations, messages, chat/connection state.
- **Repo / schema source**: `apollo-chat` (look under `src/messages`, `src/connections`, etc.).
- **Use for**: conversations, messages, chat history, connection/auth state, whatsapp/chat traffic. **Not** in `postgres-vambe-*` or `mongo-vambe` — always route conversation/chat questions here.

## When to use one of these vs. reading code

Prod/dev DB access is the better starting point when the question involves:
- Counts, rates, distributions, or trends in real data.
- The current state of a specific record (user, conversation, lead, organization, etc.).
- Validating a hypothesis about real-world behavior ("does this actually happen?", "are there orphaned rows?", "did the migration land cleanly?").
- Debugging a customer report where you need to see what the data actually looks like, not just what the code says it should look like.
- Cross-checking a metric the user mentions against the source of truth.

Skip straight to code when the question is answerable from entity/schema definitions or business logic alone, or is clearly about something these DBs don't hold.

## Usage — no permission gate

If you're confident one of these MCPs is what the question needs, **or the user has told you to check prod/dev/mongo data**, go straight to querying it — no need to ask first. Only pause to ask when you're genuinely unsure whether querying a DB (vs. reading code, or which of the four DBs) is the right move; in that case suggest it in plain text and let the user confirm, e.g.:

> This looks like something I could answer from `<db>` instead of digging through the code. Want me to query it? (yes/no)

This applies per-database — being told to use one doesn't imply blanket approval for the others if you're unsure about them.

## How to query

1. `list_schemas` / `list_tables` / `describe_table` (Postgres) or `list-collections` / `collection-schema` (Mongo) — confirm table/collection/column/field names before writing a query, cross-checked against the relevant repo's schema source above.
2. `query` (Postgres, read-only SQL) / `find` / `aggregate` (Mongo) — run it.
3. `execute` (Postgres) — only if a non-`query` statement is genuinely needed. `postgres-vambe-prod` is a read replica: writes will fail or are inappropriate, don't attempt them. `postgres-vambe-dev` can take writes, but confirm with the user first since it's still a shared dev environment, not your local sandbox.

Always:
- Use `LIMIT`/equivalent caps on exploratory queries — never scan a large table/collection unbounded.
- Show the user the query/aggregation before running anything that scans or aggregates a large table.
- Map table/column or collection/field names to the source repo so the user can verify intent.

## Don't

- Don't attempt writes against `postgres-vambe-prod` — it's a read replica.
- Don't run unbounded queries against large tables/collections.
- Don't paste raw query results that may contain PII into the conversation without warning first — summarize counts/aggregates instead when possible.

## When NOT to invoke this skill

- The question can be answered from the codebase alone (entity/schema definitions, business logic).
- The user has already declined DB access earlier in this same conversation for the specific DB in question.
