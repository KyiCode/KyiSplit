# Task 01 — Harden Authentication and Sessions

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: None

## Goal

Make the custom JWT-cookie flow the sole browser session boundary, with
validated account input, predictable authentication responses, safe cookie
settings, and an explicit logout path.

## Acceptance Criteria

- The backend normalizes email by trimming and lowercasing before account
  lookup or creation and rejects missing input, malformed email, email longer
  than 254 characters, and passwords outside 8–128 characters without querying
  for a mutation.
- Signup returns `201` for a new account, `409` for a normalized duplicate, and
  a stable validation error for invalid input.
- Login uses one account lookup, returns the same `401` response for an unknown
  email or wrong password, and does not reveal which credential was incorrect.
- Successful login sets the `jwt` cookie but does not include the signed token
  in the JSON response.
- The session cookie is HTTP-only, has a finite maximum age, uses the selected
  same-site policy, and is secure in production.
- `POST /api/users/logout` clears the session cookie with matching cookie
  attributes and succeeds even when no valid session exists.
- Session verification returns authenticated user identity on success and uses
  `401` for a missing, invalid, expired, or deleted-user session.
- Protected browser routes no longer accept a bearer token as an alternative
  to the cookie unless an explicit non-browser use case is documented first.
- Startup fails with a clear configuration error when `JWT_KEY` or the bcrypt
  cost is missing or invalid; secrets are never logged.
- Controller, middleware, and token/cookie tests cover the success and failure
  cases above and fail before the behavior is implemented.

## TDD Sequence

1. Add failing tests for normalization, generic login rejection, response
   status, cookie-only login, logout, cookie attributes, and invalid auth
   configuration.
2. Implement the smallest controller, middleware, route, and configuration
   changes that pass.
3. Refactor duplicated auth response and cookie options without changing the
   tested contract.

## Verification

```powershell
npm.cmd --prefix backend test
```

Confirm no response body or backend log contains a signed JWT or secret value.
