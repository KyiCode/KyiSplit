# Task 04 — Package the Same-Origin Production Artifact

- Story points: 5
- Area: Integration
- Status: Complete
- Dependencies: Task 03

## Goal

Produce one versioned, provider-neutral artifact in which Express serves the
built React application and API from the same origin.

## Acceptance Criteria

- A locked command builds backend JavaScript and frontend assets into one
  reproducible deployable artifact with an explicit version identifier.
- Express serves the built frontend in production while `/api` routes retain
  JSON behavior and are never captured by browser-route fallback.
- Direct navigation to known client routes returns the application shell;
  unknown `/api` paths return a JSON 404.
- Production browser requests use relative same-origin API paths without CORS
  being required for the deployed flow.
- Automated tests cover static assets, client-route fallback, API precedence,
  missing assets, and artifact startup.
- Local development and isolated E2E commands continue to work.

## TDD Sequence

1. Add failing production-serving and route-precedence tests.
2. Add the smallest build and server changes that create and serve the artifact.
3. Refactor packaging paths and version metadata without changing behavior.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run test:e2e
```

Also start the packaged artifact with test configuration and verify a browser
route, a static asset, a valid API route, and an unknown API route.

## Verification Result

Verified on 2026-08-04:

- `npm.cmd --prefix backend test` passed (23 files, 181 tests).
- `npm.cmd --prefix frontend test` passed (15 files, 60 tests).
- Frontend lint and production build passed.
- A `local-verification` artifact built with 101 locked production packages
  and zero reported dependency vulnerabilities.
- `npm.cmd --prefix frontend run test:e2e` passed (10 tests) against the
  packaged application on one origin.
- Artifact coverage verified release metadata, direct browser navigation, a
  generated static asset, authenticated API precedence, and JSON API 404s.
- Local development retains its configured cross-origin API path; production
  builds ignore that development value and use relative API paths.
