# Phase 01 — Stabilize Core

## Outcome

The existing account, group, invitation, expense, and balance flows have a
secure and predictable baseline. Requests cannot cross group boundaries,
multi-write operations cannot leave partial data, browser authentication uses
only the intended cookie session, and invalid money or invitation input is
rejected before persistence.

## Why This Phase Comes First

Repository inspection found release-blocking behavior in current paths:

- `getGroupMembers` does not await its membership check.
- The direct add-member endpoint permits membership changes without an
  invitation.
- Invitations are generated for seven days, while the release decision is one
  hour, and invite validation does not check expiry.
- Login returns the JWT in the response body even though the browser session is
  intended to use an HTTP-only cookie.
- Group creation uses two independent writes.
- Expense creation issues `BEGIN` and subsequent statements through the pool,
  so one database connection is not guaranteed and failures do not roll back.
- Expense totals are compared as floating-point numbers and collection shape,
  duplicate member, finite-number, and two-decimal rules are incomplete.

Expanding the schema or product on top of those behaviors would make later
migrations, contracts, and end-to-end tests unreliable.

## Scope

- Harden signup, login, session verification, logout, auth configuration, and
  cookie behavior.
- Enforce authenticated group membership on every existing group-scoped read
  and write.
- Make invitation membership the only supported join path and enforce reusable
  invitations that expire exactly one hour after creation.
- Make group creation and expense creation atomic on a checked-out PostgreSQL
  client with rollback and release on every failure path.
- Validate current group, invitation, expense, payer, and split inputs,
  including integer-cent equality for two-decimal money.
- Update the existing frontend only as needed for the hardened session and
  error behavior.

## Out of Scope

- Versioned migrations, database backfills, and new schema constraints.
- Persisted FX inputs, default group currency, authoritative balances,
  settlement records, and repayment records.
- New expense-management, balance, settlement, or repayment screens.
- A general frontend test suite or end-to-end test suite.
- Production packaging, infrastructure, CI/CD, hosting, and deployment.

## Dependencies

- The release decisions in [`../README.md`](../README.md).
- The existing Supabase PostgreSQL schema described for context in
  [`../schema-reference.sql`](../schema-reference.sql).
- A test database is not required for this phase; database behavior is isolated
  at the pool/client boundary in backend tests. Phase 02 adds migration-backed
  integration tests.

## Tasks

Tasks are implemented in order. Each task is independently testable and must be
marked `(done)` only after its acceptance criteria and verification pass.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [01 — Harden authentication and sessions](task01-harden-auth-sessions.md) (done) | Backend | 5 | Cookie-only sessions have validated inputs and a complete lifecycle |
| [02 — Enforce group access and invite rules](task02-enforce-group-access-invites.md) (done) | Backend | 5 | Group boundaries and one-hour reusable invites are enforced |
| [03 — Make core writes atomic](task03-make-core-writes-atomic.md) (done) | Backend | 5 | Group and expense creation commit fully or roll back fully |
| [04 — Validate expense money and participants](task04-validate-expense-money.md) (done) | Backend | 5 | Expense input is finite, two-decimal, unique, and cent-exact |
| [05 — Align browser session and errors](task05-align-browser-session-errors.md) (done) | Frontend | 3 | Current browser flows match the hardened API behavior |

Total: 23 points.

## Exit Criteria

- Missing, invalid, and expired sessions cannot access protected routes.
- A browser login creates an HTTP-only cookie without returning or storing a
  bearer token, and logout invalidates the cookie.
- Every existing group, member, expense, invite, and balance path rejects a
  non-member without disclosing group data.
- Invitations remain usable by multiple distinct authenticated users until
  exactly one hour after creation and are rejected after expiry.
- Direct membership insertion outside the invitation path is not exposed.
- A failed group or expense creation leaves no partial rows, and its checked-out
  database client is always released.
- Expense input accepts only valid two-decimal amounts whose payer and split
  totals match in integer cents and whose participants are unique members of
  the group.
- All phase and repository verification commands pass.

## Phase Verification

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

The developer moved the interactive browser regression to Phase 02. Phase 02
must carry it forward explicitly and run it before changing the stabilized
Phase 01 contracts.
