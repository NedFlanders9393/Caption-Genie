---
name: Captly DB schema drift — drizzle push is unsafe
description: The drizzle schema does not model every live table, so drizzle-kit push proposes destructive drops; never blind-push. How to add tables safely + propagate to prod.
---

# Captly DB schema drift

The live Postgres has tables that are NOT in the drizzle schema (`lib/db/src/schema/index.ts`), notably `caption_history` and `user_favorites` (and historically others). Because drizzle only sees the exported schema, `drizzle-kit push` treats those unmodeled live tables as "removed" and offers to **rename/drop** them (e.g. "rename caption_history → ai_cost_events"). Accepting defaults / piping `yes ''` would DROP real user data.

**Rule:** Do NOT run `drizzle-kit push` (interactive or via `yes ''`) against this DB to add a table. It is unsafe until the schema models every live table.

**Why:** schema and DB drifted long ago; the app reads/writes tables that were never added to the drizzle schema files.

**How to add a missing table safely:**
1. Create ONLY the new table(s) directly in the **dev** DB via `executeSql` DDL (dev allows DDL). Match drizzle naming so a future clean push shows no diff: single serial PK → postgres default `<table>_pkey` (inline `serial PRIMARY KEY`); composite PK → `CONSTRAINT "<table>_<col1>_<col2>_<col3>_pk"`.
2. Verify via `information_schema.tables`.
3. To fix **production**: republish/redeploy. Replit's Publish flow diffs the dev DB against prod and applies only the delta (the new tables). Unmodeled tables exist identically in both, so they are untouched. The agent must NOT write prod migration scripts (production executeSql is read-only anyway).

**Canonical incident:** cost-guard tables `ai_cost_events` + `metered_action_usage` (defined in `schema/ai_cost.ts`) were never pushed to ANY DB. Deployed code called them → prod `POST /api/captions/hashtags` (and remix) 500'd with `relation "ai_cost_events" does not exist`. Fix = create both in dev via DDL, then republish so prod gets them.
