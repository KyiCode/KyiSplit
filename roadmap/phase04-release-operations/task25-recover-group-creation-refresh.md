# Task 25 — Recover After Group Creation Refresh Failure

- Story points: 2
- Area: Frontend
- Status: Done
- Dependencies: Task 24

## Goal

Keep confirmed group creation successful when its subsequent list refresh fails.

## Acceptance Criteria

- Separate createGroup success from refreshGroups failure and preserve the returned group ID.
- After confirmed creation, either navigate to the new group or show a created state with a refresh-only retry; do not invite another create request.
- Disable concurrent submission and distinguish a rejected create from a saved create with stale list data.
- Cover create success followed by refresh failure, refresh recovery, genuine create rejection, and navigation to the saved group.
- Do not claim to solve response-loss duplicates; schema-backed idempotency remains deferred.

## TDD Sequence

Write the failing saved-create/failed-refresh browser-component regression, implement the smallest state separation, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Frontend tests, lint, build; verify the retry produces no second create request.
