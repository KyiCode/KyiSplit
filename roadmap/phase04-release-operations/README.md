# Phase 04 — Release Operations

## Outcome

The completed product is packaged, verified, deployed, and operable as a
private same-origin HTTPS release with documented recovery and onboarding.

## Scope

- Complete automated keyboard, announcement, semantics, and narrow-viewport
  coverage carried forward from Phase 03.
- Establish deterministic end-to-end infrastructure against an explicitly
  configured isolated PostgreSQL database.
- Verify the signup-through-repayment journey and its highest-risk
  authorization and recovery paths.
- Build one versioned production artifact that serves the browser application
  and API from the same origin.
- Select and configure a managed Node.js host, add continuous verification,
  and harden production runtime behavior.
- Establish monitoring, backup, incident, rollback, deployment, and private
  onboarding procedures.

## Out of Scope

- Public self-service signup, billing, organization administration, native
  applications, and multi-region availability.
- Automated database migrations; schema changes remain manually administered.

## Dependencies

- Phase 03 is complete and its automated verification passes.
- The database used by end-to-end tests is explicitly configured and matches
  [`../schema-reference.sql`](../schema-reference.sql).

## Tasks

These tasks complete the private-release scope.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [01 — Meet the responsive accessibility baseline](task01-responsive-accessibility-baseline.md) (done) | Frontend | 3 | Completed screens are keyboard-usable, announced, and responsive |
| [02 — Establish deterministic end-to-end tests](task02-establish-e2e-tests.md) (done) | Integration | 3 | E2E services, data isolation, and browser fixtures are repeatable |
| [03 — Verify the critical private-group journey](task03-verify-critical-journey.md) (done) | Integration | 5 | Signup-through-repayment and required failure paths pass end to end |
| [04 — Package the same-origin production artifact](task04-package-same-origin-artifact.md) (done) | Integration | 5 | One versioned artifact serves the browser and API safely |
| [05 — Select the managed hosting platform](task05-select-managed-host.md) (done) | Operations | 2 | A documented host decision fixes the deployment contract |
| [06 — Harden the production runtime](task06-harden-production-runtime.md) (done) | Backend | 5 | Configuration, abuse controls, database limits, and health checks are production-safe |
| [07 — Add continuous release verification](task07-add-continuous-verification.md) | Operations | 5 | CI gates locked installs, schema compatibility, automated tests, and artifact creation |
| [08 — Configure production-like deployment](task08-configure-production-like-deployment.md) | Operations | 3 | The chosen host deploys the immutable artifact with injected configuration |
| [09 — Establish operations and recovery](task09-establish-operations-recovery.md) | Operations | 5 | Logs, alerts, backups, incidents, secret rotation, and rollback are actionable |
| [10 — Complete release and onboarding documentation](task10-complete-release-runbook.md) | Documentation | 3 | Setup, schema administration, deployment, recovery, and user onboarding are documented |
| [11 — Verify, rollback, and promote the release](task11-verify-and-promote-release.md) | Integration | 5 | The production-like artifact passes verification, rollback, and promotion |

Total: 44 points.


## Exit Criteria

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
- A versioned artifact serves browser routes and `/api` from one HTTPS origin,
  and deployment promotes the identical verified artifact.
- Locked CI installs, schema compatibility, automated checks, and smoke tests
  pass before deployment.
- Production configuration, abuse controls, connection limits, health checks,
  log transport, monitoring, alerting, backups, incident response, secret
  rotation, and rollback are configured and exercised.
- The release runbook and private-user onboarding guide are complete.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run test:e2e
```
