---
name: Production DB is separate from dev DB (and can be frozen)
description: Why server features can work in dev but fail in the deployed app even with identical code
---

# Dev DB and prod DB are different databases

Dev `DATABASE_URL` points at the Replit dev Postgres (host `helium`/`heliumdb`).
The published deployment talks to a **separate** production database (Neon-backed).
Schema/data confirmed in dev does NOT prove prod has it.

**Why this matters:** a DB-backed feature (e.g. credits routes) can pass every dev
check yet fail live because prod is a different DB.

## Frozen production database
- Symptom in deployment logs: `The endpoint has been disabled. Enable it using the API and retry.` (Neon XX000).
- Confirm with: `executeSql({ environment: "production", sqlQuery: "SELECT 1" })`.
  A frozen DB returns: `PRODUCTION_DATABASE_ERROR ... is frozen. Unfreeze it first.`
- Fix is a **user UI action** (unfreeze in Database/Deployment pane) — the agent cannot unfreeze programmatically.
- Prod DBs freeze after the deployment sits inactive.

## How to apply
When a deployed app reports DB-ish failures but dev works:
1. Don't trust dev psql as proof of prod state.
2. Query prod read-replica via `executeSql({environment:"production"})`.
3. If frozen, tell the user to unfreeze; then republish.

## Schema changes to prod
Prod schema is migrated automatically at Publish time (Replit diffs dev→prod).
Do not write scripts to migrate prod. See database skill "Production schema changes".
