# UniSphere

UniSphere is a connected monorepo for the web, Android, iOS, API, and shared
business contracts. Web and mobile use the same NestJS API and PostgreSQL data;
neither client contains a separate backend or database.

## What is working

- NestJS health, authentication, refresh-session rotation, college, event,
  registration, and attendance endpoints
- PostgreSQL models and migrations for users, memberships, clubs, events,
  registrations, and refresh sessions
- Shared TypeScript types, Zod validation, business rules, API client, and
  design tokens
- Expo Router app with secure refresh-token storage, in-memory access tokens,
  TanStack Query, Zustand preferences, login/registration, student navigation,
  club directory/profiles, event discovery/details/registration, QR passes, and
  organizer camera scanning
- Connected Next.js login, registration, dashboard, event registration, clubs,
  and QR passes through a same-origin backend-for-frontend
- HTTP-only web sessions with automatic access-token refresh; refresh tokens
  are never exposed to browser JavaScript
- Production environment validation, CORS allowlisting, security headers,
  request throttling, standalone web output, and container definitions
- PostgreSQL and Redis development services through Docker Compose
- EAS development, preview, and production profiles

The complete modules described in the product roadmap (notifications, club
directory, AI retrieval, mess, complaints, lost-and-found, certificates, and
full admin dashboards) are intentionally built on top of this foundation in
later slices. Their UI should not be treated as complete until their API,
authorization, database, and tests ship together.

## Requirements

- Node 24 (see `.nvmrc`)
- pnpm 11
- Docker with Compose
- Expo Go or an Android/iOS development build

## Local setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm dev` starts the Next.js web app and NestJS API together. Opening only
`pnpm dev:web` renders the frontend, but authenticated actions still require
`pnpm dev:api` and PostgreSQL.

Use long random JWT secrets in `apps/api/.env`. For a physical phone, replace
the sample mobile IP with the computer's LAN address; `localhost` on the phone
points to the phone itself.

The development seed creates:

- `student@unisphere.local` / `UniSphere123!`
- `organizer@unisphere.local` / `UniSphere123!`

These accounts are local-development fixtures only. Set `SEED_PASSWORD` to
override their password.

## URLs

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- API health: `http://localhost:4000/api/v1/health`
- Expo dev server: `http://localhost:8081`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`

## Useful commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm dev:mobile
pnpm build
pnpm typecheck
pnpm test
pnpm db:up
pnpm db:down
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
```

## Repository map

```text
apps/
  api/       NestJS, Prisma, PostgreSQL
  mobile/    Expo SDK 57, Android, iOS, web
  web/       Next.js
packages/
  api-client/
  business-rules/
  design-tokens/
  types/
  validation/
docs/
  architecture.md
```

See [docs/architecture.md](docs/architecture.md) for boundaries and the next
implementation slices. See [docs/deployment.md](docs/deployment.md) for the
production checklist and container deployment.
