# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

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
- **AI**: Anthropic Claude via Replit AI Integrations (`@workspace/integrations-anthropic-ai`)

## Artifacts

### CaptionAI (`artifacts/captionai`)
- Mobile-first PWA for social media caption generation for small businesses
- Preview path: `/`
- React + Vite + TailwindCSS frontend
- Purple/white color scheme
- Features: niche selector, tone selector, AI caption generation, copy to clipboard, usage counter (10 free/month via localStorage), upgrade modal
- PWA support via `vite-plugin-pwa`

### API Server (`artifacts/api-server`)
- Express 5 backend serving `/api/*`
- Key routes: `POST /api/captions/generate` — generates 5 captions using Claude claude-sonnet-4-6

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## AI Integration Note

The Anthropic integration uses Replit AI Integrations (no user API key needed). The env vars `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` are auto-provisioned.

## api-zod barrel note

After running codegen, `lib/api-zod/src/index.ts` must NOT export both `./generated/api` and `./generated/types` with `export *` — this causes name conflicts. The barrel only re-exports from `./generated/api` plus selective `export type` imports from `./generated/types` for types not in api.ts.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
