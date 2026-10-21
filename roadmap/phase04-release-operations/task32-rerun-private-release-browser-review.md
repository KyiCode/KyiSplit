# Task 32 — Rerun the Private Release Browser Review

- Story points: 3
- Area: Integration
- Status: In progress
- Dependencies: Tasks 22–31

## Goal

Close the review's browser, visual, and accessibility evidence gaps before resuming release operations.

## Acceptance Criteria

- Run the complete isolated Chromium journey, including signup/invite continuation, cross-group denial, multi-payer FX expense, detail breakdown, repayment, and explicit deletion.
- Cover failed-refresh recovery, local-date defaults, stale balance notices, ordered activity, and keyboard confirmations; keep controlled negative runs distinct from the final passing suite.
- Check supported desktop and narrow mobile layouts, zoom, long names/amounts, focus visibility, announcements, contrast, empty/loading/error/offline states, and clipboard failure.
- Record sanitized outcomes and unresolved blockers. If browser control is unavailable, do not claim manual visual/assistive-technology checks passed.
- Verify no demo credentials, local profile files, application-database targets, or browser secrets enter the release artifact. Resume Task 07 only after these acceptance criteria pass.

## TDD Sequence

Add meaningful failing E2E coverage for new behavior before any corrective implementation; run existing checks, resolve task-scoped regressions, then repeat the critical journey.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

```powershell
npm.cmd --prefix frontend run test:e2e
```

Full Phase 04 verification matrix, explicit disposable schema gate, repeated isolated browser runs, and recorded manual desktop/mobile/keyboard review. Backend and frontend changes cannot be usefully separated for this verification gate.

## Review Record — 2026-10-21

- The isolated Chromium suite passed twice after the final E2E changes. It covers signup and invite continuation, cross-group denial, the multi-payer FX journey, expense detail, repayment and confirmed deletion, stale-balance retry, local-date defaults, ordered activity, keyboard confirmations, clipboard denial, and a narrow viewport with long names and amounts.
- Backend tests passed (279 tests across 28 files); frontend tests passed (88 tests across 16 files); backend build, frontend lint, and frontend build passed.
- The explicit disposable schema gate passed against a cloned local PostgreSQL template. The release artifact audit found no local profiles, browser state, demo credentials, or application database target.
- A TDD regression exposed and fixed rejection of large decimal money values caused by floating-point tolerance. Browser journey fixes also wait for the asynchronous sign-in route change and follow the app's automatic navigation after group creation.
- Negative runs used during diagnosis and the parser regression were separate from the final passing E2E runs.
- Manual visual review remains unresolved: the computer-control inventory returned no browsers, and opening Chrome was unavailable. Desktop/zoom/contrast review and screen-reader review have not been performed and are not claimed as passed. Keep Task 32 active and do not resume Task 07 until those checks can be completed or the release criteria are otherwise resolved.
