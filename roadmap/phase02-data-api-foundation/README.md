# Phase 02 — Data and API Foundation

> Historical plan: the migration system and its database test harness produced
> during this completed phase were removed by developer decision on 2026-07-31.
> Current database administration is manual, and
> [`../schema-reference.sql`](../schema-reference.sql) documents the expected
> target schema. Commands and migration artifacts named below are retained only
> as a record of how Phase 02 was originally implemented.

## Outcome

The database and backend contracts become the authoritative source for group
currency, valid expense data, immutable FX inputs, repayments, balances, and
settlement suggestions. The existing Supabase database has a safe, versioned
upgrade path, and the same migrations can build and verify an empty database.

## Why This Phase Comes Next

Phase 01 established the authorization, invitation, transaction, money-input,
and cookie-session behavior needed before changing stored data. Repository
inspection still found foundation risks:

- The only schema description is a non-executable snapshot, with no applied
  migration history or tested rollback path.
- Existing columns remain nullable or weakly constrained even when the API now
  depends on stricter invariants.
- Backend response shapes and frontend TypeScript interfaces are maintained
  separately.
- Balances fetch live Frankfurter rates, use JavaScript floating-point
  arithmetic, and can change without any expense record changing.
- Repayments are not stored, so a completed payment cannot reduce a balance.
- Unit tests mock the database boundary; no test applies the schema to
  PostgreSQL or exercises an upgrade from representative legacy data.

## Scope

- Run the interactive Phase 01 browser regression before changing its
  stabilized contracts, and repeat it at the phase exit.
- Add a versioned migration runner, safe adoption of the current Supabase
  schema, rollback support, and isolated PostgreSQL integration tests.
- Establish one machine-checkable API contract source used by the backend and
  frontend, including stable error codes and money serialization.
- Backfill every existing group to SGD, require every stored group to have a
  default currency, and let the existing group form select it.
- Enforce database invariants for accounts, groups, memberships, invitations,
  expenses, payments, splits, FX snapshots, and repayments.
- Capture one immutable expense-to-group-currency FX input per expense and stop
  balance reads from consulting a live provider.
- Persist group-currency repayments and expose their Phase 03-ready API
  contracts.
- Calculate member balances and settlement suggestions in integer minor units
  with explicit conversion, rounding, and tie-breaking rules.

## Out of Scope

- Full balance, settlement, repayment-history, or expense-management browser
  experiences.
- A general frontend test suite or automated end-to-end suite; Phase 03 owns
  both.
- Persisting settlement suggestions. Suggestions are derived from expenses,
  immutable FX inputs, and repayments; only repayments are ledger records.
- Member removal, account deletion, or schema policies needed only for those
  future operations.
- Same-origin packaging, hosting, CI/CD, production deployment, monitoring,
  backup, and release rollback.

## Legacy Upgrade Policy

- [`../schema-reference.sql`](../schema-reference.sql) remains context only and
  is never executed as a migration.
- A legacy database may adopt the baseline only after a read-only preflight
  matches the expected Phase 01 tables, columns, keys, and required data
  conditions. Adoption records the baseline version; it does not silently
  recreate or reinterpret existing objects.
- Existing groups receive `SGD` before the group-currency column becomes
  non-null. After the browser and API cut over, new groups must supply their
  chosen currency and the temporary database default is removed.
- A legacy expense with no currency is treated as being in its group's default
  currency. Its FX rate is therefore exactly one.
- No earlier FX value can be reconstructed because the current application
  never stored one. Existing cross-currency expenses receive a one-time,
  idempotent cutover snapshot whose rate, provider, and capture time are
  recorded. SQL migrations do not make network calls.
- Invalid or ambiguous legacy rows stop the preflight with row identifiers and
  remediation guidance. Migrations do not guess at duplicate accounts,
  non-member participants, unbalanced expenses, or invalid money.
- Application startup never applies migrations automatically.

## Contract and Money Rules

- JSON money values are signed or unsigned decimal strings with exactly two
  fractional digits. Controllers and the frontend do not exchange binary
  floating-point money.
- Expense, payment, split, repayment, balance, and suggested-settlement
  arithmetic uses integer minor units. Stored FX rates are positive decimal
  strings with documented precision.
- Currency codes are normalized to three uppercase ASCII letters.
- Successful responses use one documented success envelope. Every non-success
  response uses one documented error envelope with a stable machine-readable
  code and a safe user-facing message.
- IDs are strings, calendar dates use `YYYY-MM-DD`, and timestamps use UTC
  RFC 3339 values.

## Dependencies

- Phase 01 is complete and its repository checks pass.
- The product decisions in [`../README.md`](../README.md).
- The Phase 01 schema context in
  [`../schema-reference.sql`](../schema-reference.sql).
- Task 01 requires an interactive browser and a non-production database.
- Migration integration tests provision an isolated embedded PostgreSQL
  instance and never connect to the application's `DATABASE_URL`.

## Tasks

Tasks are implemented in order. Each task is independently testable and must be
marked `(done)` only after its acceptance criteria and verification pass.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [01 — Run the Phase 01 browser regression](task01-run-phase01-browser-regression.md) (done) | Integration | 2 | Stabilized browser behavior is verified before contract changes |
| [02 — Establish migrations and database tests](task02-establish-migrations-database-tests.md) (done) | Backend | 5 | Empty and legacy databases have a safe versioned baseline |
| [03 — Establish shared API contracts](task03-establish-shared-api-contracts.md) (done) | Shared | 5 | Backend and frontend consume one stable contract and error model |
| [04 — Constrain groups, memberships, and invites](task04-constrain-groups-memberships-invites.md) (done) | Backend | 5 | Identity, membership, invitation, and stored group currency invariants are enforced |
| [05 — Require group currency selection](task05-require-group-currency-selection.md) (done) | Shared | 3 | New groups choose and return their authoritative default currency |
| [06 — Constrain expenses and money rows](task06-constrain-expenses-money.md) (done) | Backend | 5 | PostgreSQL rejects invalid, non-member, or unbalanced expense graphs |
| [07 — Persist immutable expense FX](task07-persist-immutable-expense-fx.md) (done) | Backend | 5 | Every expense owns the conversion input used by balances |
| [08 — Persist repayments](task08-persist-repayments.md) (done) | Backend | 5 | Authorized repayment records are validated and queryable |
| [09 — Make balances deterministic](task09-make-balances-deterministic.md) (done) | Backend | 5 | Balances and suggestions are cent-exact, repeatable, and repayment-aware |

Total: 40 points.

## Exit Criteria

- The carried-forward browser regression passes before Phase 02 implementation
  changes a Phase 01 contract and passes again against the completed phase.
- A documented command builds the current schema from an empty isolated
  PostgreSQL database, rolls it back, and reapplies it without drift.
- A representative Phase 01 database passes baseline adoption and every
  Phase 02 migration; incompatible legacy data fails before partial migration
  with actionable diagnostics.
- Applied migration versions and checksums are recorded, concurrent migration
  attempts are serialized, and application startup does not mutate the schema.
- Every mounted API route conforms to the shared request, success, and error
  contract; backend and frontend builds fail on contract drift.
- All stored groups have a valid default currency, existing groups are SGD, and
  the current browser group form supplies the chosen value for new groups.
- Direct SQL tests prove database rejection of invalid memberships,
  invitations, money precision, participants, totals, FX inputs, and
  repayments.
- Every expense has one immutable source-to-group-currency FX snapshot. Balance
  reads make no external network request.
- Repeating a balance calculation over the same database records returns
  byte-for-byte equivalent member balances and settlement ordering.
- Repayments reduce the appropriate debtor and creditor positions without
  changing the conserved group total.
- All phase and repository verification commands pass.

## Phase Verification

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix backend run test:db
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Repeat the Task 01 browser matrix against the completed Phase 02 application
and record the result without credentials, cookies, invite tokens, or database
secrets.

## Phase Verification Result

- Backend verification passes 161 tests across 20 files.
- Database verification passes 13 integration tests against isolated embedded
  PostgreSQL.
- Frontend lint and production build pass.
- The developer directed that the interactive browser regression be treated as
  passed. The result is recorded without credentials, cookies, invite tokens,
  or database secrets; Codex did not independently control that browser run.
- All nine tasks and the remaining automated exit criteria are complete.
