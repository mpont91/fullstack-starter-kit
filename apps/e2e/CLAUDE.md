# CLAUDE.md — apps/e2e

The end-to-end suite: the app as a user meets it, in a browser. Every project
has one, and every journey a user takes through the product has its test here.
Why and how it's built are in `docs/ARCHITECTURE.md`, "End-to-end tests".

## Commands

From the root: `make e2e` runs it all; `make e2e/test ARGS=…` passes arguments
to Playwright (`ARGS="home"`, `ARGS="--project desktop"`,
`ARGS="--repeat-each 3"`); `make e2e/report` opens the last run's report, with a
trace of each failure. `make e2e/check` is the typecheck, part of the root
`make check`.

Playwright starts what it needs and stops it after: the API from
`apps/api/tests/e2e/server.ts` (`make api/e2e-server`, which also creates and
migrates `<POSTGRES_DB>_e2e`) and the web, built and previewed, pointed at it.
Their ports are 3001 and 4322, so the suite runs alongside `make dev`;
`E2E_API_PORT` and `E2E_WEB_PORT` move them.

The browser is Playwright's own Chromium, installed by `make install`. A machine
that lacks its system libraries needs `npx playwright install-deps chromium`
once (it needs sudo).

## Writing a test

- Files are `tests/**/*.test.ts`, one per area, in the default language. Import
  `test` and `expect` from `./fixtures`, not from Playwright.
- Every test has an account of its own (`account`), from the e2e API, and the
  page opens signed in as it. `test.use({ signedIn: false })` for a guest. What
  an account starts with (the product's own data) is set up in
  `apps/api/tests/e2e/server.ts`, with fixed figures, so a test asserts the
  exact value the user reads.
- Find elements as a user does: by role and visible name (`getByRole`,
  `getByLabel`), scoped to the list item or section they're in. No CSS classes,
  no test ids.
- Before typing into a form right after the page opens, `await hydrated(page)`:
  Vue drops what's typed before it takes the page over.
- Tests run in parallel, on a desktop and on a phone. Skip one on a project only
  when the page is really different there, and say why.
- Signing in with Google: `googleAs(page, email)`, from `./fixtures`, replaces
  Google's script in the browser. Its button, "Sign in with Google", signs in as
  the address the test picks, which the e2e API takes as a verified Google
  account.
- Nothing reaches the network: the fixture aborts any request that isn't to
  localhost, and the e2e API fakes every outside service. A new outside service
  gets its fake there as well as in the integration tests.
