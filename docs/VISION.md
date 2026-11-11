# Vision

> Stable document. Changes only when the product direction changes, not when a
> phase ends.

## What it is

Unagi Start is the owner's template for new full-stack products, and its public
demo. Everything a product needs before its first feature (accounts, email in
two languages, an admin panel, monitoring, backups, deployment) is already
built, tested and running in production, so a new project starts on its first
feature instead of on the groundwork.

The demo at `unagistart.mpont91.com` is the template itself, deployed: anyone
can create an account and see what every project starts with.

## The user journey

**1. Discover.** A developer lands on the site and sees what the template
includes, how it's built, and where the code is.

**2. Try it.** They sign up with their email or with Google, confirm the
address, log in, change their language or their password, and delete the account
when they're done: the flows every project inherits, working for real.

**3. Start a project.** On GitHub, **Use this template**, then the README's
"Starting a project" turns it into theirs: a name, a vision, a palette, and the
accounts a product needs.

**4. Keep it alive.** When a project improves the generic part (a fix in the
auth flow, a better deploy step, a new convention), the improvement comes back
here, so the next project starts from the better version.

## Who it is for

**Initial user:** the owner. Every new project starts here, and the demo proves
that what it ships still works in production.

**Target user:** developers who want a TypeScript full-stack starting point with
the decisions already made and written down, and who'd rather adapt one than
assemble one.

## Problems it solves

1. **Every product rebuilds the same groundwork.** Sign-up, email confirmation,
   password resets, sessions, an admin, error reporting, backups and a deploy
   take weeks before the first feature, and they're the same weeks every time.
2. **A template nobody runs rots.** Without a deployment of its own, nothing
   proves that its deploy, its emails or its backups still work until a new
   project finds out.
3. **Decisions get explained again and again.** Without them written down, each
   new project, and each assistant working on it, asks the same questions and
   gets slightly different answers.

## Principles

These principles override any design or implementation decision:

1. **Only what every product needs.** The template holds the groundwork every
   product shares. What only some products need (background jobs, money, charts)
   is written under "Patterns" in `docs/ARCHITECTURE.md`, not built.
2. **The demo is the template.** Nothing is built for the demo alone: what a
   visitor sees is what a new project starts with, so starting one never means
   removing it first. A project rewrites the copy, the docs and the brand, and
   keeps the rest.
3. **Proven in production.** What the template ships runs in the demo, with real
   email, real sign-ins, real backups and real alerts. A change to the generic
   part isn't done until it runs there.
4. **A user's data is theirs.** Nobody else sees it, admins included. Third
   parties receive only what a feature needs. Deleting an account deletes
   everything in it.
5. **Bilingual by design.** Every screen and email exists in English and
   Spanish.
6. **Written down.** Every decision is in `docs/` and the `CLAUDE.md` files with
   its reason, so a new project inherits the reasoning as well as the code.

## What it is not

- Not a framework or a library: projects copy it and diverge, they don't install
  it or follow its updates automatically.
- Not a product with features of its own beyond accounts and their
  administration.
- Not a SaaS boilerplate: there are no payments, subscriptions or teams.

## How we will know it works

- New projects start from it and reach their first feature without rebuilding
  the groundwork.
- The demo stays up, its nightly backups succeed and its alerts stay quiet.
- Visitors who sign up confirm their address and log in: the admin panel's
  sign-up metrics show it.
