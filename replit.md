# CaptionAI

AI-powered social media caption generator for small business owners, targeting Apple App Store launch.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude (claude-sonnet-4-6) via Replit AI Integrations

## Artifacts

### CaptionAI Mobile (`artifacts/captionai-mobile`) — PRIMARY
- Native iOS/Android app built with Expo + React Native
- Preview path: `/captionai-mobile/`
- Bundle ID: `com.captionai.app`
- Features:
  - 3 tabs: Generate, History, Hashtags
  - 22 industry niches, 21 post types, 12 multi-select tones (up to 3)
  - Platform-aware captions (Instagram, Facebook, LinkedIn, TikTok, Twitter/X)
  - Caption history stored in AsyncStorage (up to 100 entries)
  - Caption Remix: 8 remix directions inline in History (shorter, longer, funnier, professional, etc.)
  - Best Time to Post: collapsible card shown after generation (single and multi-platform)
  - Hashtag tool with 3 grouped categories (niche, trending, broad)
  - RevenueCat integration ready (skipped for now — see below)
  - 10 free generations/month tracked in AsyncStorage
- Color scheme: Purple (#7C3AED) matching web app
- Font: Inter (400/500/600/700)

### CaptionAI Web PWA (`artifacts/captionai`)
- Mobile-first PWA (secondary to native app)
- Preview path: `/`
- React + Vite + TailwindCSS

### Captly TikTok Promo (`artifacts/captly-promo`)
- Vertical 9:16 animated promo video (React + Framer Motion via video-js scaffold)
- Preview path: `/captly-promo/`
- "Problem → solution hook" style: blank-caption-box pain → Captly demo → name/logo payoff (4 scenes, ~12s)
- On-brand amber/cream, Nunito; lo-fi instrumental bg music; scene + mute controls (preview only, hidden on export)
- Not deployable — exported from the preview pane

### Captly Feature Reel (`artifacts/captly-promo-brand`)
- Vertical 9:16 animated fast-paced FEATURE REEL video (React + Framer Motion via video-js scaffold)
- Preview path: `/captly-promo-brand/` (slug kept from the retired Brand Promo it replaced; title is "Captly Feature Reel")
- NOTE: this artifact was originally the "Brand Promo" (brand-film style). It was rebuilt in place into a short, fast, hook-first feature reel because the project is capped at 7 artifacts and the owner wanted a fresh feature-showcase video for TikTok. The old lightning-bolt brand-film scenes are gone.
- Kinetic/fast style (distinct from the other 3 promos: problem→solution, cinematic): rapid cuts showcasing EVERY feature, Brand Voice leading (6 scenes, ~18.5s): (1) hook "Every AI caption sounds like a robot 🤖 — not this one", (2) Brand Voice hero (sounds like YOU), (3) 1 idea → 3 captions + 22 industries, (4) platform-aware + 30 hashtags in 1 tap, (5) best time to post + caption remix, (6) close: logo + "Free on the App Store"
- On-brand amber/cream, Nunito; NO music (owner adds trending audio in CapCut); scene controls only (mute/audio removed)
- Same frame rule as cinematic: 9:16 cream (#FFFDF9) content column centered in a pure-black (#000000) 16:9 outer letterbox; opaque cards (no glassmorphism) for export clarity; owner crops the 9:16 column in CapCut
- Logo at `public/images/captly-logo.png` (copied from cinematic promo)
- Not deployable — exported from the preview pane

### Captly Cinematic Promo (`artifacts/captly-promo-cinematic`)
- Vertical 9:16 premium/cinematic promo video (React + Framer Motion via video-js scaffold)
- Preview path: `/captly-promo-cinematic/`
- Apple/Notion/Linear-style feature-showcase film (3rd promo, distinct from problem→solution and brand-film): Hook → Problem → Solution → Proof/Features → Brand Voice → Multi-business Montage → Close (7 scenes, ~32.5s)
- LIGHT on-brand amber/cream background *inside* the 9:16 frame (owner's explicit choice — NOT dark), soft gradients, glassmorphism, Nunito; features 3 AI captions, 22 industries, tones, platform-aware, hashtags, best-time, remix, history; closes on logo + "Now available on the App Store"
- The OUTER page/letterbox (area around the 9:16 frame) is pure black (#000000) so the light video is clearly visible in the preview/canvas AND so the side letterbox bars blend into TikTok's black UI on upload — the video CONTENT stays light. Do not revert the outer bg to cream (owner couldn't see the frame edges against a light page) or espresso (owner wanted the side bars on TikTok to be true black, not brown).
- Brand Voice scene (Scene6): shows the Brand Voice setup (brand name, personality/writing-style chips, always/avoid rules) → an on-brand caption result, demonstrating the "sounds like you" differentiator
- Multi-business Montage scene (Scene7): 8 industries (coffee, salon, real estate, fitness, boutique, restaurant, landscaping, bakery) grid + floating engagement reactions (likes/comments/shares) → "more engagement" stat
- Premium cinematic instrumental bg music; scene + mute controls (preview only, hidden on export)
- Not deployable — exported from the preview pane

### API Server (`artifacts/api-server`)
- Express 5 backend at `/api/*`
- Key routes:
  - `POST /api/captions/generate` — generates 3 captions with deep niche/platform prompting
  - `POST /api/captions/regenerate-one` — regenerates a single caption
  - `POST /api/captions/hashtags` — generates 30 grouped hashtags
- Stripe: initialized but optional (gracefully skipped if credentials unavailable)

## Authentication (Clerk — Active)

Replit-managed Clerk instance. Auto-provisioned keys: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`.

Mobile app flow:
- Unauthenticated users → `/(auth)/sign-in` (guarded in `(tabs)/_layout.tsx`)
- Sign-in and sign-up screens: custom native UI using `useSignIn()` / `useSignUp()` hooks from `@clerk/expo`
- Email verification code step built into sign-up flow
- `ClerkProvider` wraps everything in `app/_layout.tsx`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` passed via dev script and build.js

Key files:
- `app/_layout.tsx` — ClerkProvider root
- `app/(auth)/_layout.tsx` — redirects signed-in users to tabs
- `app/(auth)/sign-in.tsx` — sign-in screen
- `app/(auth)/sign-up.tsx` — sign-up + email verification screen
- `app/(tabs)/_layout.tsx` — redirects signed-out users to sign-in
- `app/(tabs)/profile.tsx` — profile tab with usage stats + sign out

## RevenueCat Setup (TODO when ready)

RevenueCat integration was dismissed during setup. To enable subscriptions:

1. Go to [app.revenuecat.com](https://app.revenuecat.com) and create/sign into account
2. Either connect via Replit's RevenueCat integration, OR provide the secret API key manually
3. Run the seed script: `pnpm --filter @workspace/scripts run seed-revenuecat`
   - This creates: Project "CaptionAI", product `captionai_pro_monthly` ($9.99/month), entitlement `pro`, offering `default`
   - Outputs public API keys — store as env vars:
     - `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`
     - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
     - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
     - `REVENUECAT_PROJECT_ID`
4. The `lib/revenuecat.tsx` in the mobile app is already wired up and ready

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/scripts run seed-revenuecat` — seed RevenueCat products

## AI Integration

Anthropic integration uses Replit AI Integrations — no user API key needed. Auto-provisioned via `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY`.

## iOS Share Extension

Allows users to generate captions without leaving Instagram, TikTok, Facebook, etc.

### Architecture
- **Two-tier system**: In-extension generation (no app switch) → fallback to deep-link into main app (pre-filled)
- **App Group**: `group.com.captionai.app` — shared container between main app and extension
- **Auth**: Main app writes Clerk JWT to shared `UserDefaults` on every sign-in; extension reads it directly

### Files
- `targets/ShareExtension/ShareViewController.swift` — UIViewController entry point, detects source app (Instagram/TikTok/etc.)
- `targets/ShareExtension/ShareView.swift` — Full SwiftUI UI (Captly-branded, amber/cream palette)
- `targets/ShareExtension/Info.plist` — NSExtension config, stores API URL + app scheme
- `targets/ShareExtension/ShareExtension.entitlements` — App Group capability
- `targets/main-app/TokenSync.swift` + `TokenSync.m` — Native module that writes JWT to shared UserDefaults
- `plugins/withShareExtension.js` — Expo Config Plugin that wires the extension into the Xcode project
- `lib/tokenSync.ts` — JS wrapper for the TokenSync native module
- `app/_layout.tsx` — `ShareExtensionTokenSyncer` component keeps token synced on sign-in/out
- `app/(tabs)/generate.tsx` — Reads `shareDescription/shareTone/sharePlatform/autoGenerate` deep-link params

### Deep Link Format (fallback)
`captionai-mobile:///generate?shareDescription=TEXT&shareTone=Casual&sharePlatform=Instagram&autoGenerate=true`

### EAS Build Requirements
1. Add App Group `group.com.captionai.app` in Apple Developer portal → Identifiers
2. Register bundle ID `com.captionai.app.ShareExtension` in Apple Developer portal
3. Run `eas build --platform ios --profile production` from `artifacts/captionai-mobile`

## Cost Guardrails

Keeps AI spend bounded so the app stays profitable. See `artifacts/api-server/COST_MARGINS.md` for the full margin review.

- **Per-call cost recording**: every Claude call writes token usage + computed dollar cost (micro-dollars) to `ai_cost_events`. Pricing rates live in ONE place: `MODEL_PRICING` in `artifacts/api-server/src/services/costGuard.ts`.
- **Master spend cap (circuit breaker)**: before each AI call, `checkSpendCap()` compares accumulated UTC day/month spend to owner caps. Over the cap → friendly 503, no credits/allowance consumed. Fails open on DB error.
  - Env: `AI_DAILY_SPEND_CAP_USD` (default 25), `AI_MONTHLY_SPEND_CAP_USD` (default 300). `0` disables.
- **Metered free actions**: hashtags + remix cost no credit but are AI-backed, so they have per-user monthly caps in `metered_action_usage` (rollback on AI failure).
  - Env: `HASHTAGS_MONTHLY_CAP_FREE`/`_PRO`, `REMIX_MONTHLY_CAP_FREE`/`_PRO` (defaults 25 free / 300 pro). `0` disables the action.
- **Owner cost dashboard**: `GET /api/admin/costs` (HTML) and `/api/admin/costs.json`. Access = signed-in owner email (`PRO_OVERRIDE_EMAILS`/`ADMIN_EMAILS`) OR `?token=COST_DASHBOARD_TOKEN`. Fails closed in production.

Key files: `lib/db/src/schema/ai_cost.ts`, `artifacts/api-server/src/services/costGuard.ts`, `artifacts/api-server/src/services/meteredActions.ts`, `artifacts/api-server/src/routes/admin.ts`.

## Caption Generation Engine

Deep prompt system in `artifacts/api-server/src/routes/captions.ts`:
- 22 niche-specific audience profiles with psychology and trigger points
- 5 platform-specific algorithm guides (Instagram, Facebook, LinkedIn, TikTok, Twitter/X)
- 21 post-type formulas with proven structural templates
- 12 tone blend definitions
- Hook variety system (4 different hook types per generation)
- Prefill technique (`{"`) forces valid JSON from Claude
- Generates 3 highly distinct captions per request
