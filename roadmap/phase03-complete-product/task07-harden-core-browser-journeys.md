# Task 07 — Harden the Core Browser Journeys

- Story points: 3
- Area: Frontend
- Status: Complete
- Dependencies: Task 06

## Goal

Finish the existing auth, reusable-invite, group-currency, and expense-entry
journeys so recoverable failures never discard the user's work.

## Acceptance Criteria

- Signup, login, logout, protected-route restoration, and global `401`
  navigation are covered by behavior tests.
- Invite continuation survives authentication, distinguishes missing and
  expired links, and supports reuse by distinct accounts.
- Group creation requires and displays the selected default currency while
  preserving names and currency after rejection.
- Expense entry defaults to the group currency, still permits a supported
  source currency, and preserves details, payments, and splits after failure.
- Currency loading has a deterministic fallback/retry path and no silent SGD
  inference.
- Duplicate submission is prevented throughout.

## TDD Sequence

1. Add failing journey-level component tests around the current flows.
2. Fix the smallest state-loss, defaulting, or recovery defects.
3. Consolidate shared pending and retry behavior without hiding coded errors.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
