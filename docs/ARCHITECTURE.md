# Architecture

> Decision log. Each decision states what was chosen and why. The _how_ lives in
> each app's `CLAUDE.md`. When a decision changes, edit its entry and add the
> date and reason; don't delete the old reasoning.

The decisions below came with the starter kit: they were made, and proven in
production, in the owner's earlier projects. The product's own decisions are
added after them, in the same format.

## Repository

**Monorepo with npm workspaces** (`apps/api`, `apps/web`, `packages/shared`). An
earlier project kept frontend and backend in separate repos, which forced the
API contract to be declared twice by hand: a change on one side broke the other
at runtime, as a thrown "Unexpected response shape from API", instead of at
compile time. One repo lets a single change update both sides and lets the
typechecker catch mismatches. More apps (an admin, a worker, a second frontend)
go in `apps/` and share the same contract.

**npm, not pnpm or yarn.** Consistent across projects (`npm ci`). No monorepo
build tool (Turborepo, Nx) until build times justify one.

**`make` is the only entry point.** Every command, from the root, with a prefix
per workspace (`make api/test`). The commands a project needs are discoverable
in one place, the same in every project, and what runs in CI is what runs
locally.

**One formatter and one linter, from the root.** Prettier and ESLint run once
over the whole repo with one config each; each workspace's own check is only its
typecheck. Lines stay within 80 characters.

**Tests run on Node's own runner** (`node:test` through `tsx`) in every
workspace. No test framework to learn, configure or keep up to date, and the
same runner everywhere.

## Contract

**`packages/shared` holds Zod schemas for every request and response.** Both
apps import them. Wire types only: ISO strings for dates, decimal strings for
amounts. Internal types stay inside the app that owns them.

**The product's name is a constant** (`brand.ts`), and the package scope is the
neutral `@app/`. Names are often provisional at first; renaming stays a one-file
change plus the environment.

**Contract changes are deploy-safe.** Web and API deploy independently, so for a
few minutes after a deploy they can be on different versions: new fields are
optional first, and removals take two deploys.

## Backend (`apps/api`)

**Express 5 + Prisma 7 (PostgreSQL, `@prisma/adapter-pg`) + Zod, TypeScript ESM,
Node 24.** A small, well-known stack with no framework magic: the whole request
path fits in one's head.

**Hexagonal architecture** (domain / application / infrastructure). Every
outside system (the email provider, an identity provider, any API the product
reads from) sits behind a port, so replacing one never touches business logic,
and tests fake the expensive or external ones. The dependency rule is checked by
a grep.

**One use case per action, built in one container.** `execute` is the only
public method, dependencies arrive through the constructor, and `di.ts` is the
only place anything is built. Simple to follow, simple to fake.

**Errors are mapped to HTTP in one place.** Controllers throw domain errors and
never build a response for one; `error-handler.ts` maps them. Anything it
doesn't know is a 500, reported to Sentry.

**Configuration is validated at boot.** `process.env` is read in one file and
parsed with a schema, so a missing secret stops the boot instead of failing on
the first request that needs it.

**Integration tests against a real Postgres.** Scoping by user, revoking
sessions and counting are SQL; faking the database would test none of it. Each
run uses its own `_test` database, truncated between tests.

## Accounts and auth

**Email + password (bcrypt) with stateless JWTs**, carrying a `jti`. Logout
revokes that one token (`RevokedToken`, forgotten once the token would have
expired anyway); changing or resetting the password ends every other session at
once (`sessionsValidFrom`) and hands back a fresh token for the current one.

**Open sign-up, with a confirmed email.** Registering doesn't log in: the
welcome email carries a link that confirms the address, and only that link opens
the first session. Without it, anyone could open an account in someone else's
name and the product could never email its users with confidence. Only a SHA-256
hash of the link's token is stored (it's random, so a fast hash is enough and
allows an indexed lookup), it expires in 24 hours, and resending replaces it.
Password reset works the same way, with a one-hour link.

**Endpoints that send an email on request answer the same whether the account
exists or not.** Otherwise they'd tell anyone which addresses have an account.

**Login and sign-up are rate limited per IP**, in memory: 10 failed logins per
15 minutes (successful ones don't count; Google sign-in has its own count), 5
sign-ups per hour. It's what most apps do against password guessing and bulk
account creation, and needs no infrastructure while there is one API process.
Per-account lockout was left out: it lets anyone lock a known user out by typing
wrong passwords for them.

**So are the routes that send an email on request** (the confirmation link
again, a password reset): 5 per hour per IP, every request counted. Each sends
an email to whatever address it's given, so without a limit anyone could flood
an inbox and spend the sending quota.

**Sign in with Google, as a second way into the same account.** The web shows
Google Identity Services' own button, which hands it an ID token; the API
verifies it itself (signature, expiry, issuer, audience) with
`google-auth-library`, behind the `GoogleIdentityVerifier` port. No redirect
flow and no client secret: the ID token is all the API needs, and the client id
isn't secret. From Google the API keeps only the email and the account id
(`googleId`), never the name or picture. One call logs in, links or registers:
an existing account with the same email is opened and linked, never duplicated,
and only when Google reports the address as verified. Linking an account whose
email was never confirmed drops its password and ends its sessions, because
whoever chose that password never proved the address was theirs. An account
created with Google has no password until it sets one through the
forgotten-password email; deleting it is confirmed by signing in with Google
again.

**Deleting an account is the user's own button**, confirmed with the password
(or Google), and cascades to everything they own. Nobody has to write to ask.

**Admin is a role on `User`, not a separate account.** Admins reuse the whole
session machinery. The app never sets a role: it's granted with
`make api/grant-admin`, so nobody can promote themselves, and `/admin/*` reads
the role from the database on every request, so revoking takes effect at once.
Admins see accounts and counts, never what a user keeps. Every admin action is
recorded with ids only, so a deleted user's email doesn't survive in the trail.

**Product metrics are counts computed on read**, in the admin panel. No events
table, no analytics service: at a small product's volume a few aggregate queries
answer the questions, and nothing is kept that could later identify anyone.

## Email

**Resend for transactional email**, behind the `EmailSender` port. It sends from
`noreply@APP_DOMAIN`, so the domain in use must be verified in Resend; a rename
means verifying the new one. One branded layout for every message (tables and
inline styles, which is what email clients render), each message in both
languages, in the one the user chose. The logo is a PNG: Gmail and Outlook don't
render SVG.

**A welcome email that fails doesn't fail the sign-up.** The account exists
either way, and the login page can send the link again; the failure is reported.

## Frontend (`apps/web`)

**Astro (static output) + Vue 3 islands + Tailwind 4.** Static HTML with
interactivity only where it's needed keeps the app fast and free to host on
Vercel.

**The frontend owns no business logic.** Every rule and every calculation lives
in the API; the web renders what it returns and formats it for display.

**English at bare paths, Spanish under `/es`, from the URL.** Every page is
written once and built once per language. A stored language preference would
render one language into the static HTML and switch to the other on mount — a
hydration mismatch. A logged-in user's saved language wins, by redirecting
before paint.

**The session lives in `localStorage`** and a client-side guard stamps the page
before paint, because the pages are static. The guard is UX; the API enforces
access.

**Design tokens, dark-first.** Colours are named tokens in one `@theme` block;
components never use raw colours, so a product's look is a palette change.

**Vercel Analytics**, aggregated and cookie-free, so there's no cookie banner.

**Logic out of components, so it can be tested.** Anything with logic is a `.ts`
helper with `node:test` tests; components only wire it to the template and are
checked in the browser. A component test runner would mean a second test
framework (Vitest or similar) for little gain while components stay thin.

## Monitoring

**Free tiers only: Sentry (EU region) for errors, and an uptime monitor.** The
API and the web each have their own Sentry project. Every 500, every failure a
background loop or a use case catches and swallows, and uncaught errors in the
browser reach the owner, instead of a log line on a server nobody reads. Sentry
sits behind the `ErrorReporter` port, so tests fake it, and without a DSN it
does nothing.

**Nothing reported says who the user is or what they keep**, only their id.
Events lose their breadcrumbs, request headers, body and query, and every user
field but the id; Prisma's errors are minimal so a failed write doesn't print
its arguments.

**A process that dies can't report itself, so it's watched around.** Running out
of memory aborts the API without running any handler: nothing reaches Sentry,
the request in flight never becomes a 500, and the web doesn't report server
errors, trusting the API to. So the heap is watched while the process lives
(`HeapWatchdog`), and a run that ended without shutting down is reported by the
next one (`RunMarker`). It happened in production in an earlier project.

## Hosting and deploy

**API and database on a self-managed VPS with Docker Compose; frontend on
Vercel.** The cheapest setup that keeps the data on infrastructure the owner
controls. The API listens on `127.0.0.1` behind a reverse proxy, and trusts
exactly one proxy hop so rate limits count visitors, not the proxy.

**Two images from one Dockerfile.** The runtime image has production
dependencies only; the `builder` stage, with the Prisma CLI, is also the
throwaway `migrate` container.

**Migrations run before the app container is swapped**, from that throwaway
container. Recreating the app first once took production down in an earlier
project: the new code booted against the old schema, crash-looped, and the
`docker exec` the migration relied on had nothing to attach to.

**Every deploy recreates the app but never the database.** Compose can leave the
old container serving stale code after a rebuild, hence `--force-recreate`; and
recreating Postgres on each deploy cut the old API off mid-shutdown.

**One migration while there are no users.** A new product changes its schema
constantly at first; folding every change into `init` keeps the history readable
and costs nothing while there's no data to keep. It ends the day there are
users, and that day is recorded here.

## Backups

**Backups cost nothing and the server can't read them.** A nightly `pg_dump`,
encrypted with `age` to a key only the owner holds, goes to Backblaze B2's free
tier in the EU, kept 7 days daily and 4 weeks weekly. A small product's database
is a few megabytes, so the hosting provider's paid backups would buy nothing a
free bucket doesn't. B2 over Cloudflare R2: its free tier needs no card, and the
region is chosen when the account is made.

**One Read and Write key, on the server and the owner's machine.** A write-only
key never stopped a stolen server from wiping the backups (`writeFiles` can hide
a file, and the lifecycle rules delete a hidden file a day later), and restoring
needs to read, on the server too. So a real restore and a drill are the same
command (`make api/restore`), with the private key pasted, never stored. What
the backups guard against is a dead server, a corrupt database or a destructive
mistake; a stolen server can destroy them, but never read them. Retention is the
bucket's lifecycle rules, not the script's. Object Lock is left off: it would
also block the deletions that keep a deleted account's data from living longer
than the privacy policy says, and once on it can't be turned off.

**A failed backup alerts through Sentry Crons**: a nightly check-in also catches
the backup that never runs, which an error report can't. Sentry's free plan has
one cron monitor per organisation: a second project on the same organisation
either pays, uses another organisation, or falls back to reporting a failed
backup as an issue (which misses a backup that never runs).

## Patterns

Decisions the owner's projects have already made for problems a product often
meets. They aren't built in, because not every product needs them; when one
does, follow the pattern and record here that it's in use.

**Background work: the row is the job.** Work too slow for a request (calling a
slow or rate-limited API, processing a batch) moves through a `status` on the
record it's about (`QUEUED` → `RUNNING` → `DONE`/`FAILED`, with `queuedAt` for
ordering), and a worker inside the API process claims one at a time. No separate
job table: a second source of truth for the same state was tried, and it
disagreed with the first. The claim query serves the user served least recently
(a `lastServedAt` stamped in the same statement that claims), so one user's
batch can't stall another's single item; ranking each user's remaining queue
instead collapses into FIFO. Every boot requeues what was left `RUNNING`, since
a deploy recreates the container mid-job; boot chores are wrapped so a failure
is reported and the API serves anyway. On SIGTERM the worker lets the job in
flight finish. A watchdog reports a queue that has stopped moving. A record in
flight can't be deleted. The web polls while anything on screen is in flight.
Syncs from outside sources are idempotent: each imported item carries the
source's own id, unique per source.

**Money and quantities: never `number`.** `decimal.js` everywhere in the domain,
Prisma `Decimal` columns with explicit precision (`Decimal(20, 8)` for money,
`Decimal(38, 18)` for quantities, prices and rates), decimal strings on the
wire. Every amount carries its currency; converting uses the rate of the
transaction's date. The API never rounds what it was given and keeps every digit
while it calculates; rounding is the frontend's display choice, through
`Intl.NumberFormat` on the decimal string, never `parseFloat`. Typed amounts
take a comma as the decimal mark and never guess thousands separators.

**Calculations a product promises to get right are pure functions with
hand-worked tests.** Inputs in, result out, no I/O, no clock; use cases load the
data through ports and pass it in. Each test's expected value is calculated by
hand and written in the fixture; a failing test means the code is wrong until
proven otherwise.

**User secrets encrypted at rest.** Keys or credentials a user gives the product
are encrypted with AES-256-GCM, key from the environment
(`openssl rand -hex 32`), so a database dump alone reveals nothing. They never
reach the frontend after submit, not even masked in full; the form clears them
once the request resolves, and they never go in storage, URLs, logs or
analytics. The key can't be rotated by changing it (a migration re-encrypts),
and it's backed up outside the server: a restore needs it.

**Connections to a user's accounts elsewhere are read-only.** The product asks
for the narrowest permission that works and refuses a credential that grants
more.

**Charts: Chart.js**, with only the chart types used registered. Canvas needs
numbers to place points; everything the user reads (tooltips, legends) is still
formatted from the API's decimal strings. Chart colours are tokens in a fixed
order, validated for colour blindness, and an entity keeps its colour in every
chart.

## Pending decisions

None yet.
