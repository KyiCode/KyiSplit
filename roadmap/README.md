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
| 01 — Stabilize Core | Current flows are secure, transactional, and predictable | Not started |
| 02 — Data and API Foundation | Migrations, constraints, contracts, FX, and settlements are authoritative | Not started |
| 03 — Complete Product | Full browser workflow from signup through repayment | Not started |
| 04 — Release Operations | Tested, documented, same-origin production artifact | Not started |

Work on one phase at a time. A phase may be marked complete only after all of
its exit criteria pass. When implementation reveals a necessary change to a
later phase, update the affected roadmap file in the same change and explain
why.

No phase is currently active. Plan Phase 01 according to `PLANNING_GUIDE.md`
before beginning roadmap implementation.

## Release Definition

The roadmap is complete only when every phase is complete, all phase exit
criteria pass, and the production-like same-origin build passes its smoke test.
