# KyiSplit Agent Guide

## Agent
- Do not assume, do not hallucinate. Clarify
- Behaviour changes done TDD.

## Workflow

- Follow [`roadmap/README.md`](roadmap/README.md) toward the private-friends
  release, working through phases in order unless the user changes priority.
- Before work, read [`roadmap/CURRENT_PHASE.md`](roadmap/CURRENT_PHASE.md),
  its matching `roadmap/phaseXX-*.md`, and
  [`roadmap/acceptance-checklist.md`](roadmap/acceptance-checklist.md) before
  implementing.
- Preserve unrelated working-tree changes. Keep changes and commits scoped to
  one coherent roadmap task.
- Update the phase pointer and roadmap status together, and only after the
  phase exit criteria and relevant acceptance checks pass.
- Within each phase, update completed task with (done) at the front.

## Project Invariants

- Never commit secrets.
- Treat [`roadmap/schema-reference.sql`](roadmap/schema-reference.sql) as context
  only; make database changes through versioned migrations, never undocumented
  production-only Supabase dashboard edits.
- Preserve custom Express authentication unless the roadmap is explicitly
  revised. Do not introduce Supabase Auth or direct browser-to-database access.
- Keep the frontend and API compatible with a same-origin production
  deployment.
- Use strict TypeScript and avoid `any` in new production code.
- Validate all input at the API boundary and enforce critical invariants again
  in PostgreSQL.
- Represent money in API payloads as decimal strings. Do not use direct
  floating-point equality for monetary validation.
- Use a checked-out PostgreSQL client for multi-statement transactions and
  always roll back and release it on failure.
- Require group membership on every group-scoped read or mutation.
- Return the shared API envelope documented in
  [`roadmap/phase02-data-api-foundation.md`](roadmap/phase02-data-api-foundation.md).
- Add or update tests with every behavioral change.

## Verification

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
could not run and the exact blocker.
