# Task 27 — Expose the Saved Expense Breakdown

- Story points: 3
- Area: Backend
- Status: Done
- Dependencies: Task 26

## Goal

Let authorized members retrieve the stored payer, split, and FX facts behind an expense.

## Acceptance Criteria

- Add a typed, authenticated expense-detail contract and keep the shared endpoint inventory aligned with the route.
- Check group membership before revealing expense existence; scope the expense lookup by group and expense IDs and return stable missing/malformed/denied responses.
- Return original amount/date/currency, payer contributions, individual shares, and saved FX source/target/rate/provider/effective/capture timestamps using existing money/date serialization.
- Read persisted records only; do not fetch a new live FX rate or change balance calculations when displaying details.
- Cover multi-payer/custom splits, same- and cross-currency records, missing data, cross-group IDs, nonmembers, and infrastructure failures. No schema change or in-place editing is included.

## TDD Sequence

Add failing authorization, detail mapping, route, and shared-contract tests; implement the smallest read-only endpoint, then refactor.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

Backend tests and build; authorized and denied requests against synthetic local records; frontend lint/build for shared-contract compatibility.
