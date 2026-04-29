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
  - Hashtag tool with 3 grouped categories (niche, trending, broad)
  - RevenueCat integration ready (skipped for now — see below)
  - 10 free generations/month tracked in AsyncStorage
- Color scheme: Purple (#7C3AED) matching web app
- Font: Inter (400/500/600/700)

### CaptionAI Web PWA (`artifacts/captionai`)
- Mobile-first PWA (secondary to native app)
- Preview path: `/`
- React + Vite + TailwindCSS

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

## Caption Generation Engine

Deep prompt system in `artifacts/api-server/src/routes/captions.ts`:
- 22 niche-specific audience profiles with psychology and trigger points
- 5 platform-specific algorithm guides (Instagram, Facebook, LinkedIn, TikTok, Twitter/X)
- 21 post-type formulas with proven structural templates
- 12 tone blend definitions
- Hook variety system (4 different hook types per generation)
- Prefill technique (`{"`) forces valid JSON from Claude
- Generates 3 highly distinct captions per request
