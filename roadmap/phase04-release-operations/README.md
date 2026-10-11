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
- Complete the repository review follow-up: dependency fixes, signup password
  boundaries, bounded runtime work, reliable deletion recovery, stronger schema
  checks, safe browser diagnostics, and repository CI gates.

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

### Repository Review Follow-up

The 2026-10-11 review identified additional work before deployment. Execute
Tasks 12–21 in the order below, then resume existing Tasks 07–11. Task numbers
retain the existing task links and completed history.

This follow-up contains only repository changes and local verification that
the agent can complete autonomously. It does not require account setup, secret
provisioning, a manually prepared database, schema administration, or actions
from the developer. Schema-backed idempotency is outside this follow-up.

The follow-up totals 30 points. Task 21 delivers the repository-only CI gates
within existing Task 07. Task 07 retains its full acceptance criteria and must
remain incomplete until its disposable-database checks, Chromium smoke suite,
and remote workflow success/failure verification pass.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [12 — Update Backend Dependencies](task12-update-backend-dependencies.md) | Backend | 2 | Reduce audited dependency risk in the API and its development tools. |
| [13 — Update Frontend Dependencies](task13-update-frontend-dependencies.md) | Frontend | 2 | Reduce audited dependency risk in browser routing and frontend tooling. |
| [14 — Reject Truncated Signup Passwords](task14-reject-truncated-signup-passwords.md) | Backend | 3 | Ensure every byte of a newly registered password contributes to its bcrypt hash. |
| [15 — Align Signup Password Validation](task15-align-signup-password-validation.md) | Frontend | 1 | Explain the signup password limit before sending an invalid request. |
| [16 — Bound Rate Limiter Storage](task16-bound-rate-limiter-storage.md) | Backend | 3 | Keep authentication throttling memory bounded during long-running service operation. |
| [17 — Bound External Requests and Shutdown](task17-bound-operations-and-shutdown.md) | Backend | 5 | Make stalled FX requests, readiness probes, and shutdown finish within explicit deadlines. |
| [18 — Recover After Expense Deletion](task18-recover-after-expense-deletion.md) | Frontend | 3 | Show the confirmed result of an expense deletion even when activity refresh fails. |
| [19 — Strengthen Schema Compatibility Checks](task19-strengthen-schema-compatibility.md) | Backend | 3 | Detect schema drift in the database structures that protect application invariants. |
| [20 — Protect Browser Test Artifacts](task20-protect-browser-test-artifacts.md) | Frontend | 3 | Keep browser test diagnostics safe to retain or publish. |
| [21 — Add Repository CI Gates](task21-add-repository-ci-gates.md) | Operations | 5 | Continuously verify repository checks and produce a checksummed artifact after they pass. |

For behavioral changes, use TDD and run the relevant repository checks listed
in each task. Offline schema and browser-diagnostic checks use controlled
fixtures. Their completion does not constitute live database or E2E evidence.

### Existing Release Tasks

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

Total: 74 points, including the 30-point repository review follow-up.


## Exit Criteria

- Repository review follow-up Tasks 12–21 pass their acceptance criteria and
  local verification. Existing release gates below still apply.

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
