# Task 26 — Use the Local Calendar Date for New Expenses

- Story points: 1
- Area: Frontend
- Status: Done
- Dependencies: Task 25

## Goal

Default an expense to the user's current local date when opening a new expense form.

## Acceptance Criteria

- Calculate the default date when the form mounts using local calendar components, not UTC toISOString or a module-level constant.
- Respect the user's explicitly selected date and retain existing API calendar-date serialization.
- Cover Singapore before 08:00, a timezone behind UTC, and reopening the form after local midnight.
- Keep existing date-only display and deterministic backend money behavior unchanged.

## TDD Sequence

Write failing timezone and remount regressions, replace only the default-date calculation, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Frontend tests, lint, build; use controlled clocks/timezones so tests do not depend on wall-clock time.
