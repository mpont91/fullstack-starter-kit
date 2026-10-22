# Fullstack starter kit

The base every new project starts from: a monorepo with a typed API contract, an
Express API in hexagonal layers, an Astro + Vue web, and everything a product
needs before its first feature already built, tested and deployable.

What it carries is the set of decisions taken, and proven in production, in the
owner's earlier projects. They're written down so they don't have to be
explained again: the _why_ is in `docs/ARCHITECTURE.md`, the _how_ in the
`CLAUDE.md` files, which Claude Code reads on its own.

## What's inside

| Area       | What you get                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Monorepo   | npm workspaces: `apps/api`, `apps/web`, `packages/shared` (the Zod contract both apps import). `make` for everything. |
| API        | Express 5, Prisma 7 (PostgreSQL), Zod, TypeScript ESM, Node 24. Hexagonal: domain / application / infrastructure.     |
| Accounts   | Sign-up with email confirmation, login, Google sign-in, logout, password change and reset, delete account.            |
| Security   | Revocable JWT sessions, rate limits on auth and email routes, hashed one-time tokens, data scoped by user.            |
| Admin      | A role granted from the command line, user list, account deletion with an audit trail, weekly sign-up metrics.        |
| Email      | Resend behind a port, one branded layout, every message in English and Spanish.                                       |
| Web        | Astro (static) + Vue 3 islands + Tailwind 4, design tokens, dark-first, UI primitives, English and Spanish routes.    |
| Monitoring | Sentry in the API and the web (nothing personal reported), heap watchdog, crash detection, Vercel Analytics.          |
| Tests      | `node:test` everywhere; API integration tests against a real Postgres, external services faked.                       |
| Deploy     | Docker Compose on a VPS (`make deploy`), migrations from a throwaway container; the web on Vercel.                    |
| Backups    | Nightly `pg_dump`, encrypted with `age`, to Backblaze B2; failure alerts through Sentry Crons; `make api/restore`.    |
| Docs       | `VISION`, `ROADMAP` and phase spec templates, the decision log, and a `CLAUDE.md` per app.                            |

## Starting a project

### 1. Create the repository

```bash
gh repo create <name> --private --template <owner>/fullstack-starter-kit --clone
cd <name>
```

Or "Use this template" on GitHub. The new repository starts from a single
commit, without this one's history.

### 2. Make it yours

- [ ] `packages/shared/src/brand.ts`: `APP_NAME`, `APP_DOMAIN`, `APP_SLUG`.
- [ ] The product's description at the top of the three `CLAUDE.md` files (the
      `[brackets]`), and its security rules in the root one.
- [ ] `docs/VISION.md`, then `docs/ROADMAP.md` and the first spec from
      `docs/specs/phase-template.md`. Write them before any code: they're what
      Claude checks every decision against.
- [ ] The palette in `apps/web/src/styles/global.css` (and the same colours in
      `apps/api/src/infrastructure/email/email-layout.ts`).
- [ ] The logo: `apps/web/src/assets/logo.svg`, `apps/web/public/favicon.svg`,
      and `apps/web/public/apple-touch-icon.png` (180×180, used by the emails).
- [ ] The landing copy (`home.*` in `apps/web/src/i18n/en.ts` and `es.ts`) and
      `AppHome.vue`, the first screen after logging in.
- [ ] The legal pages in `apps/web/src/legal/`: fill in the `[brackets]` and
      have them reviewed before real users arrive.
- [ ] Remove from this README what's about the template, and describe the
      product instead.

### 3. Run it locally

Needs Node 24 (`nvm use`), Docker and `make`.

```bash
cp apps/api/.env.example apps/api/.env   # set COMPOSE_PROJECT_NAME, JWT_SECRET
cp apps/web/.env.example apps/web/.env
make install
make dev        # API on :3000 with its database, web on :4321
make check      # the gate: format, lint, typecheck, tests
```

`JWT_SECRET` is `openssl rand -hex 32`. `RESEND_API_KEY` and `GOOGLE_CLIENT_ID`
must be set for the API to boot; any value works locally until the real ones
exist (sign-up then reports the unsent email instead of sending it). To log in
before email works, confirm the account by hand:

```bash
(cd apps/api && docker compose exec db psql -U app -d app \
  -c "UPDATE \"User\" SET \"emailVerifiedAt\" = now() WHERE email = 'you@…'")
make api/grant-admin EMAIL=you@…   # optional: open the admin panel
```

If another project already uses a port, change it in that app's `.env` (see
"Ports and local config" in `CLAUDE.md`).

### 4. Accounts the product needs

Each one is free at a small product's scale. They can come in any order.

- [ ] **Domain**, with DNS you control.
- [ ] **Resend:** verify the domain, create an API key → `RESEND_API_KEY`.
- [ ] **Google Cloud:** an OAuth client of type "Web application", with the
      production origin and `http://localhost:4321` as authorised JavaScript
      origins → `GOOGLE_CLIENT_ID` in `apps/api/.env` and in
      `apps/web/src/constants.ts`.
- [ ] **Sentry** (EU region): one project for the API → `SENTRY_DSN`, one for
      the web → `PUBLIC_SENTRY_DSN`.
- [ ] **Backblaze B2** (EU region): a private bucket, an application key with
      _Read and Write_ access restricted to it → `BACKUP_B2_KEY_ID`,
      `BACKUP_B2_APPLICATION_KEY`. Lifecycle rules in the B2 console: `daily/`
      hides files after 7 days, `weekly/` after 28, both delete a day after
      hiding.
- [ ] **An age key pair** for the backups: `age-keygen`. The public key
      (`age1…`) → `BACKUP_AGE_RECIPIENT`; the private key goes only into the
      password manager, never onto the server.
- [ ] **Vercel:** import the repository with `apps/web` as root directory; set
      `PUBLIC_API_URL` and `PUBLIC_SENTRY_DSN`.
- [ ] **An uptime monitor** (UptimeRobot or Better Stack) on the web and on the
      API's `/uptime`.

### 5. The server

A clean VPS needs Docker (with Compose), git and `make`, the repository cloned
at `SERVER_PATH`, and `apps/api/.env` with the production values,
`NODE_ENV=production`, `COMPOSE_PROFILES=backup` and the `BACKUP_*` keys. In
front of the API, a reverse proxy with TLS for `api.<domain>` forwarding to
`127.0.0.1:$PORT` (exactly one hop: the rate limits rely on it). The web is at
`<domain>`, so the API's `CORS_ORIGINS` and `FRONTEND_URL` are
`https://<domain>`.

> [The reverse proxy in use and how it's configured is still to be recorded
> here.]

Then, from your machine, with `SERVER_SSH` and `SERVER_PATH` in your local
`apps/api/.env`:

```bash
make deploy     # pull, migrate, build and restart on the server
make api/backup # one backup now, to see it reach the bucket
make api/restore # a drill: restore the latest into <db>_restore locally
```

Every later deploy is `make deploy` for the API and a push for the web. Deploy
the API first when the contract changes (see `apps/web/CLAUDE.md`).

## Keeping the template alive

Projects started from here drift, and that's fine: each is its own product. What
stays shared is the generic part: tooling, auth, email, monitoring, deploy,
backups and the conventions. When one of them improves in a project (a bug fixed
in the auth flow, a better deploy step, a new rule in a `CLAUDE.md`), bring it
back here too, so the next project starts from the better version. Each
project's root `CLAUDE.md` asks Claude to point those changes out.

A decision that's only useful to some products (background jobs, money, user
secrets, charts) goes under "Patterns" in `docs/ARCHITECTURE.md` rather than
into the code.
