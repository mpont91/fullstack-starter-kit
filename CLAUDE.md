# CLAUDE.md — monorepo root

How this repository is organised and the rules that apply everywhere. Each app
has its own `CLAUDE.md` with its architecture and conventions; read it before
working inside that app.

## What this is

**Unagi Start** (unagistart.mpont91.com) — the owner's template for new
full-stack products, and its public demo: the template itself, deployed, where
anyone can create an account and try what every project starts with. A project
started from it rewrites this paragraph with its own product (see "Starting a
project" in the README). The product is described in `docs/`, and the blank
documents a new project starts from are in `docs/templates/`:

| Document                | What it holds                                   | Changes                   |
| ----------------------- | ----------------------------------------------- | ------------------------- |
| `docs/VISION.md`        | Problem, users, **principles**                  | Rarely                    |
| `docs/ROADMAP.md`       | Phases, their status, global constraints        | Often                     |
| `docs/specs/phase-*.md` | Requirements and acceptance criteria, per phase | Frozen once a phase ships |
| `docs/ARCHITECTURE.md`  | Technical decisions and _why_ they were made    | When a decision changes   |

**The principles in `docs/VISION.md` win.** When a spec is silent, decide by
them. When a request contradicts them, stop and ask.

## Layout

```
/
├── docs/                 product and architecture documents
├── apps/
│   ├── api/              backend — Express + Prisma, deployed to the VPS
│   ├── web/              frontend — Astro + Vue, deployed to Vercel
│   └── e2e/              end-to-end tests — Playwright, over both
└── packages/
    └── shared/           the API contract (Zod schemas) and brand
```

npm workspaces. Packages are referenced as `@app/<name>` (`@app/shared`).
Besides the contract, `packages/shared` holds only what both apps genuinely
need: `brand.ts` today. Add a module there only when the second app needs it
too.

### When a second frontend arrives

A project with two webs (a public site and an app, say) adds `apps/<name>` and
moves what both use into **`packages/ui`** (`@app/ui`), never into
`packages/shared`: that is the contract the API also installs, and it doesn't
carry Vue, CSS or images. While there is one frontend, everything stays in
`apps/web`; nothing moves "in case".

- **What moves:** the palette scales (out of `global.css`, into `theme.css`),
  the logos (`src/assets/`, and the favicon out of `public/`, served by a small
  endpoint in each app from the one copy), the base rules both stylesheets
  repeat (`base.css`: font, base rules, `loading-late`), and the primitives in
  `components/ui/` with `cn()`. A primitive that needs the app's words takes
  them as props, or stays in the app (`ConfirmDialog`). Semantic tokens
  (`background`, `surface`, `link`, `action`…) stay in each app's `global.css`,
  with its own values: the components use only those, so they look native in
  both.
- **No build step:** the package ships its sources (`.vue`, `.astro`, `.css`)
  and exports them by path (`"./components/*": "./src/components/*"`); each
  app's Vite compiles them. Apps import `@app/ui/components/Button.vue`,
  `@app/ui/theme.css`, `@app/ui/assets/logo.svg`.
- **Tailwind skips dependencies:** `base.css` says `@source './components';` so
  every app that imports it gets the package's classes.
- **Its own gate:** a `Makefile` with `check` (`vue-tsc --noEmit`) and `test`,
  run by the root `make check`; `eslint.config.mjs` gives it browser globals.
- **One end-to-end suite for both:** `apps/e2e` starts each frontend as one more
  `webServer` in `playwright.config.ts`, on its own port, and a Playwright
  project per frontend points its `baseURL` there.
- **After that, the rule holds both ways:** what only one frontend uses stays in
  that app, and moves to `packages/ui` when the second one needs it.

## Security, in this product

- A user's data is theirs. The admin panel shows accounts and counts, never what
  a user keeps in the product.
- [The product's own rules: what is sensitive here, what may never leave the
  API, what a third-party provider may receive.]

## Phases and specs

Work on the phase marked "In development" in `docs/ROADMAP.md`. Its spec is the
scope: don't build ahead into later phases. When no phase is in development,
changes are maintenance of what's shipped; anything that adds a feature starts
by writing its phase.

A bug or gap found while using the product goes into the current phase's spec,
under "Found in use", as a new criterion, before it's fixed. That keeps the spec
the full record of what the phase did.

The public site (what a guest sees) shows the product `docs/VISION.md`
describes, and changes with it in the same change. It presents the product as
it's meant to be: no "coming soon", nothing from the roadmap.

## The API contract lives in one place

`packages/shared` holds the Zod schemas for everything that crosses HTTP:
request bodies, query params and response payloads, plus their inferred types.
Both apps import from it. Besides the contract it holds only the modules listed
under "Layout" above.

- **Change a shape in `packages/shared`, and both apps must compile and pass
  their checks in the same change.** The typechecker finds every caller; fix
  them all before calling it done.
- Shapes describe **the wire**, i.e. JSON: dates are ISO strings
  (`isoDateSchema`), never `z.date()`; money and quantities are decimal strings,
  never `z.number()`. The API keeps `Date`s in its internal records and its
  mappers serialise them on the way out.
- `packages/shared` depends on Zod and nothing else. No runtime code beyond
  schemas, tiny pure helpers that operate on them, and the modules under
  "Layout".
- Internal shapes (persisted records, port payloads, settings, domain types that
  never leave the API) stay inside the app that owns them. Don't promote
  something to `shared` "in case the frontend needs it".

## The name is a constant

The product name lives in one place, so changing it stays cheap.
`packages/shared/src/brand.ts` exports `APP_NAME`, `APP_DOMAIN`, `APP_SLUG` and
`STORAGE_PREFIX`; code everywhere imports them and never hardcodes the name. The
one exception is the Docker Compose project name (`COMPOSE_PROJECT_NAME` in
`apps/api/.env`), which names the containers and the database volume: it doesn't
follow a rename, because changing it would leave the data behind. Package names
use the neutral `@app/` scope on purpose, so a rename never touches imports.
Renaming = edit `brand.ts`, `CORS_ORIGINS` and the env URLs, and grep `docs/`
and the `CLAUDE.md` files. Changing `STORAGE_PREFIX` logs every user out once;
that's acceptable on a rename.

## Commands

**Everything runs through `make`, from the root.** Each app's `Makefile` holds
its own targets; the root runs any of them with a prefix — `make api/<target>`,
`make web/<target>`, `make shared/<target>` — so there's no need to `cd`.

| Command        | What it does                                                                               |
| -------------- | ------------------------------------------------------------------------------------------ |
| `make install` | `npm ci` for all workspaces, build `packages/shared`, Prisma codegen, Playwright's browser |
| `make dev`     | API (with its DB) and web together; Ctrl+C stops both                                      |
| `make check`   | **The gate:** prettier + eslint over the repo, then each workspace's typecheck and tests   |
| `make test`    | Each workspace's tests                                                                     |
| `make e2e`     | The end-to-end suite: the real API and the built web, in a browser (see `apps/e2e`)        |
| `make format`  | Autofix: prettier + eslint over the repo                                                   |
| `make deploy`  | Deploy the API to the VPS (the web deploys on push, via Vercel)                            |

After changing `packages/shared`, `make shared/build`; `make dev` and the web
build do it for you. See each app's `CLAUDE.md` for its targets.

Makefiles stay simple: the commands used day to day, named so they read on their
own, with no sections and no wordy comments.

**`package.json` scripts exist only when something other than `make` calls
them:** `build` in `apps/web` (Vercel runs it) and `build` in `packages/shared`
(the web build and the API Docker image run it). Everything else is a `make`
target; don't add npm scripts that duplicate one.

Prettier and ESLint run once, from the root, over the whole repo: one
`.prettierrc.mjs`, one `eslint.config.mjs` (with per-folder sections). Each
workspace's `check` is only its typecheck. Tests are the opposite: each
workspace has its own `test` target, because each needs its own setup (the API's
integration tests need a database), and the root runs them all. Every workspace
uses the same runner, Node's `node:test` through `tsx`, with files in
`tests/**/*.test.ts`, except `apps/e2e`, which uses Playwright's (see
`docs/ARCHITECTURE.md`). New code comes with its tests.

**Every journey a user takes has an end-to-end test** in `apps/e2e`: signing in,
each page's main flow, each form. A change that adds or alters one adds or
updates its test, and `make e2e` passes before it's committed. It runs outside
`make check` only because it needs a database, a browser and about a minute.

Lines stay within 80 characters (`.editorconfig`). Prettier enforces it for code
and Markdown; elsewhere (Makefiles, Dockerfile, Compose) wrap by hand. Tables
and URLs are the only exceptions.

Tooling every workspace uses (TypeScript, ESLint and its plugins, Prettier,
`tsx`) is declared in the root `package.json`; what a workspace needs at
runtime, and tooling only one workspace uses, stays in that workspace.

**Dependencies are kept on their latest stable release, and updating them has
priority.** When asked to update, or when a dependency is touched anyway,
everything moves to its latest stable version, majors included: what a new major
breaks is read in its changelog and fixed in the same change, never left for
later out of caution.

- **Stable only.** Pre-releases (`alpha`, `beta`, `rc`, `canary`, `next`,
  `-preview`) are never adopted, even when npm's `latest` tag points to one; the
  dependency stays on its newest stable version until a stable one ships. The
  same goes for AI models: a stable model, not a preview.
- **Held back only when something blocks it**, such as another dependency's peer
  range or engines, and the hold is written here with what lifts it. Today:
  TypeScript stays on 6 until `typescript-eslint` and `@astrojs/check` support
  7; Prisma stays on 7 while 8 is only a release candidate.
- **Node is the current LTS** (26), in `engines`, `.nvmrc` and the Dockerfile
  (`engine-strict` refuses another), and `@types/node` follows its major. When a
  new LTS lands, moving to it is part of the next update.

npm blocks dependencies' install scripts unless they are listed in
`allowScripts` in the root `package.json` (Prisma's engines and esbuild today);
a new dependency that needs one is added there by name, after looking at what it
runs. Advisories in transitive dependencies are fixed with `npm audit fix`,
never `--force`. `npm audit` reports one it can't fix: `minimatch` inside ESLint
and `typescript-eslint`, dev tools that never ship; the offered "fix" is a
downgrade to ESLint 9, so it's left until they ship one.

`.env` files are created by hand from each app's `.env.example`, once per
machine.

## Commits & PRs

Short, imperative, capitalized subjects: "Reset passwords by email", "Delete
accounts", "Refactor structure". No conventional-commit prefixes. One change per
commit.

Commits and PRs are the owner's: no `Co-Authored-By` trailer, no "Generated
with" line, no mention of the assistant anywhere in them.

A PR states: what changed, which apps and packages it touches, which spec
criteria it checks off, how to reproduce (commands + expected output), any
migration notes, and — for a contract change — which app deploys first (see
`apps/web/CLAUDE.md`, "The contract").

When a change completes an acceptance criterion, tick its box in the phase spec
in the same PR. When a phase is done, update its status in `docs/ROADMAP.md`.

**Don't commit or push unless asked.**

## Ports and local config

Every app runs on its standard port by default (API 3000, Postgres 5432, web
4321). Any of them can be changed per machine in that app's `.env`, which is
gitignored. Ports are never hardcoded anywhere else. If you move the web's port,
the API's `CORS_ORIGINS` and `FRONTEND_URL` move with it.

## Security, everywhere

- Never commit `.env`, keys, credentials or database dumps. Don't echo a `.env`
  or a connection string unmasked into output.
- A user's data is theirs: every query that touches it is scoped by `userId`.
- Only what a given call to a third-party service needs goes to it. Never an
  email, a name or a credential it doesn't need.

## The template this started from

This repository started from
[`mpont91/unagistart`](https://github.com/mpont91/unagistart), the owner's
template for new projects. What isn't about this product (the tooling, auth,
email, monitoring, deploy, backups, the conventions in the `CLAUDE.md` files) is
shared with it and with the owner's other projects.

- When a change here improves one of those generic parts (a bug in the auth
  flow, a better deploy step, a new convention), say so at the end of the task,
  so the owner can carry it back to the template.
- When the template has improved a generic part, this project may take it. To
  compare, read the template:
  - Normally it's cloned as a sibling of this repository, in the same parent
    folder (`../unagistart`). When it is, bring it up to date first
    (`git -C ../unagistart pull --ff-only`) and read it there.
  - When it isn't, read it from GitHub, where it's public:
    `gh api repos/mpont91/unagistart/contents/<path>` for a file, or
    `gh repo clone mpont91/unagistart` into a temporary directory.

## Aligned with the docs

The owner and the assistant work from the same documents, so nothing the owner
has decided depends on the assistant remembering it. The vision and the roadmap
are short and loaded with this file, every session:

- @docs/VISION.md
- @docs/ROADMAP.md

How the rest is kept in step:

- **Read before answering.** Before answering about the product or starting a
  change, read what applies: the current phase's spec and the part of
  `docs/ARCHITECTURE.md` it touches. When a request contradicts them, say so
  before acting.
- **Point out what isn't written.** When the owner says something the docs don't
  hold (a decision, a preference, a plan), say so and offer where it goes: "this
  isn't in the docs; add it to X?".
- **Every decision ends written.** When a task closes, say which document now
  holds what was decided, or ask whether to write it down.
- **The owner's words for them**, often in Spanish: "los docs" is `docs/`; "la
  visión", "el roadmap", "la spec" (the current phase's) and "la arquitectura"
  are its files; "las reglas" are the `CLAUDE.md` files; "apúntalo" means write
  what was just decided where it belongs, in the same change.

## Knowledge lives in the repo

The documents above are the project's only memory. Work on it may come from
another machine or a cloud session, where nothing exists but the repository, so
whatever should outlive a conversation is written into them, in the same change:

- What the product is and where it's going: `docs/VISION.md`, `docs/ROADMAP.md`
  or the phase spec.
- A technical decision and its reason: `docs/ARCHITECTURE.md`.
- How the owner wants the work done: the `CLAUDE.md` it applies to; this one
  when it's generic, and then it's a change for the template too.

Never only in the assistant's own memory. When the owner says "remember this",
it goes here.

## Working style

- **Think first.** State assumptions; if two readings of a request differ
  materially, ask instead of picking silently.
- **Simplest thing that works.** No speculative abstraction, no configurability
  nobody asked for, no error handling for impossible states.
- **Don't reinvent the wheel.** When a library, the framework or the platform
  already solves the problem, and it's what most people use for it, use it
  rather than a hand-made solution.
- **Surgical changes.** Match surrounding style even if you'd write it
  differently. Don't refactor adjacent code that isn't broken. Remove orphans
  _your_ change created; mention pre-existing dead code rather than deleting it.
- **Verify, don't assume.** "Done" means the relevant `make check` passed, and
  `make e2e` too when it touches what a user sees, and the change was exercised
  for real. Report what you actually ran and what came back.
