# Private-Release Acceptance Checklist

Check an item only after verifying it in the release candidate. Record links to
CI runs, test output, or release notes beside items when available.

## Accounts and Sessions

- [ ] Signup trims and normalizes email and validates password requirements.
- [ ] Login does not reveal whether an email is registered.
- [ ] JWTs exist only in secure HTTP-only cookies and never in response bodies or
      logs.
- [ ] Protected pages reject anonymous and expired sessions.
- [ ] Logout clears the session and protected pages become inaccessible.
- [ ] Authentication endpoints are rate-limited.

## Groups and Invitations

- [ ] A user can create a group with a display name and default currency.
- [ ] Only current members can view or mutate group resources.
- [ ] A group invite can be used by multiple accounts for one hour.
- [ ] Expired and malformed invites fail safely.
- [ ] An existing member cannot create a duplicate membership.
- [ ] Pending invites survive the signup/login flow.

## Expenses

- [ ] A member can create an expense with multiple payers and custom splits.
- [ ] Equal splitting allocates every cent exactly once.
- [ ] Invalid, negative, non-finite, or mismatched totals are rejected by the UI,
      API, and database as applicable.
- [ ] Expense creation and replacement are atomic.
- [ ] A member can edit or delete an expense after confirmation.
- [ ] Expense history is ordered deterministically.

## Currency and Balances

- [ ] Same-currency expenses use a rate of exactly one.
- [ ] Cross-currency expenses use a validated historical rate for the expense
      date.
- [ ] Historical rates are cached and do not change on later balance requests.
- [ ] Missing upstream rates produce a retryable error without corrupting data.
- [ ] Suggested transfers net all member balances to zero within one cent.
- [ ] Balance responses contain display names, decimal-string amounts, and the
      group currency.

## Repayments

- [ ] A member can record a full or partial repayment between two group members.
- [ ] Zero, negative, self-directed, wrong-currency, and cross-group repayments
      are rejected.
- [ ] Recording a repayment reduces the displayed debt correctly.
- [ ] Removing a mistaken repayment restores the prior balance.
- [ ] Repayment history is ordered and identifies payer, receiver, creator,
      amount, currency, and time.

## Data and Security

- [ ] No `.env`, database URL, password, JWT secret, cookie, invite token, or
      production data is tracked in Git.
- [ ] A fresh database can be created entirely from versioned migrations.
- [ ] The existing Supabase database has a documented non-destructive migration
      path.
- [ ] Foreign keys, checks, uniqueness, and delete behavior match the roadmap.
- [ ] Logs redact all sensitive headers, credentials, tokens, and request data.
- [ ] Backup restoration has been rehearsed on a disposable database.

## User Experience

- [ ] Core flows work at mobile, tablet, and desktop widths.
- [ ] Forms and dialogs are keyboard accessible and correctly labelled.
- [ ] Loading, empty, validation, offline, unauthorized, not-found, and
      retryable-error states are understandable.
- [ ] Reduced-motion preferences are respected.
- [ ] No stale legacy routes or unused workflow components remain.

## Build and Release

- [ ] Backend tests and typecheck pass.
- [ ] Frontend lint, tests, and production build pass.
- [ ] Migrations apply successfully to an empty disposable PostgreSQL database.
- [ ] Integration and end-to-end suites pass in CI.
- [ ] The production artifact serves the frontend and API from one HTTPS origin.
- [ ] Health, readiness, graceful shutdown, and structured logging work.
- [ ] The root README documents setup, migrations, tests, deployment, backups,
      recovery, and known limitations.
- [ ] Post-deployment smoke tests pass using non-production test accounts.
