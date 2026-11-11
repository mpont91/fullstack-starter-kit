# Phase 1 — Demo in production

> Status: 🔵 In development.

**Goal:** Unagi Start runs in production at `unagistart.mpont91.com` as its own
demo. A guest sees what the template is, what it includes and where its code is,
and can try every account flow for real; a new project still finds the blank
skeletons it starts from.

## 1.1 The skeletons kept apart

The template's own docs now describe Unagi Start, so the blank ones a new
project fills in need a place of their own.

- [x] The blank `VISION.md`, `ROADMAP.md` and phase spec live in
      `docs/templates/`, and the README's "Starting a project" points there.

## 1.2 The public site presents Unagi Start

- [x] The landing says, in English and Spanish, what Unagi Start is, who it's
      for and what it includes (accounts, email in two languages, the admin
      panel, monitoring, backups, deployment), and links to the repository on
      GitHub.
- [x] After logging in, the first screen says what the account can do here (the
      profile, its language, its password, deleting it) and links to the
      repository, instead of "This is where the product's first screen goes".
- [x] Nothing a guest or a user sees shows a placeholder: no `[brackets]`, no
      `REPLACE_ME`, no text addressed to whoever starts a project.
- [x] An end-to-end test opens the landing on a desktop and on a phone and finds
      the presentation and the link to the repository.

## 1.3 Legal pages and contact

The demo stores real people's emails, so its policies have to be real.

- [x] The privacy policy and the terms, in English and Spanish, are filled in
      for Unagi Start: Marc Pont as the controller, `mpont91@gmail.com` as the
      contact, what the demo stores (the account and nothing else), and the
      providers it uses. The comment at the top still tells a new project what
      to change.
- [x] The contact page points to `mpont91@gmail.com`.

## 1.4 The docs describe Unagi Start

- [x] The three `CLAUDE.md` files open with Unagi Start's description, and the
      README says what's live where.
- [x] The README's "Make it yours" checklist covers what a new project now
      changes that it didn't before: the docs from `docs/templates/`, the legal
      pages' controller and contact, and `CONTACT_EMAIL`.

## 1.5 Running in production

These need the owner's accounts; the README's "Accounts the product needs" and
"The server" list the steps.

- [ ] `unagistart.mpont91.com` serves the web from Vercel, and
      `api.unagistart.mpont91.com` the API from the VPS, behind the reverse
      proxy with TLS, each with its DNS record.
- [ ] Emails go out from `noreply@unagistart.mpont91.com`, its domain verified
      in Resend, and arrive in both languages.
- [ ] Google sign-in works with the production OAuth client.
- [ ] Errors in the API and the web reach their Sentry projects.
- [ ] The nightly backup reaches B2, and one restore drill has been done.
- [ ] UptimeRobot watches the web and the API's `/uptime`.
- [ ] The reverse proxy in use, and how it's configured, is recorded in the
      README's "The server", replacing the note that it's still to be recorded.
- [ ] The README lists the services the demo uses, each with its console, what
      it's for and where its key goes.

## 1.x Found in use

Bugs and gaps found while using the product, added as criteria before they're
fixed, so this spec stays the full record of what the phase did.

- [x] The navigation bar fits one line on a phone: with a product name as long
      as "Unagi Start", the name and "Log in" broke onto two lines at 390 px,
      and at 360 px the name ran into the language menu. Below 390 px only the
      logo shows, and the name stays as the link's text for screen readers.
- [x] The footer's links wrap on a phone. With four links they fit, but they
      stayed on one line, so a project that added more (Unagi Poker has seven)
      pushed the page wider than the screen.

## Out of scope

- Any feature beyond accounts and their administration (see "What it is not" in
  `VISION.md`).
- Payments, subscriptions and teams.
- A domain of its own: the demo lives on a subdomain of the owner's.

## Decisions

- **The demo is the template itself, deployed** (2026-11-11). Nothing is built
  for the demo alone, so a new project never has to remove it. The template
  keeps its repository, renamed `unagistart`.
- **Blank skeletons in `docs/templates/`** (2026-11-11). The template's `docs/`
  describe Unagi Start; a new project copies the skeletons over them.
- **Sign-up is open to anyone** (2026-11-11): the demo exists to show the whole
  account flow, from confirming the email to deleting the account.
- **The contact address is the owner's own** (2026-11-11), `mpont91@gmail.com`,
  instead of `support@` the demo's domain, which has no mailbox.
- **The landing speaks to developers** (2026-11-11), since anyone can start a
  project from the public repository.
