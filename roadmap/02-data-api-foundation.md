# Phase 02 — Data and API Foundation

## Objective

Turn the live Supabase schema and internal fetch calls into versioned,
constrained sources of truth. Add deterministic historical currency conversion
and persisted repayments before building their final UI.

## Migration Baseline

- Install and document the Supabase CLI development workflow.
- Link to the existing project through local, untracked credentials and pull the
  live schema into an initial migration. Do not place the database URL or
  password in a command committed to Git.
- Verify that the pulled baseline describes the same tables and constraints as
  `schema-reference.sql`.
- Record the baseline as already applied to the existing remote database. Apply
  subsequent changes through versioned migrations only.
- Provide a disposable/local PostgreSQL workflow that applies all migrations
  from empty state for tests.

## Schema Changes

- Add `groups.default_currency char(3) NOT NULL`, backfilling existing rows to
  `SGD`.
- Make `group_members.user_group_name`, `expenses.group_id`, and
  `expenses.currency` non-null after validating/backfilling existing rows.
- Constrain names to non-blank values, expense totals to greater than zero,
  payment/split amounts to zero or greater, and currency codes to three uppercase
  ASCII letters.
- Use an explicit two-decimal numeric type for entered expense and settlement
  amounts.
- Add indexes for user group lookup, group expense ordering, invite expiry, and
  group settlement ordering.
- Cascade group deletion to memberships, expenses, invites, and settlements;
  cascade expense deletion to payments and splits. Restrict user deletion while
  financial history still references the user.
- Change invitations to require group, creator, and timezone-aware expiry.
  Remove the unused `used` column. Invitations remain reusable until expiry.
- Add `exchange_rates` with rate date, base currency, quote currency, positive
  high-precision rate, fetched timestamp, and a unique
  `(rate_date, base_currency, quote_currency)` key.
- Add `settlements` with:
  - UUID primary key and required group.
  - Paying and receiving user IDs.
  - Positive two-decimal amount and the group's currency.
  - Creating user, settlement timestamp, and creation timestamp.
  - A constraint preventing the payer and receiver from being the same.

## API Contract

Replace legacy action-named endpoints with:

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Start a cookie session |
| POST | `/api/auth/logout` | End the cookie session |
| GET | `/api/auth/session` | Return current session identity |
| GET | `/api/groups` | List the current user's groups |
| POST | `/api/groups` | Create a group and initial membership |
| GET | `/api/groups/:groupId` | Return group, members, and currency |
| POST | `/api/groups/:groupId/invites` | Create a one-hour invite |
| POST | `/api/invites/:token/join` | Join through an unexpired invite |
| GET | `/api/groups/:groupId/expenses` | List group expenses |
| POST | `/api/groups/:groupId/expenses` | Create a balanced expense |
| PUT | `/api/groups/:groupId/expenses/:expenseId` | Replace an expense and allocations |
| DELETE | `/api/groups/:groupId/expenses/:expenseId` | Delete an expense |
| GET | `/api/groups/:groupId/balance` | Return settlement suggestions |
| GET | `/api/groups/:groupId/settlements` | List recorded repayments |
| POST | `/api/groups/:groupId/settlements` | Record a repayment |
| DELETE | `/api/groups/:groupId/settlements/:settlementId` | Remove a mistaken repayment |

Successful responses use:

```json
{
  "status": "success",
  "data": {}
}
```

Errors use:

```json
{
  "status": "fail",
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "fields": {}
  }
}
```

Omit `fields` when there are no field-level errors. Money enters and leaves the
API as decimal strings. Dates use `YYYY-MM-DD`; timestamps use UTC ISO 8601.

## Balance and Currency Rules

- Convert each expense using the historical rate for its expense date into the
  group's default currency.
- Use a rate of exactly 1 when base and quote match.
- Fetch absent historical rates from Frankfurter, validate the response, and
  store the result in `exchange_rates`. Historical entries are not refreshed.
- Return a retryable service-unavailable error when a required uncached rate
  cannot be fetched; never silently use 1 or a current rate.
- Aggregate normalized payments and splits as decimal values, round only at the
  group-currency boundary, and verify total net balance is zero within one cent
  before producing transfers.
- Apply settlements by reducing the receiver's positive balance and the payer's
  negative balance. Reject settlements whose users are not current group
  members or whose currency differs from the group currency.
- Return user IDs, display names, decimal amount, and currency for each suggested
  transfer.

## Authorization and Transactions

- Require current group membership for every route scoped to a group.
- Any current member may create invites and create, edit, or delete expenses and
  settlements in this trusted release.
- Run group creation/membership, invite joining, expense replacement, and
  settlement writes inside database transactions.
- Enforce duplicate membership and duplicate join behavior through both
  constraints and stable `ALREADY_MEMBER` API errors.

## Exit Criteria

- A new disposable database can be created from migrations.
- Existing Supabase data has a documented, non-destructive upgrade path.
- API routes, envelopes, monetary strings, and frontend TypeScript types agree.
- Integration tests cover constraints, authorization, expiry, transactions,
  historical FX caching, and settlement-adjusted balances.
- Backend tests/typecheck and frontend lint/build pass.
