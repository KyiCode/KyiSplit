# KyiSplit Private-Release Roadmap

## Goal

Take the current React, Express, and Supabase application to a reliable release
for a private group of friends. The release must support secure account access,
groups and reusable invitations, multi-payer expenses, deterministic
multi-currency balances, and recorded repayments.

This roadmap is implementation-oriented. Each numbered phase defines its own
requirements, tests, and exit criteria. Later phases depend on the contracts and
invariants established by earlier ones.

## Verified Starting Point

As inspected on 2026-07-29:

- The backend uses Express 5, TypeScript, `pg`, custom bcrypt passwords, and a
  JWT stored in an HTTP-only cookie.
- Supabase supplies hosted PostgreSQL through `DATABASE_URL`; Supabase Auth is
  not used.
- The frontend uses React 19, React Router, TypeScript, and Vite.
- Authentication, groups, invitations, expense creation, exchange-rate lookup,
  and settlement calculation exist in partial form.
- `npm.cmd test` passes 30 backend tests across five test files.
- `npm.cmd run lint` and `npm.cmd run build` pass in the frontend.
- There is no checked-in migration history, frontend test suite, end-to-end
  suite, production packaging, or useful project README.
- The working tree contains substantial user changes. Roadmap work must preserve
  them.

## Product Decisions

- Audience: a trusted, private group of friends.
- Database: existing Supabase PostgreSQL.
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

| Phase | Outcome | Status |
| --- | --- | --- |
| [01 — Stabilize Core](01-stabilize-core.md) | Current flows are secure, transactional, and predictable | Not started |
| [02 — Data and API Foundation](02-data-api-foundation.md) | Migrations, constraints, contracts, FX, and settlements are authoritative | Not started |
| [03 — Complete Product](03-complete-product.md) | Full browser workflow from signup through repayment | Not started |
| [04 — Release Operations](04-release-operations.md) | Tested, documented, same-origin production artifact | Not started |

Work on one phase at a time. A phase may be marked complete only after all of
its exit criteria pass. When implementation reveals a necessary change to a
later phase, update the affected roadmap file in the same change and explain
why.

## Release Definition

The roadmap is complete only when every item in
[`acceptance-checklist.md`](acceptance-checklist.md) is checked and the
production-like same-origin build passes its smoke test.
