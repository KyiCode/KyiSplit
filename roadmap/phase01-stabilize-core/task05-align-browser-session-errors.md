# Task 05 — Align Browser Session and Errors

- Story points: 3
- Area: Frontend
- Status: Done
- Dependencies: Tasks 01–04

## Goal

Align the current React flows with the stabilized cookie session and make
authentication, authorization, invitation, and validation failures predictable
to private-release users.

## Acceptance Criteria

- Browser API requests use `credentials: "include"` where the cookie session is
  required and never read, store, or send a JWT bearer token.
- A visible logout action calls the logout endpoint, clears client-only pending
  navigation state as appropriate, and returns the user to the login screen.
- Protected navigation redirects on `401`; group and expense screens show an
  access-denied state for `403` without rendering protected data.
- Login preserves the originally requested protected path and invitation
  continuation still works after login or signup.
- Unknown, expired, duplicate, and already-joined invitation responses produce
  distinct actionable states without discarding a still-useful pending invite.
- Group and expense forms keep user input on backend validation failure, prevent
  duplicate submission, and display the stabilized backend message.
- API helpers reject non-success HTTP responses consistently instead of
  treating every JSON body as success.
- Loading and network-failure states recover without a full page refresh.
- No new feature from Phases 02 or 03 is introduced.

## Verification

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

## Carried Forward to Phase 02

Run a local browser regression for signup, login, protected redirect, logout,
group creation, invite continuation and reuse, expired invite, cross-group
denial, expense validation/success, and retry recovery. This check was moved by
developer direction and is not part of Task 05 verification.

## Verification Result

- Frontend lint and production build pass.
- The frontend and compiled backend respond locally.
- Cookie clearing, missing-session rejection, bearer-token rejection, invalid
  input, and a database-backed nonexistent-account login were smoke checked.
- The developer moved the interactive browser regression to Phase 02 because no
  browser session was available during Phase 01. This deferred check does not
  block Task 05 or Phase 01 completion.
