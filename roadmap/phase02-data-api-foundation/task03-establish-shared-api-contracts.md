# Task 03 — Establish Shared API Contracts

- Story points: 5
- Area: Shared
- Status: Done
- Dependencies: Task 02

## Goal

Make one machine-checkable contract source authoritative for the current API
and the Phase 02 group-currency, repayment, balance, and settlement contracts,
then align the backend and existing frontend API helpers to it.

## Acceptance Criteria

- One checked-in contract source defines method, path, path parameters, request
  body, success body, error body, and status codes for every mounted endpoint.
  The same source also defines the Phase 02 repayment and final balance
  endpoints before those endpoints are activated.
- Backend response types and frontend API-helper types are imported or
  generated from that source; equivalent hand-maintained response interfaces
  are removed.
- Contract generation, if used, is deterministic and has a verification
  command that fails when generated files are stale.
- Existing route paths remain canonical for this phase unless the contract
  explicitly replaces a path in the same task. Undocumented compatibility
  aliases are not added.
- Success responses use one envelope with a typed `data` value. Errors use
  `{ status: "fail", code, message }` with optional documented field details.
- Stable codes cover authentication, authorization, validation, missing
  resources, duplicate accounts, invitation states, conflicts, FX
  unavailability, data-integrity failure, and unexpected server failure.
- Status-code meaning is consistent across controllers: `400` invalid input,
  `401` no valid session, `403` authenticated but unauthorized, `404` missing
  resource, `409` state conflict, `410` expired invitation, and `5xx` safe
  infrastructure or unexpected failure.
- Contract money fields are two-decimal strings, IDs are strings, dates are
  `YYYY-MM-DD`, timestamps are UTC RFC 3339 strings, and currency codes are
  uppercase three-letter strings.
- Backend route/contract tests prove that current success and representative
  error responses conform and contain no raw PostgreSQL or provider error.
- The frontend client reads only the shared success and error envelopes,
  preserves the global `401` behavior, and current browser flows compile
  without a duplicated response model.
- The new contract foundation does not add the Phase 03 balance or repayment
  screens.

## TDD Sequence

1. Add failing route inventory and response-shape tests, plus a stale-contract
   check if generation is selected.
2. Introduce the smallest shared contract source and adapt current backend
   controllers and frontend API helpers in one aligned change.
3. Consolidate response and error helpers without obscuring controller status
   decisions or frontend recovery behavior.

## Verification

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Run the contract verification command introduced by this task and inspect the
route inventory for an entry for every route mounted by `server.ts`.

## Verification Result

- Backend verification passes 125 tests across 19 files.
- The route inventory test covers every active mounted endpoint and records
  Phase 02 repayment endpoints as planned.
- Frontend lint and production build pass while importing the authoritative
  backend contract types.
- Controllers and middleware use the shared success and coded failure
  emitters; current frontend helpers unwrap the same envelopes.
