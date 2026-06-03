---
name: AI-output JSON keys must be normalized server-side
description: Why the hashtag "grouped" key drifted (popular vs trending) and the rule to keep AI-shaped responses safe.
---

# Normalize AI-generated JSON before returning it to clients

The `/api/captions/hashtags` route returns a `grouped` object split into three
buckets. The AI prompt and the primary mobile app used the key `popular`, but the
OpenAPI contract, the generated zod/types, AND the web app used `trending`. Result:
the web "Trending" section dereferenced an undefined key and rendered empty.

**Fix applied:** standardized on `popular` everywhere (AI output is the source of
truth). Updated `lib/api-spec/openapi.yaml` GenerateHashtagsResponse, the web
`App.tsx` (local useState type + both read sites), regenerated orval. Then hardened
the server route to **normalize** the AI JSON before `res.json`: coerce each group to
`string[]`, map a stray `trending` → `popular`, and fall back the flat `hashtags`
list to the concatenation of the groups. Clients dereference `grouped.popular.slice(...)`
directly, so a malformed/legacy model output would crash them otherwise.

**Why:** an LLM can emit a slightly different key or omit a field on any call. A raw
pass-through of `JSON.parse(aiText)` couples every client to the model behaving
perfectly. Normalizing at the boundary makes the response contract guaranteed.

**How to apply:** any endpoint that returns parsed LLM JSON should build an explicit
normalized object (guaranteed types + alias tolerance) rather than returning the
parsed blob. Keep the AI prompt's key names, the OpenAPI contract, and every client
read site in lockstep.

**Barrel gotcha:** `@workspace/api-zod` re-exports `GenerateHashtagsResponse` as a
TYPE (via `export type` of the generated type) which shadows the zod *value* of the
same name from `export * from "./generated/api"`. So you cannot `safeParse` with it
through the barrel — it resolves to a type only. Normalize manually instead, or import
the zod value from its concrete generated path.

**Deploy note:** backend-only fix; reaches TestFlight only after the deployment
(captura.replit.app) is republished — no new EAS build needed.
