# CLAUDE.md — apps/api

Architecture, conventions, commands and logistics for the backend — the single
source of truth for how to work on it. Rules in the root `CLAUDE.md` also apply.

## What this is

Backend for **[Product]**: [what it does]. Accounts (email and password, or
Google), email, an admin panel and monitoring come from the starter kit. Express
5 + Prisma 7 (PostgreSQL) + Zod, TypeScript ESM, Node 24.

The frontend (`apps/web`) consumes this API through the contract in
`packages/shared`. See "The contract" below.

## Hexagonal architecture

Three layers, one dependency rule: **dependencies point inwards.**

```
infrastructure/  →  application/  →  domain/
   adapters          use cases        ports, types, errors, mappers
```

- **`src/domain/`** — the core. Internal Zod schemas and inferred types, port
  _interfaces_, error classes, mappers. Depends only on Zod and `@app/shared`.
- **`src/application/`** — one use case per action. Orchestrates ports. Knows
  nothing about Express, Prisma, JWT or Resend.
- **`src/infrastructure/`** — every concrete adapter: `web/` (Express),
  `persistence/` (Prisma), `auth/` (bcrypt, jsonwebtoken, one-time tokens,
  Google), `email/` (Resend and the email templates), `monitoring/` (Sentry and
  the watchdogs). A new kind of outside world gets its own folder.

The rule is enforceable by grep, and it must hold:

```bash
# must print nothing
grep -rl "from 'express'\|@prisma/client\|infrastructure/" \
  src/application src/domain
```

If a use case needs something from the outside world, it gets a **port** in
`src/domain/ports/` and an adapter in `src/infrastructure/`. Never import a
concrete adapter from a use case.

### Where things go

| You are adding…                                 | It goes in                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| A new endpoint's business logic                 | `src/application/<verb>-<noun>-use-case.ts`                      |
| A request/response shape                        | `packages/shared` as a Zod schema (see "The contract")           |
| An internal shape (record, port payload)        | `domain/types/` as a Zod schema                                  |
| A new external dependency (API, queue, mailer)  | interface in `domain/ports/`, impl in `infrastructure/`          |
| A calculation the product promises to get right | pure function in `domain/`, with tests worked out by hand        |
| A new failure mode                              | `domain/errors/` + a branch in `web/middleware/error-handler.ts` |
| HTTP wiring                                     | `web/controllers/` + `web/routes.ts`                             |
| Reshaping a record for the API                  | `domain/mappers/`                                                |
| Building a collaborator                         | `src/di.ts`, and nowhere else                                    |

### Adding a feature, end to end

The order that keeps the typechecker on your side:

1. The wire shapes in `packages/shared/src/<resource>.ts`, exported from its
   `index.ts`; `make shared/build`.
2. The model in `prisma/schema.prisma`, with a `userId` and `onDelete: Cascade`
   if it belongs to a user; a migration (see "Database").
3. `domain/types/<resource>.ts` (the `XRecord`), the port in `domain/ports/`,
   its errors in `domain/errors/` and a mapper `toX` in `domain/mappers/`.
4. The Prisma adapter in `infrastructure/persistence/`, every method scoped by
   `userId`.
5. One use case per action in `application/`.
6. The wiring: `di.ts`, a controller in `web/controllers/`, its routes in
   `web/routes.ts` (behind `guard` if it touches user data), and a branch in
   `error-handler.ts` for each new error.
7. Tests in `tests/` against the real database, external services faked.
8. In the web: a service in `src/services/`, the island, its strings in both
   languages (see `apps/web/CLAUDE.md`).

## Conventions

**Zod schemas are the source of truth; types are inferred.** Never hand-write an
interface for a domain shape:

```ts
export const userRecordSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.date() /* … */,
})
export type UserRecord = z.infer<typeof userRecordSchema>
```

**`XRecord` vs `X`.** `XRecord` is the full persisted row, in `domain/types/`;
`X` is what the API exposes, in `@app/shared`. `UserRecord` carries `hash` and
the verification token; `User` does not. Records hold `Date`s; the wire holds
ISO strings. A mapper in `domain/mappers/` converts one to the other (`toUser`,
`toAdminUserSummary`). **Never return a `Record` straight to a controller.**

**Use cases expose exactly one public method, `execute`.** One class per file,
named `<Verb><Noun>UseCase` in `<verb>-<noun>-use-case.ts`. Dependencies arrive
through the constructor as `private readonly` ports. Shared application logic
used by several use cases is a `<Noun>Service` with a single descriptive method:
`VerificationEmailService.send` today. Add one only when a second use case
actually needs it.

**Controllers are thin.** Parse with the shared Zod schema, call one use case,
wrap the result. They never contain business logic:

```ts
register = async (request: Request, response: Response): Promise<void> => {
  const body = registerRequestSchema.parse(request.body)
  const data = await this.registerUseCase.execute(body)
  response.status(201).json({ data })
}
```

Controller methods are **arrow-function class properties** (they're passed as
route handlers, so `this` must stay bound). Wrap every async handler in
`asyncHandler(...)` in `routes.ts` so rejections reach the error middleware.
Read the user id with `requireUserId(request)`, never `request.userId` directly.

**Response envelope.** Success is always `{ data }` — `201` for creations, `202`
for a request that only queues work, `200` otherwise. Endpoints with nothing to
return answer `{ data: { message } }`. Errors are always `{ error, details }`,
produced _only_ by `web/middleware/error-handler.ts`. Controllers never build an
error response and never `try/catch` for HTTP purposes: throw a domain error and
let the middleware map it.

**Errors → status codes** live in one place, `error-handler.ts`:

| Error                                                  | Status  |
| ------------------------------------------------------ | ------- |
| `ZodError`, `InvalidOrExpired*TokenError`              | 400     |
| `InvalidCredentials`, `Unauthorized`                   | 401     |
| `IncorrectPassword`, `EmailNotVerified`, `Forbidden`   | 403     |
| `UserNotFound`                                         | 404     |
| `EmailAlreadyInUse`                                    | 409     |
| `TooManyAttempts`                                      | 429     |
| Express's body parser (malformed JSON, body too large) | 400/413 |
| anything else (reported to Sentry)                     | 500     |

The product's own errors join the table as they're added: a `<Thing>NotFound` is
a 404, a state that forbids the action (`<Thing>Busy`) a 409, input a rule
refuses a 400 or a 422 with a reason the web can show, a provider that's down
a 502.

`IncorrectPassword` is a 403, not a 401: a wrong password on an authenticated
request must not make the frontend drop the session. **A new domain error is
invisible until you add its branch here** — it will surface as a 500.

**Dependency injection** is the static `Container` in `src/di.ts`. Every
collaborator is built there and nowhere else. It returns a _new_ instance per
call — fine for stateless classes; don't rely on identity.

**Configuration.** Read `process.env` in `src/settings.ts` (and `prisma.ts`)
only. Everything else receives values through constructors. The shape is
validated by `settingsSchema` in `domain/types/settings.ts`, so a missing secret
stops the boot instead of failing on the first request that needs it.

**The app name is never hardcoded.** Use `APP_NAME` and `APP_DOMAIN` from
`@app/shared` (the sender address of every email is built from them).

**Style.** Prettier: no semicolons, single quotes. Named exports only — no
default exports in `src/`. Types are imported plainly alongside values; the
`type` keyword only where needed to disambiguate a lib import. Filenames are
kebab-case; classes are PascalCase.

**Comments explain _why_, not _what_.** Use them sparingly, for non-obvious
decisions — see the link flow in `google-sign-in-use-case.ts` or the second
rounding in `domain/sessions.ts`. Don't narrate code that reads plainly.

## The contract

Request and response schemas live in `packages/shared`, not here. This app
imports them; it never redeclares them.

- Controllers parse requests with the shared schema.
- Use cases that answer a request return the shared type, built by a mapper, so
  the typechecker enforces the shape. In tests, responses are also parsed with
  the shared schema (`authResponseSchema.parse(session)`), which catches a
  `Date` leaking onto the wire.
- Changing a shared schema means `apps/web` must still compile in the same
  change (root `make check`).
- CORS origins come from `CORS_ORIGINS` (comma-separated) in `settings.ts`: the
  production domain in production, the local web origin in dev. A new frontend
  origin needs adding there or the browser blocks it.

## Monitoring

Errors reach the owner through Sentry (EU region), as the `ErrorReporter` port.

- **What's reported:** every 500 (from `error-handler.ts`), a welcome email that
  can't be sent, and an uncaught exception that kills the process. Each report
  is tagged with `where` it failed. Other email failures already surface as
  a 500. A background loop the product adds reports its own failures the same
  way.
- **A failure that's caught and swallowed must be reported**, or nobody hears of
  it. Report it; don't just `console.error` it (the reporter logs it too).
- **Nothing but a user id goes with it.** `scrubEvent` drops breadcrumbs, the
  request's headers, body and query, and every user field but the id; Prisma
  runs with `errorFormat: 'minimal'` so its messages don't carry the query's
  arguments. Never put a user's data, an email or a token in an error message.
- **What can't be reported from inside is watched around it.** Running out of
  heap aborts the process with no handler running. So `HeapWatchdog` reports a
  heap past 80% of its limit (checked every minute, once until it drops below
  70%), and `RunMarker` reports on boot that the previous run died without
  shutting down (a file in the container's `/tmp`, removed on a clean shutdown;
  a deploy starts a new container, so it never misfires there). Don't run the
  API with `--max-old-space-size`: it inflates the limit the watchdog divides
  by.
- Without `SENTRY_DSN` (development, tests) the SDK does nothing and errors only
  reach the console. Tests use `FakeErrorReporter`.

## Auth & sessions

- Stateless JWTs with a `jti`. `POST /auth/logout` revokes that token
  (`RevokedToken`); changing the password sets `sessionsValidFrom`, which ends
  every other session, and returns a fresh token for the current one.
- Registering creates an unverified account and sends the welcome email; login
  answers 403 (`EmailNotVerified`) until the link in it is used. Sending is
  best-effort: a failed email doesn't fail the registration.
- Endpoints that take an email to send something (resend verification, request a
  password reset) answer the same whether or not the account exists.
- Verification and reset tokens are stored hashed, with an expiry.
- Login, Google sign-in and sign-up are rate limited per IP, in memory
  (`middleware/rate-limit.ts`): 10 failed attempts per 15 minutes on
  `/auth/login`, and again on `/auth/google` (each route counts on its own), and
  5 sign-ups per hour. Resending the confirmation link and requesting a password
  reset allow 5 per hour each. Over the limit the route answers 429
  (`TooManyAttempts`).
- `POST /auth/google` takes the ID token from Google's button and logs in, links
  or registers (`GoogleSignInUseCase`). `GoogleAuthLibraryVerifier` checks it
  against Google's keys and our client id (`settings.auth`, not an env var: it
  isn't secret). It fetches Google's keys before verifying, outside its `catch`,
  so Google being unreachable is a 500 and a bad token a 401. Only `email` and
  `sub` (as `googleId`) are kept. An address Google hasn't verified is refused;
  linking an account whose email was never confirmed removes its password (see
  "Accounts and auth" in `ARCHITECTURE.md`).
- An account can have no password (`hash` null): password login and password
  confirmations refuse it, the forgotten-password email sets one, and deleting
  it takes `{ googleCredential }`, which must belong to its `googleId`. `User`
  carries `hasPassword` so the web knows which to ask for.

## Admin

A `role` on `User` (`USER`/`ADMIN`), not a separate admin account: admins log in
like everyone else and reuse the whole session machinery.

- **The app never sets a role.** It's granted with
  `make api/grant-admin EMAIL=…` (and taken away with `make api/revoke-admin`),
  locally or on the server after `make api/ssh`, so nobody can promote
  themselves.
- **`/admin/*` is checked server-side** by `adminGuard`, which reads the role
  from the database on every request — revoking takes effect immediately, not
  when a token expires. Hiding the link in the frontend is cosmetic.
- **Admins see accounts, not their contents**: the user list shows the email,
  when they joined, whether they confirmed it and how they sign in. Counts of
  what a user keeps can be added; its contents never.
- **Metrics are counts, computed on read** (`GET /admin/metrics`, SQL in
  `prisma-metrics-repository.ts`): users, and sign-ups per week with how many
  confirmed. The product's signals (`docs/VISION.md`, "How we will know it
  works") join them as more counts. Nothing in them may identify a user.
- **Every action is recorded** in `AdminAction` (who, what, to whom). Only ids
  are kept, so a deleted user's email doesn't survive in the trail.
- An admin can't delete their own account from the panel.

## Commands

Everything goes through this app's `Makefile`; from the repo root, prefix with
`api/` (`make api/check`). This app has no npm scripts.

| Command                             | What it does                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `make dev`                          | DB container up → migrate → `tsx watch`                                       |
| `make check`                        | typecheck (the full gate, with prettier and eslint, is the root `make check`) |
| `make test`                         | Create and migrate the test database, then run the tests                      |
| `make grant-admin` / `revoke-admin` | Give or take away the admin role: `make api/grant-admin EMAIL=…`              |
| `make down` / `make logs`           | Stop the containers / follow their logs (dev or production)                   |
| `make build`                        | Build and (re)start the production stack                                      |
| `make deploy` / `make ssh`          | Deploy to the VPS / open a shell there                                        |
| `make backup`                       | Take one off-site backup now, as the server does every night                  |
| `make restore [FILE=…]`             | Restore a backup into `<POSTGRES_DB>_restore` (see "Backups")                 |

For anything else, call the tool directly: `npx prisma studio`,
`npx prisma migrate dev --name <change>`.

### Ports

Standard ports by default, overridable per machine in `.env` (gitignored):

| Variable        | Default | Used by                                                 |
| --------------- | ------- | ------------------------------------------------------- |
| `PORT`          | 3000    | The API dev server (`tsx watch`)                        |
| `POSTGRES_PORT` | 5432    | Host port of the Postgres container, and `DATABASE_URL` |

`docker-compose` reads the same `.env` through variable substitution
(`"${POSTGRES_PORT:-5432}:5432"`), so changing a port is one line in `.env` and
nothing else. Never hardcode a port in code, compose files or Makefiles.

## Verifying a change

"Done" means:

1. `make check` passes (from the root).
2. You exercised the endpoint against a real running API and DB.

For step 2, `make dev`, then hit it with `curl`. Cover the failure paths too,
not just the happy one — duplicate, unauthorized, validation error, forbidden.
Registering sends a real email through Resend: to test a logged-in flow, create
a verified user directly in your local database instead. Clean up rows you
created and stop what you started, then say what you actually ran and what came
back. Don't report a change as working on the strength of reading the code.

### Tests

Node's built-in runner (`node:test` + `node:assert/strict`) through `tsx`; no
test library. Files are `tests/**/*.test.ts`. They cover sessions and passwords,
email verification and password resets, Google sign-in, admin, deleting
accounts, the error handler, rate limits, the email templates, the monitoring
and the settings schema. New code comes with its tests.

Most are **integration tests** against a real Postgres: scoping by user,
revoking sessions and the admin's counts are SQL, and faking the database would
test none of it. `make test` creates `<POSTGRES_DB>_test` in the local
container, applies the migrations and runs the suite; it never touches the
development database. The suite truncates between tests, so files run one at a
time (`--test-concurrency=1`): in parallel, each file's truncation would wipe
another's fixtures mid-run. `resetDatabase` truncates every table it finds, so a
new model needs nothing there. External services are always faked through their
ports (`FakeEmailSender`, `FakeErrorReporter`, `FakeGoogleIdentityVerifier`);
tests never hit the network.

A calculation the product promises to get right (money, scores, anything a user
checks against another source) is a pure function with **tests worked out by
hand**: the expected value is calculated outside the code and written in the
test. When one fails, the code is wrong until proven otherwise; never update an
expected value without saying why the hand calculation was wrong.

Fixtures never contain real user data, real keys or real addresses: use clearly
fake values, or anonymise a real case before it enters the repo.

## Database

Prisma 7 with the `@prisma/adapter-pg` driver adapter; config in
`prisma.config.ts`, schema in `prisma/schema.prisma`.

- Every table that holds user data has a `userId`, and every repository method
  is scoped by it. Deleting a user cascades to everything they own.
- **One migration while there are no users.** Until the product has real users,
  every schema change is folded into the single `init` migration: delete
  `prisma/migrations/*_init`, reset the database (`npx prisma migrate reset`,
  which wipes it), run `npx prisma migrate dev --name init`, and drop
  `<POSTGRES_DB>_test` so `make test` recreates it. Production, if it exists, is
  reset too before the next `make deploy`.
- **Once there are users**, that stops for good: a schema change is
  `npx prisma migrate dev --name <change>`, the generated folder is committed,
  and an applied migration is never edited. Say in `docs/ARCHITECTURE.md` when
  the switch happened.
- If the product needs fixed rows in every database (a catalogue, tiers), add a
  `prisma/seed.ts`, `migrations.seed` in `prisma.config.ts`, and the seed to the
  `migrate` service's command and to `make dev`.
- Nothing in this repo runs migrations against production automatically except
  the `deploy` target.

## Environment

`.env` is gitignored; `.env.example` lists the keys. Required: `DATABASE_URL`,
`JWT_SECRET` (`openssl rand -hex 32`), `RESEND_API_KEY`, `GOOGLE_CLIENT_ID` (the
OAuth client of the web's Google button, the same value as `GOOGLE_CLIENT_ID` in
the web's `src/constants.ts`), `POSTGRES_*`, `PORT`, `CORS_ORIGINS`,
`COMPOSE_PROJECT_NAME` and `FRONTEND_URL`, where the links in emails point (the
web's origin; not the same thing as `CORS_ORIGINS`, which may list several).
There is no sender variable: emails always go out from
`APP_NAME <noreply@APP_DOMAIN>`, the domain verified in Resend. `SENTRY_DSN` is
optional: without it nothing is reported. Deployment also uses `SERVER_SSH` (the
SSH destination, `user@host`) and `SERVER_PATH` (the repo on the server).
Backups use `COMPOSE_PROFILES` and `BACKUP_AGE_RECIPIENT`, set only on the
server, and `BACKUP_B2_KEY_ID` and `BACKUP_B2_APPLICATION_KEY`, set on the
server and on the owner's machine, to restore (see "Backups").

Read env vars only in `src/settings.ts` and
`src/infrastructure/persistence/prisma.ts`.

## Deployment

`make deploy` SSHes to `$SERVER_SSH` and, in `$SERVER_PATH` (the monorepo root),
runs `git pull`, then in `apps/api` migrates from the throwaway `migrate`
container and runs `make build`. It touches production — only run it when
explicitly asked.

The Docker build context is the **repo root**, not `apps/api`, because the image
needs `packages/shared`.

**Two images from one Dockerfile.** `api` is the runtime: production
dependencies only, no Prisma CLI. `migrate` is the `builder` stage, which has
the full toolchain; `make deploy` runs it once (`prisma migrate deploy`) and
throws it away. Keep `prisma` (the CLI) in `devDependencies`, or it lands back
in the runtime image.

**The order matters.** Migrations are applied from a throwaway container first,
and only then is the app image built and its container swapped. Recreating the
app first means it boots against the old schema; that once crash-looped
production with nothing left to run the migration from.

Two flags in the `Makefile` that look removable and aren't: `make build` uses
`--force-recreate` because compose can leave the old container running after a
rebuild, silently serving stale code. It recreates every service but `db`:
recreating Postgres on each deploy cuts the old API off mid-shutdown, and
anything it was finishing reports the lost connection to Sentry. The migrate
step in `make deploy` uses `--build` because `migrate` sits behind a profile,
which `docker compose up --build` skips, so its image would keep stale
migrations.

The API trusts **one** proxy hop (`trust proxy` in `index.ts`): in production
its port is bound to `127.0.0.1` and a reverse proxy sits in front, so
`request.ip` is the visitor's. The rate limits on the auth routes count by that
IP; if the hop count changes (a CDN in front, or no proxy), change the setting
with it, or the limit ends up counting the proxy for everyone.

Compose runs `api` and `db` on their own Docker network; the API container's
`DATABASE_URL` is overridden to reach `db` by service name, and Node runs under
`init: true` so `docker stop` delivers SIGTERM and the API shuts down cleanly
(see `shutdown` in `index.ts`).

## Backups

Every night at 03:00 UTC the `backup` service (`backup/`, a Postgres image with
`age`, `curl` and `jq`) dumps the database, encrypts the dump and uploads it to
Backblaze B2, EU region. It runs only where `.env` sets
`COMPOSE_PROFILES=backup`, which is the server; `make build` starts it with the
rest of the stack.

- **Encrypted to the owner's public key** (`BACKUP_AGE_RECIPIENT`, an `age1…`
  recipient). The private key lives only in the owner's password manager, never
  on the server or in the repo: the server can write a backup but not read one.
- **One B2 key**, `BACKUP_B2_KEY_ID` and `BACKUP_B2_APPLICATION_KEY`, a _Read
  and Write_ application key restricted to the backup bucket; the script reads
  the bucket from the key. The backups guard against a dead server, a corrupt
  database or a destructive mistake. Someone who takes the server can destroy
  them but never read them (see `ARCHITECTURE.md`). Creating the bucket, the key
  and the age key pair is in the root `README.md`.
- **Retention is the bucket's lifecycle rules**, set in the B2 console: `daily/`
  hides a file 7 days after upload and `weekly/` (Monday's backup, uploaded
  twice) after 28, both deleting it a day later. That's the "up to 30 days" the
  privacy policy promises for a deleted account; change one with the other.
- **A failed backup raises a Sentry issue.** Each night the loop checks in to
  Sentry Crons (monitor `nightly-backup`, in the API's project, through
  `SENTRY_DSN`): `in_progress` before, `ok` or `error` after. The first check-in
  creates the monitor with its schedule (03:00 UTC, 30 minutes' margin), so a
  backup that fails and one that never runs, because the service or the server
  is down, both alert. A failure also prints `backup: failed` to `make logs`,
  and the loop carries on to the next night. `make backup` doesn't check in: a
  manual run is outside the schedule.

### Restoring

`make api/restore` downloads the latest `daily/` backup (or the one named with
`FILE=daily/….dump.age` or `FILE=weekly/…`), asks for the private age key,
restores it into `<POSTGRES_DB>_restore`, never the live database, and prints
its count of users and its latest sign-up. Add the product's main tables to that
query in `backup/backup.sh`. The key is pasted from the password manager and
goes to `age` through a pipe: it's never written to a file, so restoring on the
server doesn't leave it there.

**A drill**, to prove the backups can be restored: on the owner's machine, run
`make api/restore` and check the counts against the admin panel. The local
database is left as it was; drop `<POSTGRES_DB>_restore` when done, or leave it.

**A real restore**, when production has lost its data: on the server
(`make ssh`), run `make api/restore` and check the counts. Then stop the API,
swap the databases from the `postgres` database and start again. The variables
are expanded inside the container, which has them from `.env`:

```bash
docker compose stop api
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d postgres \
  -c "ALTER DATABASE \"$POSTGRES_DB\" RENAME TO \"${POSTGRES_DB}_broken\"" \
  -c "ALTER DATABASE \"${POSTGRES_DB}_restore\" RENAME TO \"$POSTGRES_DB\""'
make build
```

Drop `<POSTGRES_DB>_broken` once the service is back. If the server itself is
gone, a new one needs the repo at `SERVER_PATH`, its `.env` and `make build`
first; then restore on it the same way.

Accounts deleted after the dump was taken come back with it, and nothing records
which they were (see "Known loose ends").

## Security

- Never commit `.env`, keys, credentials or dumps. Don't echo `.env` or a
  connection string unmasked into output.
- Password hashes and token hashes never leave the domain: return `X`, not
  `XRecord`.
- Every route that touches user data goes behind `guard` in `routes.ts`, and
  repositories scope queries by `userId`. Keep both — the guard alone is not
  isolation.
- A third-party service receives only what its call needs. Nothing that
  identifies the user unless that's the point of the call (sending an email).

## Known loose ends

- Restoring a backup brings back accounts deleted since it was taken: nothing
  records the deletions, so they can't be erased again.
- Emails are matched exactly, case included, so `Alice@x.com` registered with a
  password and `alice@x.com` from Google would be two accounts. Google sends
  addresses in lowercase, and so do almost all users; unifying case would need a
  migration of existing rows.
- The links in emails (confirming the address, resetting the password) open the
  default language's page, even for a Spanish-speaking user: the user's language
  only takes over once the link has opened a session.
