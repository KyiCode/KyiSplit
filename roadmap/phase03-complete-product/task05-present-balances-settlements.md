# Task 05 — Present Balances and Settlements

- Story points: 5
- Area: Frontend
- Status: Complete
- Dependencies: Task 04

## Goal

Show every member's group-currency balance and deterministic settlement
suggestions in language the private group can act on.

## Acceptance Criteria

- The group page loads the authoritative balance response with group activity
  and never supplies or infers another target currency.
- Every current member is shown, including zero balances, with clear owes,
  should-receive, and settled labels.
- Suggestions identify payer, receiver, positive amount, and group currency in
  API order.
- Member IDs are resolved through the current group-member response without
  hiding integrity mismatches.
- Empty, loading, `403`, integrity, offline, and retry states are deliberate
  and do not erase already displayed activity unnecessarily.
- Repeated refreshes preserve byte-equivalent ordering.
- Component tests cover signs, money formatting, zero state, suggestions,
  unknown members, integrity failure, and retry.

## TDD Sequence

1. Add failing signed-balance and suggestion rendering tests.
2. Add the typed balance fetch and smallest presentational components.
3. Share group refresh state with expenses without coupling their error
   recovery.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
