---
name: metabase
description: Query the Vambe production data via Metabase MCP. Auto-invoke whenever the conversation could be answered with data from the Vambe backend Postgres or the Apollo MongoDB — e.g. counting users/conversations/leads, checking a record's state in prod, validating a migration's effect, debugging a customer report, sanity-checking metrics, or answering "how many / how often / which ones" questions. Keywords - metabase, vambe data, production data, backend db, apollo, postgres, mongo, query, users, leads, conversations, stats, metrics, count, sql.
---

# Metabase (Vambe production data)

Metabase MCP is connected to two production databases:

| Database | Engine | Schema source |
|---|---|---|
| `vambeai backend` | Postgres | TypeORM entities in `~/REPOS/backend` (look in `src/**/*.entity.ts`) |
| `apollo` | MongoDB | Mongoose / collection definitions in `~/REPOS/apollo-chat` |

These are **production databases**. Treat all access as read-only and confirm with the user before doing anything that could be expensive or sensitive.

## Per-session permission gate (MANDATORY)

Before calling **any** `mcp__metabase__*` tool in a conversation, you MUST have explicit user approval for this session. The flow:

1. **First use in the session** — pause and ask the user in plain text, e.g.:

   > I'd like to query Metabase to answer this. It's connected to Vambe's production Postgres and the Apollo Mongo. Okay to use it for the rest of this session? (yes/no)

   Wait for an explicit "yes" / "sí" / "ok" / equivalent before proceeding. If they say no, do not call the MCP — propose an alternative (read code, ask the user to run a query, etc.).

2. **After approval is granted in the session** — you may call any `mcp__metabase__*` tool freely without asking again, for the entire conversation. Do not re-ask on every query.

3. **Scope of approval** — approval covers read queries on either connected database. If you intend to do something unusual (write a card, create a dashboard, run an aggregation that may be very heavy), still flag it before running.

4. **New conversation = new approval.** The gate resets per session; never carry approval across conversations.

## Picking the right database

- If the question is about **users, organizations, leads, agents, plans, billing, integrations, scheduling, or anything in the SaaS backend** → it lives in `vambeai backend` (Postgres). Read TypeORM entities in `~/REPOS/backend/src` to confirm table/column names before writing SQL.
- If the question is about **conversations, messages, chat history, conversational state, or whatsapp/chat traffic** → it lives in `apollo` (MongoDB). Read schemas in `~/REPOS/apollo-chat` to confirm collection/field names.
- If unsure, ask the user which database, or use `mcp__metabase__list_databases` and `mcp__metabase__search` to discover.

## How to query

Prefer in this order:

1. `mcp__metabase__search` — find an existing card/question that already answers the user's question. Reuse beats reinventing.
2. `mcp__metabase__run_question` — execute an existing card by ID.
3. `mcp__metabase__execute_query` — run an ad-hoc SQL/Mongo query against a specific database when no existing card fits.

Always:
- Use `LIMIT` (or Mongo `$limit`) on exploratory queries — never `SELECT *` from a large table without one.
- Show the user the query before running anything that scans or aggregates a large table.
- Map column/table names to the TypeORM/Mongoose source so the user can verify intent.

## Don't

- Don't create dashboards, cards, or collections unless explicitly asked.
- Don't archive or modify existing cards/dashboards.
- Don't run unbounded queries against large tables.
- Don't paste raw query results that may contain PII into the conversation without first warning the user — summarize counts/aggregates instead when possible.

## When NOT to invoke this skill

- The user's question can be answered from the codebase alone (entity definitions, business logic).
- The user is asking about local development data, not production.
- The user has already declined Metabase access earlier in this same conversation.
