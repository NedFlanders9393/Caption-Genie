---
name: drizzle-kit push is interactive (no TTY in agent shell)
description: How to apply new Drizzle tables when `db push` blocks on a rename/create prompt
---

`pnpm --filter @workspace/db run push` runs `drizzle-kit push`, which for NEW
tables prompts "Is X created or renamed from another table?" as an interactive
**select**. The agent bash shell is not a real TTY, so piping `\n`/`printf`
does NOT advance the prompt — it just re-renders and hangs.

**How to apply:** when push blocks on the create/rename prompt, create the new
tables directly with raw SQL that matches the Drizzle schema exactly (column
types, defaults, indexes, composite PKs), via `executeSql` in code_execution.
`drizzle-kit push` is a differ (not migration-tracked), so once the tables exist
matching the schema, a later push sees no diff. Use `CREATE TABLE IF NOT EXISTS`
+ `CREATE INDEX IF NOT EXISTS` and name the composite PK constraint
`<table>_<col1>_<col2>_..._pk` to match Drizzle's `primaryKey({columns})` output.
