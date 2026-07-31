# Task 03 — Complete the Product API Client

- Story points: 3
- Area: Frontend
- Status: Complete
- Dependencies: Task 02

## Goal

Expose typed browser helpers for deterministic balances, repayments, and
expense deletion without duplicating shared contracts.

## Acceptance Criteria

- Frontend helpers import the Phase 02/03 request and response types directly
  from the authoritative contract source.
- Balance requests send no target-currency body.
- Repayment create accepts only the documented body; list and delete paths are
  group-scoped.
- Expense deletion uses the new group-and-expense scoped endpoint.
- Helpers preserve coded failures and the global unauthenticated behavior.
- Deterministic fetch tests cover methods, paths, bodies, success unwrapping,
  coded failures, and malformed envelopes.

## TDD Sequence

1. Add failing fetch-contract tests for every new helper.
2. Add the smallest helpers using the existing API client.
3. Remove any duplicate frontend models exposed by the new calls.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
