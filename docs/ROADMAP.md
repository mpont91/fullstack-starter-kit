# Roadmap

> Living document. Update the status of each phase as work progresses. Detailed
> requirements live in `docs/specs/`, one file per phase.

## Phases

| #   | Phase              | Status            | Spec                                     |
| --- | ------------------ | ----------------- | ---------------------------------------- |
| 1   | Demo in production | 🔵 In development | [phase-1-demo.md](specs/phase-1-demo.md) |

Status values: ⚪ Not started · 🟡 Spec in progress · 🔵 In development · 🟢
Done

A phase only moves to "In development" once its spec has no blocking open
questions. A phase is "Done" when every acceptance criterion in its spec is
checked.

The template was built and used by the owner's projects before this roadmap
existed. Phase 1 starts from it as it is: it turns the template into a product
of its own, running in production.

## Global constraints

These apply to every phase:

- **Monorepo** with two deployable apps and a shared package:
  - `apps/web`: responsive web frontend (desktop and mobile browsers), deployed
    on Vercel.
  - `apps/api`: TypeScript / Node backend, deployed on a self-managed VPS.
  - `packages/shared`: the API contract, shared by both apps.
- **Two languages:** every user-facing string and email exists in English and
  Spanish.
- **Multi-user and private:** every record belongs to a user and every query is
  scoped by it. Admins manage accounts, never their contents.
- **Generic only:** nothing is built for the demo alone (see "The demo is the
  template" in `VISION.md`).
- **Tested in a browser:** every journey a user takes has an end-to-end test,
  written with Playwright in `apps/e2e`, on a desktop and on a phone. A phase
  isn't done until `make e2e` passes with its journeys in it.

Technical details are decided in `ARCHITECTURE.md`.

## Out of scope for now

- Payments, subscriptions and teams.
- Features of the demo's own beyond accounts and their administration.
- Languages other than English and Spanish.
