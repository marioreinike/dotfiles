---
name: postgres-vambe-prod
description: Query Vambe production data via the postgres-vambe-prod MCP (direct read replica connection). Auto-invoke whenever the conversation could be answered with data from the Vambe backend Postgres — e.g. counting users/leads, checking a record's state in prod, validating a migration's effect, debugging a customer report, sanity-checking metrics, or answering "how many / how often / which ones" questions. Keywords - postgres, vambe data, production data, backend db, query, users, leads, stats, metrics, count, sql, read replica.
---

# Postgres Vambe Prod (Vambe production data)

`postgres-vambe-prod` MCP (`mcp-postgres-server`, stdio) is connected directly to Vambe's production Postgres **read replica** (`vambeai-prod-read-replica-1`, database `railway`). Schema source: TypeORM entities in `~/REPOS/backend` (look in `src/**/*.entity.ts`).

This is a **production database** (read replica, but still live prod data). Treat all access as read-only and confirm with the user before doing anything that could be expensive or sensitive.

Conversations, messages, chat history, and other Mongo/Apollo data are NOT in this database — use the `mongo-apollo` MCP directly for those.

## Proactively recommend this before investigating

**Before starting any investigation**, evaluate whether querying prod Postgres would answer the question faster or more accurately than reading code, grepping logs, or asking the user to check manually. If so, **recommend it up front** — don't dive into code-reading first only to circle back later.

Prod Postgres is the better starting point when the question involves:
- **Counts, rates, distributions, or trends** in production data ("how many X", "how often", "what's the breakdown of Y").
- **The current state of a specific record** in prod (a user, conversation, lead, organization, etc.).
- **Validating a hypothesis** about real-world behavior ("does this actually happen?", "are there orphaned rows?", "did the migration land cleanly?").
- **Debugging a customer report** where you need to see what the data actually looks like, not just what the code says it should look like.
- **Cross-checking metrics** the user mentions against the source of truth.

When you spot one of these signals, **pause and propose it explicitly in plain text** before doing other work, e.g.:

> This looks like something I could answer directly from prod Postgres (read replica). Want me to query it instead of digging through the code? (yes/no)

If the user agrees, that doubles as the per-session permission gate below. If they decline or prefer code-first, respect that and don't re-ask.

Skip the recommendation when the question is clearly answerable from the codebase alone (entity shape, business logic, types), about local dev data, or already scoped to code review.

## Per-session permission gate (MANDATORY)

Before calling **any** `mcp__postgres-vambe-prod__*` tool in a conversation, you MUST have explicit user approval for this session. The flow:

1. **First use in the session** — pause and ask the user in plain text, e.g.:

   > I'd like to query the prod Postgres read replica to answer this. Okay to use it for the rest of this session? (yes/no)

   Wait for an explicit "yes" / "sí" / "ok" / equivalent before proceeding. If they say no, do not call the MCP — propose an alternative (read code, ask the user to run a query, etc.).

2. **After approval is granted in the session** — you may call any `mcp__postgres-vambe-prod__*` tool freely without asking again, for the entire conversation. Do not re-ask on every query.

3. **Scope of approval** — approval covers read queries on the connected database. If you intend to do something unusual (a heavy aggregation, scanning a huge table), still flag it before running.

4. **New conversation = new approval.** The gate resets per session; never carry approval across conversations.

## Picking the right database

- This DB covers **users, organizations, leads, agents, plans, billing, integrations, scheduling, or anything in the SaaS backend**. Read TypeORM entities in `~/REPOS/backend/src` to confirm table/column names before writing SQL.
- If the question is about **conversations, messages, chat history, conversational state, or whatsapp/chat traffic** → that's Apollo MongoDB, out of scope here. Use the `mongo-apollo` MCP directly instead.
- If unsure of the schema, use `mcp__postgres-vambe-prod__list_schemas`, `mcp__postgres-vambe-prod__list_tables`, and `mcp__postgres-vambe-prod__describe_table` to discover.

## How to query

1. `mcp__postgres-vambe-prod__list_tables` / `describe_table` — confirm table/column names before writing SQL, cross-checked against the TypeORM entities.
2. `mcp__postgres-vambe-prod__query` (read-only SQL) — run the query.
3. `mcp__postgres-vambe-prod__execute` — only if a non-`query` statement is genuinely needed; this is a **read replica**, writes will fail or are inappropriate — don't attempt them.

Always:
- Use `LIMIT` on exploratory queries — never `SELECT *` from a large table without one.
- Show the user the query before running anything that scans or aggregates a large table.
- Map column/table names to the TypeORM source so the user can verify intent.

## Don't

- Don't attempt writes — this is a read replica.
- Don't run unbounded queries against large tables.
- Don't paste raw query results that may contain PII into the conversation without first warning the user — summarize counts/aggregates instead when possible.

## When NOT to invoke this skill

- The user's question can be answered from the codebase alone (entity definitions, business logic).
- The user is asking about local development data, not production.
- The user has already declined prod Postgres access earlier in this same conversation.
