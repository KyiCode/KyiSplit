# Task 22 — Validate Local and Production Database Profiles

- Story points: 2
- Area: Backend
- Status: Done
- Dependencies: Existing profile changes in the working tree

## Goal

Make local PostgreSQL and hosted Supabase selection explicit, reproducible, and isolated.

## Acceptance Criteria

- Review and finish the existing uncommitted profile changes without replacing unrelated edits; do not mark them done based only on the previous review.
- Local requires a loopback PostgreSQL URL and cannot fall back to hosted configuration; prod requires the hosted URL or documented DATABASE_URL alias and cannot fall back to local.
- Verify profile-file precedence, runtime overrides, development and compiled entry points, child-process failures, and shutdown handling without logging secrets.
- Keep DB_PROFILE independent of NODE_ENV and retain explicit isolated-E2E database configuration. Tests never inherit an application database implicitly.
- Document manual creation/start/stop of a new empty local PostgreSQL database and synthetic data setup. Application startup never creates, resets, or migrates schema; production secrets and local data remain ignored.

## TDD Sequence

Add failing profile/launcher regressions for missing or conflicting settings and process failures; complete the smallest implementation, then refactor.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

Backend tests and build; local readiness and explicit-profile smoke checks. Test prod selection with controlled settings; live Supabase verification belongs to Task 08.

## Completion

- Backend tests passed: 249 tests across 27 files; backend build passed.
- Local development and compiled launch paths both reached readiness on an isolated review database.
- Profile selection, URL isolation, environment precedence, child exit propagation, and shutdown forwarding are covered by tests.
- Live Supabase verification remains assigned to Task 08.
