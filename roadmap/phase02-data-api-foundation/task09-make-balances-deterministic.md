# Task 09 — Make Balances Deterministic

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 08

## Goal

Replace live-rate floating-point settlement logic with a cent-exact,
order-independent balance engine that uses stored FX snapshots and repayments
and returns stable group-currency balances and suggestions.

## Acceptance Criteria

- The balance endpoint accepts no target-currency request body; it always uses
  the stored group default currency and returns that currency explicitly.
- One calculation reads groups, members, expenses, payments, splits, FX
  snapshots, and repayments from one consistent database snapshot.
- Stored two-decimal amounts are converted to integer minor units before
  arithmetic. FX multiplication uses an exact decimal representation rather
  than JavaScript binary floating point.
- Each expense's group-currency total is rounded to the nearest minor unit using
  round-half-up. Payments and splits are independently allocated to that total
  by largest fractional remainder, with user ID ascending as the tie-breaker,
  so both collections conserve the converted expense total exactly.
- A member net is `allocated paid - allocated owed`, then a repayment adds its
  amount to the paying member and subtracts it from the receiving member.
  Group net always sums to zero.
- The response contains every current member, including zero balances.
  Positive signed money means the member should receive and negative means the
  member owes.
- Settlement suggestions use only integer minor units. At each step the largest
  debtor and creditor are selected; equal amounts are ordered by user ID
  ascending. Every suggested amount is positive and suggestions conserve all
  non-zero member balances.
- The same records return byte-for-byte equivalent balances and settlement
  ordering regardless of database row order or repeated execution.
- Missing or contradictory FX/data invariants return the shared data-integrity
  error and never trigger a provider call or partial result.
- Unit tests fail first for half-cent rounding, largest-remainder allocation,
  tie ordering, multiple currencies, same-currency rate one, zero-balance
  members, repayments, shuffled input rows, conserved totals, and malformed
  data.
- Database integration tests cover a multi-expense, multi-payer,
  cross-currency group with repayments and assert the exact shared response.
- Obsolete floating-point conversion and nondeterministic priority-queue code,
  queries, and dependencies are removed when no longer used.

## TDD Sequence

1. Write pure-engine failing tests from integer/decimal fixtures, including
   shuffled input and exact expected serialized output.
2. Implement the smallest deterministic allocation, netting, repayment, and
   suggestion functions, then connect them to one consistent database read.
3. Remove live conversion and obsolete heap paths, keeping pure calculations
   independent of Express and PostgreSQL.

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

Repeat the Phase 01 browser regression matrix against the completed phase,
including creation of a group with a selected currency, and record the
sanitized result before marking Phase 02 complete.

## Verification Result

- Backend verification passes 161 tests across 20 files.
- Database verification passes 13 integration tests against isolated embedded
  PostgreSQL, including the exact multi-expense, cross-currency, repayment-aware
  response.
- Frontend lint and production build pass against the final shared contract.
- Pure tests cover half-up rounding, largest remainders, user-ID tie breaks,
  shuffled inputs, repeated execution, zero balances, repayments, and malformed
  stored data.
- Balance reads use one repeatable-read transaction, accept no target-currency
  body, perform no provider fetch, and return every member in stable order.
