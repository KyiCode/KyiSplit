# Task 02 — Enforce Group Access and Invite Rules

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 01

## Goal

Close every current group-authorization gap and make the invitation route the
only supported membership-entry path, with the release's one-hour reusable
semantics.

## Acceptance Criteria

- Tests enumerate every existing group-scoped endpoint and prove that a
  non-member receives a consistent denial without group, member, expense,
  invite, or balance data.
- All asynchronous membership checks are awaited, including the group-member
  listing path.
- Balance requests validate that the authenticated user is a current member
  before any expense or FX work is performed.
- The direct `addmember` route is removed; an authenticated account can join a
  group only with a valid invitation.
- Only a current group member can create an invitation.
- A generated invitation expires exactly one hour after creation.
- Invite validation handles unknown tokens without throwing, compares expiry
  using one server-side time source, and rejects a token at or after its
  expiration time.
- The same unexpired invitation can add multiple distinct authenticated users;
  joining does not mark it used.
- A user already in the group receives an idempotent conflict response and no
  duplicate membership is inserted.
- Group names are trimmed to 1–100 characters and per-group display names are
  trimmed to 1–50 characters before their associated group or membership
  write; input outside those bounds is rejected.
- Tests fail first for cross-group access, missing/expired tokens, one-hour
  expiry, invite reuse, duplicate joins, and invalid names.

## TDD Sequence

1. Add a route authorization matrix and focused invitation-clock tests.
2. Fix the smallest authorization, routing, validation, and invitation logic
   needed to pass.
3. Consolidate group-membership checks without weakening endpoint coverage.

## Verification

```powershell
npm.cmd --prefix backend test
```

Inspect the route table to confirm there is no direct add-member endpoint.
