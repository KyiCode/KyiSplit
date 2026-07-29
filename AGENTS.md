# KyiSplit Agent Guide

## Mission

Move KyiSplit toward the private-friends release described in
[`roadmap/README.md`](roadmap/README.md). Work through the numbered roadmap
phases in order unless the user explicitly changes the priority.

## Working Rules

- Treat the existing working tree as user-owned. Preserve unrelated changes and
  never discard or rewrite them to make a task easier.
- Read the relevant phase file and
  [`roadmap/acceptance-checklist.md`](roadmap/acceptance-checklist.md) before
  implementing roadmap work.
- Update roadmap status only after the phase exit criteria have actually passed.
- Keep commits and changes scoped to one coherent roadmap task.
- Never commit `.env` files, database URLs, JWT secrets, passwords, cookies,
  invite tokens, or production data. Add placeholders only to `.env.example`
  files.
- Treat [`roadmap/schema-reference.sql`](roadmap/schema-reference.sql) as context
  only. It is not an executable migration or the migration source of truth.
- Make database changes through versioned migrations. Do not make undocumented
  production-only edits in the Supabase dashboard.
- Preserve custom Express authentication unless the roadmap is explicitly
  revised. Do not introduce Supabase Auth or direct browser-to-database access.
- Keep the frontend and API compatible with a same-origin production
  deployment.

## Engineering Conventions

- Use strict TypeScript and avoid `any` in new production code.
- Validate all input at the API boundary and enforce critical invariants again
  in PostgreSQL.
- Represent money in API payloads as decimal strings. Do not use direct
  floating-point equality for monetary validation.
- Use a checked-out PostgreSQL client for multi-statement transactions and
  always roll back and release it on failure.
- Require group membership on every group-scoped read or mutation.
- Return the shared API envelope documented in
  [`roadmap/02-data-api-foundation.md`](roadmap/02-data-api-foundation.md).
- Never log secrets or complete authentication/invite tokens.
- Add or update tests with every behavioral change.

## Required Verification

Run the checks relevant to the touched subsystem before reporting completion:

```powershell
cd backend
npm.cmd test
```

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

When database or end-to-end infrastructure exists, also run the migration
validation and end-to-end commands documented by that phase. Report checks that
could not run and the exact blocker; do not silently mark them complete.

## Roadmap Status

The authoritative phase order and status live in
[`roadmap/README.md`](roadmap/README.md). A phase is complete only when its exit
criteria and the relevant release acceptance checks pass.
