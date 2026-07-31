# Phase 04 — Release Operations

## Outcome

The completed product meets its responsive accessibility baseline and its
critical private-group journey is verified in a deterministic browser
environment before release operations continue.

## Scope

- Complete the rendered keyboard, screen-reader, and narrow-viewport checks
  carried forward from Phase 03.
- Establish deterministic end-to-end infrastructure against an explicitly
  configured isolated PostgreSQL database.
- Verify the signup-through-repayment journey and its highest-risk
  authorization and recovery paths.

## Out of Scope

- Additional Phase 04 task planning. Packaging, deployment, CI/CD, monitoring,
  backups, and operational rollback remain in the release-level outline until
  the developer explicitly requests their task plans.

## Dependencies

- Phase 03 is complete and its automated verification passes.
- The database used by end-to-end tests is explicitly configured and matches
  [`../schema-reference.sql`](../schema-reference.sql).

## Tasks

These are the only currently planned Phase 04 tasks.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [01 — Meet the responsive accessibility baseline](task01-responsive-accessibility-baseline.md) | Frontend | 3 | Completed screens are keyboard-usable, announced, and responsive |
| [02 — Establish deterministic end-to-end tests](task02-establish-e2e-tests.md) | Integration | 3 | E2E services, data isolation, and browser fixtures are repeatable |
| [03 — Verify the critical private-group journey](task03-verify-critical-journey.md) | Integration | 5 | Signup-through-repayment and required failure paths pass end to end |

Total: 11 points.

## Exit Criteria for Planned Tasks

- Keyboard navigation, focus behavior, labels, status/error announcements,
  contrast, and responsive layouts meet the documented release baseline.
- The deterministic end-to-end suite uses an explicitly configured isolated
  database matching the expected schema and never uses the application
  database implicitly.
- The suite covers the critical journey, cross-group denial, expired invites,
  recovery paths, and destructive confirmations in repeated and shuffled runs.
- Backend tests, frontend tests, frontend lint, frontend build, and end-to-end
  tests all pass.
- The completed browser regression is recorded without credentials, cookies,
  invitation tokens, or database secrets.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run test:e2e
```
