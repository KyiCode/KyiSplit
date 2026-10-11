# Task 20 — Protect Browser Test Artifacts

- Story points: 3
- Area: Frontend
- Status: Done
- Dependencies: Task 18

## Goal

Keep browser test diagnostics safe to retain or publish.

## Scope

Playwright configuration, frontend E2E helpers and assertions, and offline regression checks.

## Acceptance Criteria

- Disable raw trace, video, and automatic screenshot retention where it could capture passwords, cookies, or invitation links.
- Replace response-body and raw-URL assertion messages with safe status and operation descriptions.
- Keep useful failure diagnostics without credentials, authorization headers, tokens, cookie values, or invitation URLs.
- Make artifact upload exclusions explicit and document which generated files are safe to publish.
- Add offline checks covering configured retention and sanitization using representative sensitive values; do not start PostgreSQL or require a browser installation.

## TDD Sequence

Write failing diagnostics and retention checks, implement safe failure reporting, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

## Completion

- Disabled screenshot, trace, and video capture; replaced the default reporter
  and suppressed packaged-server output so browser state is not retained in
  test attachments or CI logs.
- API request failures now include only a safe operation label and HTTP status.
  Invite URL checks use booleans, and route assertions never print the current
  path.
- Added a browser artifact policy naming the generated release directory as the
  publishable output and explicitly excluding Playwright results, reports,
  local E2E configuration, and run logs. Task 21 will apply these exclusions
  to the repository workflow upload step.
- Added offline tests with representative passwords, cookie values, bearer
  tokens, and invitation URLs. No browser or PostgreSQL instance was started.
- Verification passed: frontend tests (69), lint, production build, and
  `git diff --check`.

