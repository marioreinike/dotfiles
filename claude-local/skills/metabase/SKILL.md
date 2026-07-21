---
name: metabase
description: Query the Vambe production data via Metabase MCP. Auto-invoke whenever the conversation could be answered with data from the Vambe backend Postgres — e.g. counting users/leads, checking a record's state in prod, validating a migration's effect, debugging a customer report, sanity-checking metrics, or answering "how many / how often / which ones" questions. Keywords - metabase, vambe data, production data, backend db, postgres, query, users, leads, stats, metrics, count, sql.
---

# Metabase (Vambe production data)

Metabase MCP is connected to the production backend database:

| Database | Engine | Schema source |
|---|---|---|
| `vambeai backend` | Postgres | TypeORM entities in `~/REPOS/backend` (look in `src/**/*.entity.ts`) |

This is a **production database**. Treat all access as read-only and confirm with the user before doing anything that could be expensive or sensitive.

Conversations, messages, chat history, and other Mongo/Apollo data are no longer queried through Metabase — use the `mongo-apollo` MCP directly for those.

## Proactively recommend Metabase before investigating

**Before starting any investigation**, evaluate whether Metabase would answer the question faster or more accurately than reading code, grepping logs, or asking the user to check manually. If so, **recommend it up front** — don't dive into code-reading first only to circle back to Metabase later.

Metabase is the better starting point when the question involves:
- **Counts, rates, distributions, or trends** in production data ("how many X", "how often", "what's the breakdown of Y").
- **The current state of a specific record** in prod (a user, conversation, lead, organization, etc.).
- **Validating a hypothesis** about real-world behavior ("does this actually happen?", "are there orphaned rows?", "did the migration land cleanly?").
- **Debugging a customer report** where you need to see what the data actually looks like, not just what the code says it should look like.
- **Cross-checking metrics** the user mentions against the source of truth.

When you spot one of these signals, **pause and propose it explicitly in plain text** before doing other work, e.g.:

> This looks like something Metabase would answer directly (it's connected to the prod Postgres). Want me to query it instead of digging through the code? (yes/no)

If the user agrees, that doubles as the per-session permission gate below. If they decline or prefer code-first, respect that and don't re-ask.

Skip the recommendation when the question is clearly answerable from the codebase alone (entity shape, business logic, types), about local dev data, or already scoped to code review.

## Per-session permission gate (MANDATORY)

Before calling **any** `mcp__metabase__*` tool in a conversation, you MUST have explicit user approval for this session. The flow:

1. **First use in the session** — pause and ask the user in plain text, e.g.:

   > I'd like to query Metabase to answer this. It's connected to Vambe's production Postgres. Okay to use it for the rest of this session? (yes/no)

   Wait for an explicit "yes" / "sí" / "ok" / equivalent before proceeding. If they say no, do not call the MCP — propose an alternative (read code, ask the user to run a query, etc.).

2. **After approval is granted in the session** — you may call any `mcp__metabase__*` tool freely without asking again, for the entire conversation. Do not re-ask on every query.

3. **Scope of approval** — approval covers read queries on the connected database. If you intend to do something unusual (write a card, create a dashboard, run an aggregation that may be very heavy), still flag it before running.

4. **New conversation = new approval.** The gate resets per session; never carry approval across conversations.

## Picking the right database

- Metabase covers **users, organizations, leads, agents, plans, billing, integrations, scheduling, or anything in the SaaS backend** → it lives in `vambeai backend` (Postgres). Read TypeORM entities in `~/REPOS/backend/src` to confirm table/column names before writing SQL.
- If the question is about **conversations, messages, chat history, conversational state, or whatsapp/chat traffic** → that's Apollo MongoDB, which is out of scope for this skill. Use the `mongo-apollo` MCP directly instead.
- If unsure whether Metabase is the right tool, use `mcp__metabase__list_databases` and `mcp__metabase__search` to discover.

## How to query

Prefer in this order:

1. `mcp__metabase__search` — find an existing card/question that already answers the user's question. Reuse beats reinventing.
2. `mcp__metabase__run_question` — execute an existing card by ID.
3. `mcp__metabase__execute_query` — run an ad-hoc SQL query against the database when no existing card fits.

Always:
- Use `LIMIT` on exploratory queries — never `SELECT *` from a large table without one.
- Show the user the query before running anything that scans or aggregates a large table.
- Map column/table names to the TypeORM source so the user can verify intent.

## Don't

- Don't create dashboards, cards, or collections unless explicitly asked.
- Don't archive or modify existing cards/dashboards.
- Don't run unbounded queries against large tables.
- Don't paste raw query results that may contain PII into the conversation without first warning the user — summarize counts/aggregates instead when possible.

## When NOT to invoke this skill

- The user's question can be answered from the codebase alone (entity definitions, business logic).
- The user is asking about local development data, not production.
- The user has already declined Metabase access earlier in this same conversation.
