# KyiSplit Private-Release Roadmap

## Goal

Take the current React, Express, and Supabase application to a reliable release
for a private group of friends. The release must support secure account access,
groups and reusable invitations, multi-payer expenses, deterministic
multi-currency balances, and recorded repayments.

This roadmap is implementation-oriented. Phases are planned in detail one at a
time according to [`PLANNING_GUIDE.md`](PLANNING_GUIDE.md). When planned, each
phase defines its own requirements, tests, and exit criteria. Later phases
depend on the contracts and invariants established by earlier ones.

## Verified Starting Point

As inspected on 2026-07-29:

- The backend uses Express 5, TypeScript, `pg`, custom bcrypt passwords, and a
  JWT stored in an HTTP-only cookie.
- Supabase supplies hosted PostgreSQL through `DATABASE_URL`; Supabase Auth is
  not used.
- The frontend uses React 19, React Router, TypeScript, and Vite.
- Authentication, groups, invitations, expense creation, exchange-rate lookup,
  and settlement calculation exist in partial form.
- `npm.cmd --prefix backend test` passes 30 backend tests across five test
  files.
- `npm.cmd --prefix frontend run lint` and
  `npm.cmd --prefix frontend run build` pass.
- There is no checked-in migration history, frontend test suite, end-to-end
  suite, or production packaging.

## Product Decisions

- Audience: a trusted, private group of friends.
- Database: existing Supabase PostgreSQL.
- Schema administration: the database owner applies changes manually; the
  repository carries an expected-schema reference but no migrations.
- Authentication: retain and harden the custom Express JWT-cookie flow.
- Deployment: serve the React application and API from one HTTPS origin.
- Existing group currency: backfill to SGD; new groups choose a default
  currency.
- Money entry: two decimal places for this release.
- Invitation: reusable by multiple people for exactly one hour.
- Repayment: persist it and use it to reduce calculated balances.
- Authorization: any current group member may invite users and manage that
  group's expenses or settlements.

## Phase Order and Status

| Phase | Outcome | Plan | Status |
| --- | --- | --- | --- |
| 01 — Stabilize Core | Current flows are secure, transactional, and predictable | [Detailed plan](phase01-stabilize-core/README.md) | Complete |
| 02 — Data and API Foundation | Constraints, contracts, FX, and settlements are authoritative | [Detailed plan](phase02-data-api-foundation/README.md) | Complete |
| 03 — Complete Product | Full browser workflow from signup through repayment | [Detailed plan](phase03-complete-product/README.md) | Complete |
| 04 — Release Operations | Accessibility and critical browser verification precede release operations | [Carried-forward tasks](phase04-release-operations/README.md) | In progress |

Work on one phase at a time. A phase may be marked complete only after all of
its exit criteria pass. When implementation reveals a necessary change to a
later phase, update the affected roadmap file in the same change and explain
why.

Phase 04 is the single active phase. Its
[`CURRENT_TASK.md`](phase04-release-operations/CURRENT_TASK.md) identifies the
next implementation task.

## Release-Level Phase Outline

This outline defines the intended progression without prematurely fixing task
details for later phases. Phases 01 and 02 are decomposed into implementation
tasks.

### Phase 01 — Stabilize Core

Secure the existing authentication, group, invitation, expense, and balance
paths before expanding their data model. Enforce membership consistently,
apply the one-hour reusable-invite rule, make multi-write operations atomic,
validate two-decimal money at the API boundary, and align the current frontend
with the hardened session contract.

Exit gate: authorization and rollback regressions are covered by tests, current
frontend API calls use the cookie session contract, and all repository checks
pass.

### Phase 02 — Data and API Foundation

Make stored data and backend contracts authoritative:

- Establish the required database constraints and document the expected schema
  for the existing Supabase database.
- Run the carried-forward interactive browser regression for authentication,
  invitation continuation and reuse, cross-group denial, expense creation, and
  recovery states before changing the Phase 01 contracts.
- Backfill existing groups to SGD, require a default currency for new groups,
  and add database constraints for memberships, invitations, money, expenses,
  FX records, and repayments.
- Define stable request, response, and error contracts shared by the frontend
  and backend.
- Keep the existing browser calls aligned with those contract changes without
  pulling the complete Phase 03 experience into this phase.
- Persist the exchange-rate inputs used by an expense so balance results never
  change merely because a live rate changes.
- Calculate balances and settlement suggestions with deterministic decimal
  and rounding rules, including persisted repayments.
- Verify database behavior against a database that matches the expected schema.

Exit gate: API contract tests and the carried-forward browser regression pass,
the expected database constraints are documented, and repeated balance
calculations over the same records produce the same result.

### Phase 03 — Complete Product

Deliver the full private-group browser journey:

- Complete signup, login, logout, group creation with default currency,
  one-hour reusable invitations, and invitation continuation after auth.
- Present expense details, multi-payer and custom/equal splits, group-currency
  balances, settlement suggestions, and repayment history.
- Allow authorized group members to record repayments and manage the group's
  expenses and settlements through the established API contracts.
- Provide deliberate loading, empty, validation, unauthorized, expired-link,
  offline, and retry states across responsive layouts.
- Add structured, correlated, secret-safe backend diagnostics before building
  the end-to-end suite.
- Add a frontend test suite for the completed browser behavior.

Exit gate: completed product behavior and backend diagnostics pass their
automated checks. Accessibility and critical-journey browser verification are
carried into Phase 04.

### Phase 04 — Release Operations

Package, deploy, and operate the private release:

- Meet the responsive accessibility baseline across the completed product.
- Establish deterministic end-to-end infrastructure using an explicitly
  configured isolated database.
- Verify the critical private-group journey and its highest-risk failure paths.
- Build the React assets and Express API as one versioned production artifact,
  serve them from one origin, and support client-side route fallback without
  intercepting `/api` routes.
- Select a managed Node.js host that supports HTTPS, Supabase connectivity,
  secret injection, health checks, and rollback; record the decision before
  adding provider-specific configuration.
- Add continuous integration for locked installs, backend tests, frontend lint
  and build, schema compatibility checks, and end-to-end smoke tests.
- Define production configuration, secret rotation, database connection
  limits, authentication abuse controls, log transport and retention,
  health/readiness checks, monitoring, alerting, backup expectations, incident
  response, and rollback.
- Deploy to a production-like environment, verify the manually managed schema
  and run same-origin smoke checks, then promote the identical artifact.
- Document setup, deployment, manual schema changes, recovery, and private-user
  onboarding.

Exit gate: the production URL is HTTPS and same-origin, automated and manual
smoke checks pass, monitoring and rollback are exercised, and the private
release runbook is complete.

## Release Definition

The roadmap is complete only when every phase is complete, all phase exit
criteria pass, and the production-like same-origin build passes its smoke test.
