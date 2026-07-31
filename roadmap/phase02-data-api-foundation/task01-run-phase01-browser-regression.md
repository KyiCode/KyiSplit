# Task 01 — Run the Phase 01 Browser Regression

- Story points: 2
- Area: Integration
- Status: Done
- Dependencies: Phase 01 complete

## Goal

Verify the stabilized Phase 01 browser and API behavior in a real local
frontend/backend session before migrations or shared-contract work changes its
baseline.

## Acceptance Criteria

- The regression runs before Task 02 or any Phase 02 contract or schema change.
- The frontend and backend run from the Phase 01 source state against a
  non-production database. Test records use clearly disposable accounts and
  groups; no real credentials or private group data are used.
- Signup, normalized login, protected-route continuation, missing-session
  redirect, logout, and post-logout rejection behave as documented.
- Group creation succeeds atomically and preserves the creator's display name.
- An anonymous invite visit continues after login or signup, and one unexpired
  invitation admits at least two distinct accounts without being consumed.
- Unknown, controlled-expired, and already-joined invitation cases show their
  distinct recovery states. Expiry is created with a controlled non-production
  fixture or clock; the check does not wait one hour.
- Direct navigation by a non-member proves denial for group details, members,
  expenses, invite creation, and balance data without rendering protected
  content.
- Expense validation preserves entered form values, prevents duplicate
  submission, and rejects a cent mismatch; a valid multi-payer expense is
  created once and appears in the group.
- A simulated API/network interruption produces a recoverable state, and retry
  succeeds without a full browser refresh.
- The result records the tested source revision, environment class, browser,
  date, pass/fail result for each case, and disposable-data cleanup. It does not
  record passwords, cookies, JWTs, live invite tokens, or database URLs.
- Any failure blocks Task 02. Repair work is split into a new scoped task and
  verified before this task is marked done.

## Verification Procedure

1. Run the backend and frontend locally with their normal development commands.
2. Complete the acceptance matrix using browser-visible behavior and the
   browser network inspector where status verification is required.
3. Confirm the database contains no partial group or expense from a deliberately
   failed operation.
4. Remove or clearly identify all disposable records according to the
   non-production environment's cleanup policy.
5. Record the sanitized matrix result in the task's implementation handoff.

The repository checks remain required before marking the task done:

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

## Verification Result

- The developer reported the interactive browser regression passed and directed
  Phase 02 implementation to continue.
- Backend verification passed 110 tests across 14 files.
- Frontend lint and production build passed.
- Codex did not independently control the browser in this session; the browser
  result above is developer-supplied.
