# Task 01 — Establish Frontend Behavior Tests

- Story points: 5
- Area: Frontend
- Status: Complete
- Dependencies: Phase 02

## Goal

Add the deterministic React unit/component test foundation required to build
the remaining browser experience with behavior-first coverage.

## Acceptance Criteria

- Vitest, jsdom, React Testing Library, user-event, and jest-dom are configured
  with a checked-in setup file and a non-watch `npm test` command.
- Tests use the real shared API client boundary with deterministic fetch
  fakes; they do not duplicate backend response models.
- Router and authenticated-page test helpers support navigation and protected
  routes without contacting the application database.
- Existing auth, invitation continuation, group creation with currency, and
  expense validation receive representative behavior tests.
- Tests prove form values survive recoverable rejection, global `401`
  navigation remains intact, and accessible names are used for primary
  controls.
- Test isolation resets globals, storage, timers, and fetch mocks.
- Frontend lint and production build remain green.

## TDD Sequence

1. Add a failing smoke test and the smallest deterministic test runtime.
2. Add shared render/fetch helpers, then cover existing critical behavior.
3. Refactor components only where testability exposes an actual behavior or
   accessibility defect.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
