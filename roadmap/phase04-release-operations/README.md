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
- Apply versioned Flyway migrations before deployment and verify them against
  fresh and disposable PostgreSQL databases.
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

## Dependencies

- Phase 03 is complete and its automated verification passes.
- The database used by end-to-end tests is explicitly configured and created
  from the checked-in Flyway migrations.

## Tasks

These tasks complete the private-release scope.

### Repository Review Follow-up

The 2026-10-11 review identified additional work before deployment. Execute
Tasks 12–21 in the order below, then Tasks 22–32, then resume Tasks 07–11. Task numbers
retain the existing task links and completed history.

This follow-up contains repository changes and local verification. Database
credentials are injected at runtime; migration tests use explicitly disposable
PostgreSQL databases. Schema-backed idempotency is outside this follow-up.

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

### 2026-10-14 Local Review Follow-up

The local review passed backend and frontend automated checks and a synthetic
API journey, but live schema verification rejected a database created directly
from the reference, and the isolated browser suite failed without an actionable
startup summary. Manual visual/mobile verification was unavailable.

Complete the ordered tasks below before resuming Task 07. This adds 26 points.
The existing local/prod profile changes are uncommitted work to validate in
Task 22, not completed roadmap work. Tasks 19 and 20 retain their recorded
offline completion; Tasks 23 and 24 address the newly observed live gaps.

Keep the private-friends audience, existing Supabase production database,
Flyway migration administration, member permissions, and delete-and-recreate
expense correction policy. Use explicitly disposable local PostgreSQL fixtures
for tests, separate from the persistent local demo and hosted databases.
Selecting a database profile must not disable production runtime safeguards.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [22 — Validate Local and Production Database Profiles](task22-validate-database-profiles.md) (done) | Backend | 2 | Make local PostgreSQL and hosted Supabase selection explicit, reproducible, and isolated. |
| [23 — Fix Live PostgreSQL Schema Verification](task23-fix-live-schema-verification.md) (done) | Backend | 5 | Make the schema gate accept the reference schema on real PostgreSQL while still rejecting drift. |
| [24 — Restore Safe Browser Test Diagnostics](task24-restore-safe-e2e-diagnostics.md) (done) | Frontend | 3 | Explain browser-suite startup and test failures while preserving the artifact privacy policy. |
| [25 — Recover After Group Creation Refresh Failure](task25-recover-group-creation-refresh.md) (done) | Frontend | 2 | Keep confirmed group creation successful when its subsequent list refresh fails. |
| [26 — Use the Local Calendar Date for New Expenses](task26-use-local-calendar-date.md) (done) | Frontend | 1 | Default an expense to the user's current local date when opening a new expense form. |
| [27 — Expose the Saved Expense Breakdown](task27-expose-expense-breakdown-api.md) (done) | Backend | 3 | Let authorized members retrieve the stored payer, split, and FX facts behind an expense. |
| [28 — Show Payers, Shares, and Saved FX](task28-show-expense-breakdown.md) (done) | Frontend | 3 | Make an expense understandable and its group-currency balance traceable. |
| [29 — Clarify Balance Refresh and Safer Delete Focus](task29-clarify-balance-refresh-and-delete-focus.md) (done) | Frontend | 2 | Make retained balances visibly stale during refresh and make keyboard deletion deliberate. |
| [30 — Order Expense Activity Deterministically](task30-order-expense-activity.md) (done) | Backend | 1 | Make Recent expenses consistently show newest activity first. |
| [31 — Return a Validation Error for Malformed JSON](task31-reject-malformed-json.md) (done) | Backend | 1 | Treat invalid request JSON as a client error rather than an internal server failure. |
| [32 — Rerun the Private Release Browser Review](task32-rerun-private-release-browser-review.md) | Integration | 3 | Close the review's browser, visual, and accessibility evidence gaps before resuming release operations. |

The order prioritizes trustworthy verification, confirmed-save recovery,
expense transparency, then the browser review. Each implementation change and
commit remains scoped to one task with failing behavioral tests first.

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

### Interface Readability Follow-up

After Task 32, resume Task 07 as already directed. Complete the following
frontend tasks after Task 07 and before production-like deployment in Task 08.
Recheck affected Task 32 visual and accessibility evidence after the changes.
Theme and icon work are evaluations with explicit decisions, not assumptions
that a toggle or icons must ship.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [33 — Improve Feedback Readability](task33-improve-feedback-readability.md) | Frontend | 3 | Make feedback legible and actionable across the product. |
| [34 — Evaluate Light and Dark Themes](task34-evaluate-light-dark-themes.md) | Frontend | 5 | Evaluate and, if warranted, deliver an accessible theme choice. |
| [35 — Experiment with Icons](task35-experiment-with-icons.md) | Frontend | 2 | Evaluate a limited, reversible icon treatment. |

Total: 110 points, including the 30-point repository review follow-up, the
26-point local review follow-up, and the 10-point interface follow-up.


## Exit Criteria

- Tasks 33–35 pass their acceptance criteria, and affected browser, contrast,
  keyboard, and assistive-technology review evidence is refreshed.
- Tasks 22–32 pass their acceptance criteria. A PostgreSQL database migrated by
  Flyway passes compatibility checks, representative drift still fails, browser
  failures remain safely diagnosable, and the completed browser/manual review
  is recorded without claiming unavailable checks passed.

- Repository review follow-up Tasks 12–21 pass their acceptance criteria and
  local verification. Existing release gates below still apply.

- Keyboard navigation, focus behavior, labels, status/error announcements,
  contrast, and responsive layouts meet the documented release baseline.
- The deterministic end-to-end suite uses an explicitly configured isolated
  database initialized by Flyway and never uses the application database
  implicitly.
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
