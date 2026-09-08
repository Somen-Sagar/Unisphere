# UniSphere web

The Next.js app is both the public web interface and a backend-for-frontend for
browser authentication. It sends approved requests to the shared NestJS API and
stores tokens in secure, HTTP-only cookies.

## Local development

From the repository root:

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm db:up
pnpm dev:api
pnpm dev:web
```

Open `http://localhost:3000`, sign in, and use the connected dashboard. The
server-only `BACKEND_API_URL` points Next.js to NestJS; it must not use a
`NEXT_PUBLIC_` prefix.

For production, the app builds standalone output. See
`../../docs/deployment.md`.
