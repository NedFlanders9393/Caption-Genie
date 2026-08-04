# Captly (Caption Genie)

Captly is an AI-assisted caption and social-content application. This repository is a pnpm workspace containing the mobile app, API server, web experiences, shared libraries, and promotional assets.

## Project structure

- `artifacts/captionai-mobile` — Expo / React Native mobile app
- `artifacts/api-server` — Express API server
- `artifacts/captionai` — web application
- `lib/` — shared packages and integrations
- `scripts/` — workspace tooling
- `app-store-screenshots/`, `screenshots/`, and promo projects — release and marketing assets

## Requirements

- Node.js 20 or newer
- pnpm 10.26.1
- Access to the required service credentials through environment variables or Replit Secrets

## Setup

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
```

Run the API tests with:

```bash
pnpm --filter @workspace/api-server test
```

The Replit workspace supplies the development commands and environment-specific domains used by the Expo and API processes.

## Configuration and secrets

Keep credentials in Replit Secrets or your local environment. Never commit `.env` files, API keys, signing keys, database credentials, or service tokens.

The project integrates with services including Clerk, OpenAI/Anthropic, Stripe, Resend, RevenueCat, Expo, and a database. Consult the relevant package and Replit configuration for the exact variables required by each service.

## Security

GitHub secret scanning, push protection, Dependabot alerts, malware alerts, and automated security updates are enabled for this repository.

If you discover a vulnerability, contact the repository owner privately instead of opening a public issue containing sensitive details.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
