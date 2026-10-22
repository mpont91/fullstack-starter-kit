# Roadmap

> Living document. Update the status of each phase as work progresses. Detailed
> requirements live in `docs/specs/`, one file per phase.

## Phases

| #   | Phase  | Status              | Spec                                     |
| --- | ------ | ------------------- | ---------------------------------------- |
| 1   | [Name] | 🟡 Spec in progress | [phase-1-name.md](specs/phase-1-name.md) |
| 2   | [Name] | ⚪ Not started      | —                                        |

Status values: ⚪ Not started · 🟡 Spec in progress · 🔵 In development · 🟢
Done

A phase only moves to "In development" once its spec has no blocking open
questions. A phase is "Done" when every acceptance criterion in its spec is
checked.

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
- [The product's own constraints.]

Technical details are decided in `ARCHITECTURE.md`.

## Out of scope for now

- [What has been asked for or considered, and deliberately left out.]
