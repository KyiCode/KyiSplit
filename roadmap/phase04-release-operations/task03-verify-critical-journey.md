# Task 03 — Verify the Critical Private-Group Journey

- Story points: 5
- Area: Integration
- Status: Complete
- Dependencies: Task 02

## Goal

Protect the complete release journey and its highest-risk authorization and
recovery cases with end-to-end browser tests.

## Acceptance Criteria

- The critical test creates accounts, logs in/out, creates a non-SGD group,
  reuses a one-hour invite for distinct accounts, and adds a multi-payer,
  custom-split cross-currency expense with deterministic FX.
- Members see exact group-currency balances and settlement suggestions, record
  a repayment, and see history and balances update.
- Authorized expense and repayment deletion are confirmed and reflected across
  activity, history, and balances.
- Separate tests cover expired invitation, cross-group denial, unauthenticated
  restoration, provider failure without partial expense, and retry after a
  transient browser/API failure.
- Critical tests pass in repeated and shuffled execution without relying on
  order left by another test.
- The full Phase 04 verification matrix and sanitized browser regression are
  recorded before the phase is marked complete.

## TDD Sequence

1. Add the failing happy-path critical journey.
2. Add the smallest high-risk failure-path scenarios.
3. Remove flaky timing and ordering assumptions, then repeat the suite.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run test:e2e
```

## Verification Result

Verified on 2026-08-04:

- `npm.cmd --prefix backend test` passed (22 files, 178 tests).
- `npm.cmd --prefix frontend test` passed (15 files, 60 tests).
- Frontend lint and production build passed.
- `npm.cmd --prefix frontend run test:e2e` passed in the normal and deliberately
  shuffled failure-scenario order (9 tests each).
- `npm.cmd --prefix frontend run test:e2e -- --repeat-each=2` passed (16 tests).
- Cleanup left no listeners on the four E2E ports, disposable database run
  directories, or run-state file.

The sanitized browser regression covered three distinct accounts, logout and
invite continuation, reuse of one invite, a non-SGD group, deterministic
cross-currency balances, settlement suggestions, repayment history, confirmed
expense and repayment deletion, expired-invite handling, cross-group denial,
unauthenticated-route restoration, provider rollback, and transient-request
retry. No credentials, cookies, invitation tokens, or database configuration
values are recorded here.
