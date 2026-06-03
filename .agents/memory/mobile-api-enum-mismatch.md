---
name: Mobile option lists vs API enum mismatch
description: Why /api/captions/generate returned 400 "Invalid request body" on valid-looking selections, and the contract rule to prevent it.
---

# Mobile picker options must not exceed API schema enums

`POST /api/captions/generate` returned 400 "Invalid request body" whenever the user
picked a niche / postType / CTA that the mobile app's picker offered but the API's
zod enum did not allow. The mobile screen listed ~33 niches, ~33 post types, and
~22 CTAs, while `GenerateCaptionsBody` only enumerated 22 niches, 21 post types, and
7 CTAs. Most common trigger: a CTA like "Book Now" (not in the 7 allowed values).

**Fix applied:** relaxed `niche/platform/postType/captionLength/ctaType` from enums
to plain `type: string` in `lib/api-spec/openapi.yaml`, matching the already-loose
`RegenerateOneCaptionBody`. Regenerated orval (`pnpm --filter @workspace/api-spec run codegen`).
When an enum becomes a plain string, orval DELETES the per-field enum type files
(`generateCaptionsBody<Field>.ts`) — you must remove their barrel re-exports in
`lib/api-zod/src/index.ts` or typecheck:libs fails with TS2307.

**Why:** the AI prompt consumes these values as free text; strict enums added no
safety, only a hidden coupling where adding a picker option silently broke generation.

**How to apply:** when a free-text-ish field feeds an LLM prompt, prefer `string`
over `enum` in the OpenAPI contract. If you keep an enum, any new option added to a
client picker MUST be added to the enum in lockstep, or the request 400s.

**Deploy note:** this is a backend fix. The TestFlight build hits the published API
(captura.replit.app), so it only takes effect after the deployment is republished —
no new EAS/mobile build needed.
