# Production deployment

UniSphere deploys as two application layers and two private data services:

```text
Browser ──HTTPS──> Next.js web/BFF ──private HTTP──> NestJS API
                                                ├──> PostgreSQL
                                                └──> Redis
```

Only the Next.js service needs a public port. The browser calls `/api/auth/*`
and `/api/backend/*` on the same web origin. Next.js forwards approved routes
to NestJS and holds access and refresh tokens in secure, HTTP-only cookies.

## Container deployment

1. Copy the production template and replace every placeholder:

   ```bash
   cp .env.production.example .env.production
   ```

2. Use independent random values for database, Redis, access-token, and
   refresh-token secrets. URL-encode credentials embedded in connection URLs.

3. Start the production stack:

   ```bash
   docker compose \
     --env-file .env.production \
     -f docker-compose.production.yml \
     up --build -d
   ```

The one-shot `migrate` service runs `prisma migrate deploy` before the API is
allowed to start. The web service starts only after the API health check passes.
PostgreSQL, Redis, and NestJS are not published to the host network.

## TLS and domain

Place a TLS-terminating reverse proxy or managed load balancer in front of port
3000. Route the public domain to the web service and set both `WEB_URL` and
`ALLOWED_ORIGINS` to that exact HTTPS origin. Keep the API on a private network.
The supplied web server emits HSTS, CSP, frame-denial, MIME-sniffing, referrer,
and permissions-policy headers in production.

## Managed hosting

The services can also be deployed separately:

- Next.js: a Node 24 service using the standalone build
- NestJS: a Node 24 service using `node dist/main.js`
- PostgreSQL: managed PostgreSQL with automated backups and point-in-time
  recovery
- Redis: managed Redis with authentication and TLS

Set `BACKEND_API_URL` on the Next.js server to the private NestJS URL ending in
`/api/v1`. Do not expose `BACKEND_API_URL`, database credentials, JWT secrets, or
provider keys through a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variable.

Run this as a release command before starting new API instances:

```bash
pnpm --filter api db:deploy
```

## Release checklist

- Run `pnpm build`, `pnpm typecheck`, and `pnpm test`.
- Confirm database backups and test a restore procedure.
- Use separate secrets and databases for preview and production.
- Restrict platform and database access by least privilege.
- Enable centralized logs, uptime alerts, error monitoring, and resource
  metrics.
- Configure object storage, push credentials, email, and AI-provider secrets
  only when those modules are enabled.
- Verify login, refresh, logout, event registration, QR generation, and
  organizer attendance scanning against the production API.
- Never run the development seed in production; it refuses to execute when
  `NODE_ENV=production`.
