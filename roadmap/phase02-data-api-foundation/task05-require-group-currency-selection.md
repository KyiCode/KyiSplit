# Task 05 — Require Group Currency Selection

- Story points: 3
- Area: Shared
- Status: Done
- Dependencies: Task 04

## Goal

Cut the existing group-creation browser flow and backend over together so every
new group explicitly chooses and returns its authoritative default currency.

## Acceptance Criteria

- The shared create-group request requires `defaultCurrency`; the success,
  group-detail, and group-list contracts return the normalized stored currency.
- The backend accepts only a normalized three-uppercase-letter currency and
  rejects missing or invalid input with the shared validation code before
  opening a transaction.
- Group creation inserts the group currency and creator membership in the same
  checked-out transaction established in Phase 01.
- The temporary database default from Task 04 is removed, so direct inserts and
  future API regressions cannot create a group without an explicit currency.
- The current create-group form requires a currency choice, keeps its values on
  rejection, and sends the shared request shape. It may reuse the existing
  picker; richer currency discovery and presentation remain Phase 03 work.
- Refreshing the group list and entering the created group use the returned
  default currency without a follow-up inference or hard-coded SGD value.
- Backend tests fail first for missing, malformed, normalized, commit, and
  rollback cases. Frontend lint and build prove that current consumers match
  the shared contract.
- Empty and representative-legacy migration tests cover removal and restoration
  of the temporary database default.
- No balance or repayment browser interface is added.

## TDD Sequence

1. Add failing backend tests for the required request and transaction value,
   plus a migration test proving omitted database currency is rejected.
2. Add the smallest backend, shared-contract, and browser-form changes that cut
   over without leaving an intermediate API mismatch.
3. Refactor the existing picker integration and group response mapping while
   preserving form recovery behavior.

## Verification

```powershell
npm.cmd --prefix backend test
```

With an isolated `TEST_DATABASE_URL`:

```powershell
npm.cmd --prefix backend run test:db
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

## Verification Result

- Backend verification passes 132 tests across 19 files.
- Database verification passes 8 integration tests, including temporary-default
  restoration on rollback and rejection of omitted currency after reapply.
- Frontend lint and production build pass with a required modal currency
  selection that preserves form state after API rejection.
- Create, list, and detail contracts now require and return the stored currency;
  group list and detail views display it without an SGD inference.
