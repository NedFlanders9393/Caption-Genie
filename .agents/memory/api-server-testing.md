---
name: api-server testing setup
description: How tests are run in the api-server package and the conventions credit/DB tests follow.
---

# api-server testing

The api-server uses **Vitest** (`pnpm --filter @workspace/api-server run test`).
Tests live next to the code as `src/**/*.test.ts`. There is no separate test
database — integration tests run against the real dev Postgres (`DATABASE_URL`).

## Conventions (follow these for any new DB-touching test)
- Use unique, prefixed ids (e.g. `vitest_<ts>_<rand>`, guests `guest_<id>`),
  track every id created, and delete them in `afterEach`. Never assume an empty
  table — other rows/users may exist.
- Close the pg pool in `afterAll` (`pool` from `@workspace/db`). Keep all DB
  tests that share the pool in ONE file, or the first file's `pool.end()` will
  break later files. `vitest.config.ts` sets `fileParallelism:false` because
  credit transactions use `SELECT ... FOR UPDATE` and parallel files can
  deadlock on the same rows.

## Route/HTTP tests
Mount the real router on a minimal Express app with `express.json()` +
`clerkMiddleware()` (the latter is required because `resolveIdentity` calls
`getAuth(req)`; with no token it resolves to a guest). Hit caption endpoints as
a guest via the `X-Device-Id` header — no Clerk session needed. The credit gate
(402) short-circuits before the Anthropic call, so 402 tests need no AI mock.

**Why:** mocking the DB would test a fiction — the money-critical credit logic
lives in SQL transactions, so tests must exercise real Postgres.
