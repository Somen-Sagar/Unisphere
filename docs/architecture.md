# UniSphere architecture

## Runtime boundary

```text
Next.js web ──────┐
Expo Android ─────┼── HTTPS ── NestJS API ── PostgreSQL
Expo iOS ─────────┘                    ├────── Redis / BullMQ (next slice)
                                      └────── Object storage (next slice)
```

All authorization and business invariants are enforced by the API. Mobile
SecureStore protects only the refresh token; the access token remains in
memory. Web and mobile may cache API responses, but they do not become systems
of record.

## Shared versus platform-specific code

Shared packages contain serializable types, Zod schemas, business rules, API
transport, and design tokens. Next.js DOM components and React Native
components remain separate so each platform can use its native rendering and
accessibility model.

## Implemented vertical slice

1. A user signs in or registers through the shared API client.
2. NestJS validates the same Zod contract used by the mobile form.
3. Passwords are hashed and refresh sessions are stored as SHA-256 token hashes.
4. Mobile stores only the refresh token in SecureStore and refreshes access
   tokens with rotation.
5. Events are read from PostgreSQL through the public API.
6. An active college member registers; capacity and registration windows are
   checked transactionally.
7. The mobile app renders a registration QR.
8. An authorized organizer scans it; the API prevents duplicate check-ins and
   records who checked the student in.

## Next connected slices

Each slice should include schema, migration, API authorization, shared
contracts, web/mobile UI, and tests:

1. Club membership and recruitment workflows
2. Expo push token registration, notification preferences, BullMQ delivery
3. Event approval workflow and organizer analytics
4. Certificates and downloadable offline records
5. Mess, hostel notices, complaints, and lost-and-found
6. Campus AI retrieval with college-scoped documents and audit logging
7. Full web administration, permission management, and reporting
8. Query persistence, SQLite offline data, and audited offline scanning

Continuous location collection is out of scope. Any future location feature
must be opt-in, foreground-only unless strictly required, and collect the
minimum data needed.
