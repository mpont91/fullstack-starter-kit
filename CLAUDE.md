# CLAUDE.md — monorepo root

How this repository is organised and the rules that apply everywhere. Each app
has its own `CLAUDE.md` with its architecture and conventions; read it before
working inside that app.

## What this is

**[Product]** ([domain]) — [one sentence on what it does and for whom]. Started
from the `fullstack-starter-kit` template: accounts, email, two languages,
monitoring, backups and deployment came with it. The product is described in
`docs/`:

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
│   └── web/              frontend — Astro + Vue, deployed to Vercel
└── packages/
    └── shared/           the API contract (Zod schemas) and brand
```

npm workspaces. Packages are referenced as `@app/<name>` (`@app/shared`).
Besides the contract, `packages/shared` holds only what both apps genuinely
need: `brand.ts` today. Add a module there only when the second app needs it
too.

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

| Command        | What it does                                                                             |
| -------------- | ---------------------------------------------------------------------------------------- |
| `make install` | `npm ci` for all workspaces, build `packages/shared`, Prisma codegen                     |
| `make dev`     | API (with its DB) and web together; Ctrl+C stops both                                    |
| `make check`   | **The gate:** prettier + eslint over the repo, then each workspace's typecheck and tests |
| `make test`    | Each workspace's tests                                                                   |
| `make format`  | Autofix: prettier + eslint over the repo                                                 |
| `make deploy`  | Deploy the API to the VPS (the web deploys on push, via Vercel)                          |

After changing `packages/shared`, `make shared/build`; `make dev` and the web
build do it for you. See each app's `CLAUDE.md` for its targets.

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
`tests/**/*.test.ts`. New code comes with its tests.

Lines stay within 80 characters (`.editorconfig`). Prettier enforces it for code
and Markdown; elsewhere (Makefiles, Dockerfile, Compose) wrap by hand. Tables
and URLs are the only exceptions.

Tooling every workspace uses (TypeScript, ESLint and its plugins, Prettier,
`tsx`) is declared in the root `package.json`; what a workspace needs at
runtime, and tooling only one workspace uses, stays in that workspace.

Dependencies are updated by hand, to the latest. Two are held back on purpose:
TypeScript stays on 6 until `typescript-eslint` and `@astrojs/check` support 7,
and `@types/node` follows the Node major we run (24, the current LTS; `.nvmrc`
says which, and `engine-strict` refuses another). npm blocks dependencies'
install scripts unless they are listed in `allowScripts` in the root
`package.json` (Prisma's engines and esbuild today); a new dependency that needs
one is added there by name, after looking at what it runs. `npm audit` reports
advisories in the Prisma CLI's own dependencies (`mysql2`, `deepmerge-ts`); the
CLI is a dev tool kept out of the runtime image, and the offered "fix" is a
downgrade, so they're left until Prisma ships one.

`.env` files are created by hand from each app's `.env.example`, once per
machine.

## Commits & PRs

Short, imperative, capitalized subjects: "Reset passwords by email", "Delete
accounts", "Refactor structure". No conventional-commit prefixes. One change per
commit.

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
[`mpont91/fullstack-starter-kit`](https://github.com/mpont91/fullstack-starter-kit),
the owner's template for new projects. What isn't about this product (the
tooling, auth, email, monitoring, deploy, backups, the conventions in the
`CLAUDE.md` files) is shared with it and with the owner's other projects.

- When a change here improves one of those generic parts (a bug in the auth
  flow, a better deploy step, a new convention), say so at the end of the task,
  so the owner can carry it back to the template.
- When the template has improved a generic part, this project may take it. To
  compare, read the template:
  - Normally it's cloned as a sibling of this repository, in the same parent
    folder (`../fullstack-starter-kit`). When it is, bring it up to date first
    (`git -C ../fullstack-starter-kit pull --ff-only`) and read it there.
  - When it isn't, read it from GitHub, where it's public:
    `gh api repos/mpont91/fullstack-starter-kit/contents/<path>` for a file, or
    `gh repo clone mpont91/fullstack-starter-kit` into a temporary directory.

## Working style

- **Think first.** State assumptions; if two readings of a request differ
  materially, ask instead of picking silently.
- **Simplest thing that works.** No speculative abstraction, no configurability
  nobody asked for, no error handling for impossible states.
- **Surgical changes.** Match surrounding style even if you'd write it
  differently. Don't refactor adjacent code that isn't broken. Remove orphans
  _your_ change created; mention pre-existing dead code rather than deleting it.
- **Verify, don't assume.** "Done" means the relevant `make check` passed and
  the change was exercised for real. Report what you actually ran and what came
  back.
