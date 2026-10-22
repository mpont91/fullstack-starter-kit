# CLAUDE.md — apps/web

Architecture, code conventions, commands and dev loop for the frontend. Rules in
the root `CLAUDE.md` also apply.

## What this is

Frontend for **[Product]**: [what the user does here]. The landing, log in and
sign-up (email or Google), the profile, the admin panel and the legal pages come
from the starter kit. Astro 7 (static output) + Vue 3 islands + Tailwind 4,
TypeScript, Node 24.

This app owns **no data and no business logic** — it renders what the API
returns. Anything that looks like a rule or a calculation (limits, totals,
permissions, which records can be deleted) belongs in `apps/api`, not here. What
the web computes is display only (formatting, ordering, a label derived from a
value), in `src/helpers/`, with tests. If a screen needs a figure the API
doesn't return, add it to the API.

The app is useless without the API running: every page beyond the landing,
contact and legal pages reads from it.

## Commands

From the repo root, prefix with `web/` (`make web/check`).

| Command      | What it does                                                  |
| ------------ | ------------------------------------------------------------- |
| `make dev`   | Astro dev server on `WEB_PORT` (default **4321**)             |
| `make check` | build (the typecheck); the full gate is the root `make check` |
| `make test`  | Run the tests (`node:test` through `tsx`)                     |

The only npm script is `build` (`packages/shared` → `vue-tsc --noEmit` →
`astro check` → `astro build`), because Vercel runs it. It _is_ the typechecker,
and `make check` runs it first for that reason; building `packages/shared` first
means a stale contract can't slip through.

## Running against the backend

1. From the repo root, `make dev` starts both: the API on its `PORT` (default
   3000, with its DB) and this app on `WEB_PORT` (default 4321).
2. `PUBLIC_API_URL` points at the API (default `http://localhost:3000/`).

The API's `CORS_ORIGINS` must include this app's origin, and its `FRONTEND_URL`
is where email links land (both `http://localhost:4321` in its `.env.example`).
If you change `WEB_PORT`, change them too.

## Environment

`.env` is gitignored; `.env.example` lists the keys with their defaults:
`PUBLIC_API_URL`, `PUBLIC_SENTRY_DSN` (optional; without it nothing is reported)
and `WEB_PORT`. `PUBLIC_API_URL` is `PUBLIC_`-prefixed, so **it is inlined into
the client bundle** — never put a secret in this app's env, and never commit
`.env`. `WEB_PORT` is read in `astro.config.mjs` (through Vite's `loadEnv`) to
set the dev server port; never hardcode a port.

A `.env` may list the production URL and then the localhost one; the last
assignment wins, so the trailing line is the active override.

Two values that aren't secret live in `src/constants.ts` instead:
`CONTACT_EMAIL` (empty switches the contact links off) and `GOOGLE_CLIENT_ID`.

## Architecture: static shell, interactive islands

Astro renders everything to static HTML at build time. Vue only runs where
interactivity is genuinely needed.

```
src/pages/[...lang]/   route + <Layout> + island mounting   (no logic)
src/layouts/           Layout.astro: head, Navbar, AuthGuard, Footer
src/components/*.vue   the interactive islands
src/components/<area>/ an area's islands, once it has several
src/components/ui/     presentational primitives (Button, Card, Badge, …)
src/services/          the ONLY place that talks to the API
src/i18n/              every user-facing string
src/legal/             privacy policy + terms, one Markdown file per language
src/helpers/           pure formatting/derivation helpers (display only)
src/monitoring/        Sentry: init, the Vue error hook, what an event keeps
src/constants.ts       contact email, Google's client id
```

There is no `src/types/`: the API contract comes from `@app/shared`. See "The
contract" below.

**`.astro` vs `.vue`:** if it needs state, events or fetching, it's a `.vue`
island. If it's static markup, keep it `.astro` — it ships zero JS. Navbar and
Footer are deliberately `.astro`.

**Client directives.** `client:load` is the default. Use `client:only="vue"`
when the component reads `localStorage` on setup and would otherwise mismatch
during the static build (every authenticated island does). Don't reach for
`client:visible`/`idle` without a reason.

**The public site and the app are two areas of one site.** Pages that need a
session live under `src/pages/[...lang]/app/` and are served under `/app`;
`/app` itself is the dashboard, where a session lands (`APP_HOME` in
`helpers/app-path-helper.ts`). The admin area stands apart, at `/admin`, and
needs a session too. Everything else (landing, contact, legal, login) is public.
`Layout.astro` tells them apart from the URL with `needsSession`, so a page
can't get it wrong.

**The navigation follows the session, not the page.** A guest sees the public
links (home, contact) and "Log in"; a user sees the app's (dashboard, admin for
an `ADMIN`) and their profile, on every page, public ones included, so moving
around never reshuffles the navbar. Both sets are in the static HTML, tagged
`data-auth="out"` / `data-auth="in"`, and the class `AuthGuard` stamps on
`<html>` hides the other one. The user's set has no link to the landing, and the
logo takes them to `/app`: their home is the app.

**Pages hold no logic.** A page imports a layout, sets the title, mounts one
island:

```astro
<Layout title={`${t('nav.dashboard')} · ${APP_NAME}`}>
  <AppHome client:only="vue" lang={lang} />
</Layout>
```

`AppHome.vue`, where a session lands, is a placeholder kept as the pattern every
island follows; replace its content with the product's first screen.

**A page about one record takes its id from the query string**
(`/app/item?id=…`): the output is static, so there is no route per id. The
island reads it on mount, and the language switch carries the query across.

## The contract

Request and response schemas come from `@app/shared`. This app never redeclares
them.

- **All API access goes through `src/services/`.** Components never call `fetch`
  or `apiRequest` directly — they import a named function from a service. One
  service per resource (`auth`, `admin`, …), and `apiRequest` is called from
  nowhere else. (The Navbar's language switch is the one exception: a
  fire-and-forget `fetch` with `keepalive`, so it survives the page navigating
  away.)
- **Every response is validated with Zod.** `apiRequest(path, schema, options)`
  unwraps the API's `{ data }` envelope and parses it against the shared schema,
  throwing `ApiError('Unexpected response shape from API')` on a mismatch. Never
  bypass the schema or cast a response.
- Types come from `@app/shared` too (`User`, `AdminUserPage`…), imported with
  `import type`. Constraints the user should hear about before a round trip come
  from there as well (`PASSWORD_MIN_LENGTH`).

**The two apps deploy separately**, so for a few minutes after a deploy the web
on Vercel and the API on the VPS can be on different versions. Contract changes
must survive that window:

- New response fields are added with `.optional()` or `.default(...)` in
  `@app/shared`, and the API is deployed before the web.
- Removing or renaming a field takes two deploys: stop using it in the web
  first, then remove it from the API.
- Say in the PR which deploy goes first.

## Conventions

**Error handling distinguishes _whose fault it is_.** A 4xx means the user's
input was rejected; a 5xx or a network failure is our problem, and the message
must say so. Follow the pattern in `LoginForm.vue` / `RegisterForm.vue`:

```ts
const rejected = e instanceof ApiError && e.status >= 400 && e.status < 500
error.value = rejected ? t('login.error') : t('login.serverError')
```

Where a specific status has a precise meaning, name it: 409 = email taken, 403
on login = email not confirmed yet, 429 = too many attempts.

**No hardcoded user-facing strings.** Everything goes through
`useTranslations()`, keyed `area.thing` (`login.title`,
`register.error.emailTaken`). Locales are `en.ts` and `es.ts`, both typed as
`Record<TranslationKey, string>` against the English keys — a missing or
misspelled Spanish key fails the build rather than silently falling back.
Interpolate with `t('key', { name: value })`. A string that varies with a count
carries both forms separated by `|`, picked by the `count` param:
`'Delete this item?|Delete {count} items?'`.

**The app name is never hardcoded.** Use `APP_NAME` from `@app/shared` in code
and `{appName}` interpolation in translations. The contact address is built from
`APP_DOMAIN`.

**Styling is Tailwind + design tokens.** Colors come from the `@theme` block in
`src/styles/global.css` — `primary-*`, `accent-*`,
`success/warning/danger/info`, plus semantic `background`, `surface`,
`surface-raised`, `border`, `muted`, `foreground`, `halo` for the glow behind
the top of every page and `tile` behind an icon. Use the tokens, never raw hex
or stock Tailwind palettes (`bg-green-500` is wrong; `bg-primary-600` is right).
The UI is dark-first. A product's look is a new palette in those tokens (and the
same colours in the API's `email-layout.ts`), not new classes.

**Reuse `src/components/ui/` primitives.** `Button`, `Card`, `Badge`,
`ConfirmDialog`, `Skeleton`, `EmptyState`. They merge classes via `cn()` (clsx +
tailwind-merge), so passing `class` from the outside overrides cleanly — extend
a primitive rather than hand-rolling a styled `<button>`.

**Loading and empty states.** Anything that loads shows `Skeleton`s shaped like
the content it waits for (same rows, same sizes), never a "Loading…" line or a
blank space; a busy label on a button is for actions, not loads. A view with no
data shows `EmptyState`: a large icon, a short title, a hint of what to do and,
when there is one, the action as a button; `compact` inside a section of a page.

**Vue style.** `<script setup lang="ts">` always. `ref` for state, `computed`
for derivation, `onMounted` for the initial fetch. Load state is the explicit
`isLoading` / `loadError` pair — see `AppHome.vue`. Props via
`defineProps<Props>()` with an `interface Props` and destructured defaults.

**Style.** Prettier: no semicolons, single quotes, `prettier-plugin-astro`.
Named exports from `.ts` modules. Unlike the backend, this app consistently uses
`import type { … }` for type-only imports — keep doing that. Filenames:
`PascalCase.vue` for components, `kebab-case.ts` for everything else,
`*.service.ts` for services, `*-helper.ts` for helpers.

**Comments explain _why_.** See the 4xx-vs-5xx reasoning in `LoginForm.vue`.
Don't narrate code that reads plainly.

## Work that runs in the background

When the API queues something instead of doing it in the request (see "Patterns"
in `docs/ARCHITECTURE.md`), the island that shows it polls itself every few
seconds while any record on screen is in flight, and stops as soon as none are.
Reloads during polling pass `load(true)` so the list doesn't flash its loading
state. A failed record shows why in plain language.

## Two languages, one page written once

English lives at the bare paths and Spanish under `/es`. Every page is written
once in `src/pages/[...lang]/` and built twice — `getLanguagePaths` (in
`helpers/locale-helper.ts`) supplies `lang: undefined` for the default locale
and the prefix for every other one, so adding a language to `languages` in
`i18n/index.ts` adds its routes.

- **The language comes from the URL, never from storage.** `Layout.astro` reads
  it with `languageFromPath` and hands it to Navbar, Footer and AuthGuard. A
  stored preference would render English into the static HTML and switch to
  Spanish on mount — a hydration mismatch.
- **A logged-in user's saved language wins.** `LocaleGuard.astro` sends them to
  their language's version of the page before paint. The user's language
  (`UserLanguage`, `EN`/`ES`, from the API) and the site's locale (`Language`,
  `en`/`es`) are different types; `locale-helper.ts` is the one place they meet.
- **Islands are given their language as a prop.** A page passes `lang={lang}`,
  the island root calls `provideLanguage(lang)`, and every component below it
  imports `useTranslations` from `i18n/vue`, which injects. The root must pass
  its own language explicitly (`useTranslations(lang)`): Vue's `inject` only
  reaches ancestors, so a component can't read what it just provided.
- **Every internal link is localized** with `localizePath` — `useLocalizePath()`
  inside islands, `path()` in `.astro`. That includes the inline redirects in
  `AuthGuard.astro` and the 401 bounce in `api-client.ts`, which reads the
  language off `location.pathname` because it only ever runs in the browser.
- **Dates and numbers take the page's language too**, not the browser's:
  `Intl.DateTimeFormat(lang, …)`, not `undefined`.

## Auth & session

Stateless JWT, kept in `localStorage` under `${STORAGE_PREFIX}.token` /
`${STORAGE_PREFIX}.user` (`STORAGE_PREFIX` from `@app/shared`). Changing the
prefix logs every user out once; that's acceptable on a rename.

- `src/services/session.ts` is the only module touching `localStorage` for auth.
  Inline scripts in `.astro` files can't import it; they get `STORAGE_PREFIX`
  through `define:vars`. Don't copy the token into other storage, URLs or logs.
- `AuthGuard.astro` runs an inline script in `<head>` before paint: it stamps
  `is-authed` / `is-guest` (and `is-admin`) on `<html>` and redirects guests
  away from every page under `/app` and `/admin`, and sends a session away from
  pages marked `guestOnly` (the landing, login and register) to `/app`. Pass
  `guestOnly` on `<Layout>` for a public page that has nothing to offer someone
  already logged in.
- A 401 on an authenticated request makes `api-client.ts` clear the session and
  bounce to `/login?redirect=…`. Don't duplicate that logic in components.
- Registering doesn't log in: it shows "check your inbox", and the link in the
  welcome email (`/verify-email`) opens the session.
- Signing in with Google does: `GoogleButton.vue` loads Google Identity Services
  on demand and renders Google's own button, and the ID token it hands back goes
  untouched to `signInWithGoogle`, which logs in, links or registers. The client
  id is `GOOGLE_CLIENT_ID` in `constants.ts` (not secret, so not an env var);
  `localhost:4321` is among its authorised origins. One button per page: the GIS
  callback is global.
- An account without a password (`user.hasPassword === false`) sets one through
  the forgotten-password email, from the profile, and confirms deleting itself
  with Google instead of a password.

Because the guard is client-side, it is UX, not security. The API enforces
access; never rely on a hidden page or a disabled button to protect data. The
admin link only shows for `ADMIN`; `/admin/*` is checked by the API.

## Verifying a change

"Done" means:

1. `make check` passes.
2. You loaded the affected page in a browser against a running API and exercised
   the real flow — including the failure paths (invalid input, 401, 403, API
   down), not just the happy one — in both languages when it shows text.

Say what you actually ran and what you saw. Don't report UI as working on the
strength of a green build: a passing `astro build` proves the types line up, not
that the page behaves.

### Tests

Node's `node:test` through `tsx`, like the rest of the repo. `tests/` covers
`src/helpers/` and `src/monitoring/scrub-event.ts`: everything with logic lives
in a `.ts` module so it can be tested without a browser, and a component only
wires it to the template. A value the user reads and could get wrong (a
formatted amount, a derived label) always has a test. Components themselves have
no automated tests; they're verified in the browser.

## Monitoring

Uncaught errors go to Sentry (the web's own project, EU region). `Layout.astro`
starts it on every page; `monitoring/vue-app.ts` is the `appEntrypoint` of every
island, because Vue catches errors inside components and only logs them, so the
window never sees them. Errors a component handles itself (an `ApiError` shown
to the user) aren't reported: a 5xx is already reported by the API.

`scrubEvent` keeps the error, the page URL without query or fragment (the email
links carry their token there) and at most a user id; breadcrumbs, headers and
everything else about the user go. Never put a user's data, an email or a token
in an error message.

## Build & deploy

`astro build` emits static output to `dist/`. Vercel Analytics is wired in via
`@vercel/analytics/astro` in `Layout.astro`; never send a user's data or email
in analytics events.

The Vercel project uses `apps/web` as its root directory and installs from the
repo root so the `@app/shared` workspace resolves. Deployment is configured in
Vercel, not in this repo, so there is no deploy command here to run.

## Known loose ends

- Components have no automated tests.
- The legal pages (`src/legal/`) are templates with `[brackets]` to fill in and
  a review to get before opening to real users.
