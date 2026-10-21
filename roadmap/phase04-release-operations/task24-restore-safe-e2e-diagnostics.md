# Task 24 — Restore Safe Browser Test Diagnostics

- Story points: 3
- Area: Frontend
- Status: Done
- Dependencies: Task 23

## Goal

Explain browser-suite startup and test failures while preserving the artifact privacy policy.

## Acceptance Criteria

- Provide allowlisted failure stages for configuration, prerequisite, schema, packaged-server startup, browser launch, and test assertions; do not infer the prior E2E root cause without reproducing it.
- Handle global/setup/web-server failures as well as per-test failures and include safe operation/status or expectation categories when available.
- Never print raw browser errors, URLs, SQL values, passwords, cookies, tokens, or connection strings; unknown errors receive a generic stage/category.
- Keep screenshots, trace, video, and unsafe attachments disabled and existing upload exclusions intact.
- Test representative setup failures and secret-bearing inputs, and demonstrate one deliberately failing isolated run whose safe summary identifies the stage.

## TDD Sequence

Add failing reporter/global-error and redaction regressions; implement structured safe categories rather than dumping raw errors, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Frontend tests, lint, build; one controlled failing browser run followed by a successful isolated startup/smoke run.

## Completion

- Added allowlisted failure stages and categories for configuration,
  PostgreSQL prerequisites and schema, packaged-server startup, browser launch,
  test assertions, setup, and cleanup. Reporter output includes only a safe
  test-case label, category, and attempt; raw Playwright errors and service
  output are discarded by the runner.
- Kept screenshot, trace, and video capture disabled. The runner removes new
  Playwright output attachments after each run, and the existing upload
  exclusions remain unchanged.
- Frontend tests passed: 74 tests across 16 files. Frontend lint and build
  passed. Backend tests passed: 259 tests across 27 files.
- Controlled missing-configuration and missing-template runs returned safe
  setup summaries. A secret-bearing intentional assertion failure reported
  `browser test / test assertion / expectation failed`; the subsequent isolated
  packaged-artifact smoke passed.
- The full browser suite still reports `critical journey / test assertion /
  expectation failed`. Its cause is not inferred here; Task 32 retains the
  browser review. The artifact smoke and isolated startup checks pass.
- Set the Vitest worker count to one after parallel execution exceeded the
  existing UI test timeouts; the standard frontend test command then passed.
