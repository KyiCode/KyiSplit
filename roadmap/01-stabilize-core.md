# Phase 01 — Stabilize Core

## Objective

Make the existing authentication, group, invitation, expense, and balance code
safe to extend. This phase fixes known defects without introducing the final
settlement UI or changing database shape beyond what is required for immediate
correctness.

## Configuration and Secret Safety

- Remove `frontend/.env` from Git tracking without deleting the developer's
  local copy. Add frontend and backend `.env.example` files containing names and
  safe placeholder values only.
- Determine whether the tracked frontend environment file ever contained a
  credential. If so, document that it must be rotated and remove it from Git
  history only with explicit user approval.
- Add a typed backend configuration module that fails startup with a concise
  error when required variables are absent or malformed.
- Configure application origin, cookie duration, bcrypt cost, port, database
  URL, JWT secret, runtime environment, and rate-provider URL through that
  module.
- Remove hardcoded local CORS assumptions. Development may allow the configured
  Vite origin; production accepts the same public origin only.

## Authentication Hardening

- Normalize email by trimming and lowercasing it before every account lookup.
- Validate email shape and require a password of at least eight characters on
  both signup and login request boundaries.
- Query the user once during login. Missing user and incorrect password must
  return the same generic `INVALID_CREDENTIALS` response.
- Keep JWTs only in the HTTP-only cookie; remove the token from JSON responses.
- Read JWT duration from validated configuration and align token expiry with
  cookie expiry.
- Add `POST /api/auth/logout`, clearing the cookie with the same cookie
  attributes used when setting it.
- Rate-limit signup and login by IP. Do not reveal whether an address is
  registered.
- Reject cross-origin state-changing requests by validating `Origin` in
  production. Continue to use a secure, HTTP-only same-site cookie.

## Correctness Repairs

- Fix the member-existence query in `addMember`, including its swapped
  `group_id`/`user_id` values.
- Fix the reversed `hasExpense` checks in payer and split mutations.
- Make missing expense/group/user query results return typed not-found errors
  rather than indexing `rows[0]`.
- Make invite validation return an invalid result for missing tokens instead of
  throwing.
- Ensure every controller branch sends or delegates an HTTP response.
- Change the balance endpoint away from a GET request body. Phase 1 may accept a
  query parameter until Phase 2 makes the group currency authoritative.
- Pass expense IDs—not complete expense rows—to payment/split queries and
  invalid-expense validation.
- Validate arrays, UUID-shaped identifiers, finite values, non-negative member
  amounts, and a positive total before any write.
- Compare paid and split totals in integer cents, accepting only exact equality.
- Replace the expense write with a checked-out `pg` client. Run the expense,
  payment, and split inserts on that client; roll back on any exception and
  release it in `finally`.
- Use correct 4xx/5xx status codes and one error-handling path. Do not return
  `501` for ordinary server failures.

## Testing

- Preserve all current tests.
- Add regression tests for missing login accounts, reversed expense checks,
  missing invites, correct member query parameters, balance expense IDs,
  monetary rounding, rollback, and client release.
- Test that production cookies are secure and that login responses never
  contain a JWT.
- Add controller tests for logout, malformed input, unauthorized group access,
  and error response envelopes.

## Exit Criteria

- No `.env` file is Git-tracked.
- Known controller/query defects have regression coverage.
- Multi-statement expense writes demonstrably commit or roll back as one unit.
- Authentication responses do not disclose account existence or tokens.
- Backend tests/typecheck and frontend lint/build pass.
