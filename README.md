# KyiSplit

KyiSplit is a work-in-progress expense-sharing application for private groups.
It supports account access, groups and invitations, multi-payer expenses,
currency-aware balances, and settlement planning. The current release target is
documented in the [private-release roadmap](roadmap/README.md).

## Architecture

| Component | Technology | Development role |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite | Browser application on port 5173 |
| Backend | Express 5, TypeScript, Node.js | JSON API on port 5001 |
| Database | PostgreSQL hosted by Supabase | Application data |
| Authentication | Custom JWT session in an HTTP-only cookie | Account sessions |

During development, the frontend and backend run separately. The release
roadmap targets a single HTTPS origin for the browser application and API.

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- Flyway Command-line 13.11.1
- Access to a compatible PostgreSQL database

Install the locked dependencies from the repository root:

```powershell
npm.cmd --prefix backend ci
npm.cmd --prefix frontend ci
```

## Configuration

The backend and frontend load their environment from their respective project
directories. Configure these variables before starting the application:

| Project | Variable | Purpose |
| --- | --- | --- |
| Backend | `DATABASE_URL` | PostgreSQL connection string |
| Migration runner | `FLYWAY_URL` | JDBC PostgreSQL URL for schema migrations |
| Migration runner | `FLYWAY_USER` / `FLYWAY_PASSWORD` | Database role credentials for Flyway |
| Backend | `JWT_KEY` | Secret used to sign session tokens |
| Backend | `SIGNUP_TOKEN` | Private token required to create an account |
| Backend | `BCRYPT_SALT` | Password-hashing cost |
| Backend | `FRONTEND_URL` | Browser origin used when creating invitation URLs |
| Backend | `APP_ORIGIN` | Backward-compatible alias for `FRONTEND_URL` |
| Backend | `NODE_ENV` | Runtime environment and cookie-security mode |
| Backend | `LOG_LEVEL` | Logging threshold: `debug`, `info`, `warn`, `error`, or `silent` |
| Backend | `TRUST_PROXY_HOPS` | Number of trusted HTTPS proxy hops; required in production |
| Backend | `REQUEST_BODY_LIMIT_BYTES` | Maximum JSON request body size |
| Backend | `DB_POOL_MAX` | Maximum PostgreSQL pool clients |
| Backend | `DB_IDLE_TIMEOUT_MS` | PostgreSQL idle client timeout |
| Backend | `DB_CONNECTION_TIMEOUT_MS` | Bounded PostgreSQL connection and readiness timeout |
| Backend | `FX_PROVIDER_TIMEOUT_MS` | FX provider request and response-body timeout (default 5 seconds) |
| Backend | `SHUTDOWN_TIMEOUT_MS` | Grace period for closing HTTP connections and the database pool (default 10 seconds) |
| Backend | `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | Login and signup attempts per client window |
| Backend | `AUTH_RATE_LIMIT_WINDOW_MS` | Login and signup throttling window |
| Frontend | `VITE_BASE_URL` | Development-only backend origin; production always uses same-origin API paths |

Do not commit credentials or secret values.

Account creation uses a username, password, and the private `SIGNUP_TOKEN`
configured on the backend. The token is shared only with intended users and is
never configured in the frontend build. Usernames are 3–32 characters using
lowercase letters, numbers, underscores, and hyphens; they are normalized to
lowercase.

## Database Migrations

Flyway migrations in [`backend/db/migrations`](backend/db/migrations) are the
source of truth for PostgreSQL schema changes. `V1__create_current_schema.sql`
creates the current username-based schema on a fresh database. Applied
migrations are immutable; add a new version for later changes. Application
startup never applies migrations.

Install [Flyway Command-line 13.11.1](https://documentation.red-gate.com/flyway/reference/usage/command-line) and configure `FLYWAY_URL`, `FLYWAY_USER`,
and `FLYWAY_PASSWORD` for the target database. `FLYWAY_URL` must use JDBC form,
such as `jdbc:postgresql://host:5432/database?sslmode=require`. Never commit
these credentials. For hosted deployments, use a direct or session-mode
PostgreSQL connection suitable for migration locks; do not use transaction
pooling.

Check pending migrations, then apply them:

```powershell
npm.cmd --prefix backend run db:info:prod
npm.cmd --prefix backend run db:migrate:prod
npm.cmd --prefix backend run db:validate:prod
```

These profile commands load the ignored `backend/.env` and
`backend/.env.prod` files, then require a hosted Supabase target. Use the
corresponding `:local` commands for a loopback database. Render's pre-deploy
command uses the packaged CLI and runtime-injected `FLYWAY_*` values.

`migrate` runs each migration transactionally and records its version and
checksum in Flyway's schema history. A fresh database must not be baselined;
Flyway should apply V1. For a database with existing application tables, inspect
it before using `baseline` or `migrate` so Flyway does not adopt an unrelated or
partially initialized schema.

## Run Locally

Start each development server in a separate terminal from the repository root:

```powershell
npm.cmd --prefix backend run dev
```

```powershell
npm.cmd --prefix frontend run dev
```

The frontend is available at `http://localhost:5173`, and the backend listens on
`http://localhost:5001`.

## Database Profiles

Use PostgreSQL for both profiles; the app uses PostgreSQL-specific queries and constraints.

- `npm.cmd --prefix backend run dev:local` loads `backend/.env` and ignored `backend/.env.local`, then selects `DB_PROFILE=local`. Set `LOCAL_DATABASE_URL` to a loopback PostgreSQL database. This profile never uses the hosted `DATABASE_URL`.
- `npm.cmd --prefix backend run dev:prod` selects the hosted database while using development runtime settings by default. An explicit shell `NODE_ENV` still overrides the profile file.
- After building the backend, `npm.cmd --prefix backend run start:local` or `start:prod` runs the compiled server with the selected profile.

Copy `backend/.env.local.example` or `backend/.env.prod.example` to the corresponding ignored file and replace its placeholders. Profile files override the base file; variables injected by the shell/runtime take precedence. The prod profile uses `SUPABASE_DATABASE_URL`, with a hosted PostgreSQL `DATABASE_URL` as a deployment-compatible alias. It rejects loopback hosts and connection-string host overrides and never falls back to `LOCAL_DATABASE_URL`. Commands run from the backend directory through npm's prefix handling.

`DB_PROFILE` chooses the database independently of `NODE_ENV`, which controls production runtime validation, HTTPS origin requirements, and secure cookies. Existing `dev`/`start` commands and isolated E2E tests retain their explicit `DATABASE_URL` behavior when no profile is selected. Production artifacts can select a profile by injecting `DB_PROFILE=prod`; do not package local environment files.

Create a **new local review database** and apply the checked-in migrations. Install PostgreSQL command-line tools and run these PowerShell commands from the repository root. If the PostgreSQL tools are not on `PATH`, first point it at your PostgreSQL `bin` directory:

```powershell
$env:Path = "C:\Program Files\PostgreSQL\17\bin;$env:Path"
```

```powershell
New-Item -ItemType Directory -Force .e2e | Out-Null
initdb -D .e2e/local-postgres -U kyisplit_local --auth-local=trust --auth-host=trust --encoding=UTF8
pg_ctl -D .e2e/local-postgres -l .e2e/local-postgres/server.log -o "-p 55433 -h 127.0.0.1" -w start
createdb -h 127.0.0.1 -p 55433 -U kyisplit_local kyisplit_local
$env:FLYWAY_URL = "jdbc:postgresql://127.0.0.1:55433/kyisplit_local"
$env:FLYWAY_USER = "kyisplit_local"
npm.cmd --prefix backend run db:migrate:local
```

Copy `backend/.env.local.example` to the ignored `backend/.env.local`, then use `npm.cmd --prefix backend run dev:local`. Create any demo accounts and expenses through the app. Stop this review database with `pg_ctl -D .e2e/local-postgres -m fast -w stop`. The local cluster listens on loopback only and uses trust authentication for this isolated development instance; do not reuse this setup for a network-accessible database. Local data and PostgreSQL clusters belong under ignored `.e2e/`.

## Build the Production Artifact

Set an explicit release identifier, then run the locked artifact build:

```powershell
$env:RELEASE_VERSION="local-2026-08-04"
$env:FLYWAY_HOME="C:\tools\flyway-13.11.1"
npm.cmd --prefix backend run build:artifact
```

Set `FLYWAY_HOME` to the pinned Flyway Command-line directory before building.
The command compiles the backend and frontend, assembles them with the versioned
migrations and Flyway CLI under `release/kyisplit`, writes `release.json`, and
installs only backend production dependencies with `npm ci --omit=dev`. The
generated directory is ignored by Git and is the complete deployment artifact.

With production configuration injected by the runtime, start it from the
artifact directory:

```powershell
npm.cmd --prefix release/kyisplit start
```

Express serves `/api` before static files, returns JSON for unknown API routes,
and serves the React application shell for direct browser-route navigation.
Production browser requests always use relative same-origin API paths.

## Repository CI and Artifact Checksum

`.github/workflows/verify.yml` uses Node.js 22.23.3, installs both locked
dependency trees with `npm ci`, and runs backend tests, frontend tests, lint,
and the production artifact build. It uploads the commit-versioned archive and
its SHA-256 file only after those steps succeed. The npm cache stores downloads;
it does not replace lockfile installs.

To reproduce the artifact packaging locally after the verification commands:

```powershell
$env:RELEASE_VERSION = (git rev-parse HEAD).Trim()
npm.cmd --prefix backend run build:artifact
npm.cmd --prefix backend run archive:artifact -- $env:RELEASE_VERSION
```

The archive includes the production `node_modules` tree. Verify its checksum
and inspect its contents with:

```powershell
$archive = "release/kyisplit-$env:RELEASE_VERSION.tar.gz"
$actualHash = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLowerInvariant()
$expectedHash = (Get-Content "$archive.sha256").Split(' ')[0]
if ($actualHash -ne $expectedHash) { throw 'Artifact checksum mismatch.' }
tar -tzf $archive
```

The workflow upload step excludes Playwright output and local E2E configuration
explicitly. It does not deploy, publish a container, or run the live database
and Chromium gates reserved for Task 07.

Validate the workflow YAML locally when Prettier is available:

```powershell
npx.cmd --yes prettier@3.6.2 --check .github/workflows/verify.yml
```

## Backend Logging

The backend writes one structured JSON record per line. Startup, database
connectivity, request completion, controller failures, shutdown signals, and
unexpected process failures use stable event names. Set `LOG_LEVEL=debug` for
the most detail during local diagnosis; the default is `info` (`silent` during
tests).

Every request receives an `X-Request-Id` response header. Use that value to
find its `request_started`, `request_completed`, and any operation-specific
failure records. Logs include the matched route pattern rather than the raw URL
so invitation tokens are not captured.

The logger redacts sensitive keys and does not record request or response
bodies, passwords, password hashes, cookies, JWTs, authorization headers,
invitation tokens, SQL values, or database connection strings. PostgreSQL
errors retain safe fields such as `code`, `constraint`, `table`, and `schema`.

For a local failure:

1. Copy `X-Request-Id` from the browser response.
2. Find records with the same `requestId` in the backend terminal.
3. Inspect the operation event and safe error metadata while leaving the API's
   generic error response unchanged.

Application logging is part of Phase 03. Production log transport, retention,
monitoring, and alerting remain Phase 04 work.

## Verification

Run the checks relevant to the subsystem you changed:

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

The backend test command includes production and test TypeScript checks. A
frontend automated test suite is also available with
`npm.cmd --prefix frontend test`.

Check a database schema without applying changes by passing its PostgreSQL URL
explicitly:

```powershell
npm.cmd --prefix backend run schema:check -- --database-url postgresql://user@localhost/kyisplit_test
```

The checker reads PostgreSQL catalog metadata and compares it with the V1
Flyway baseline. It does not fall back to `DATABASE_URL`.

### Isolated end-to-end verification

The Playwright suite never falls back to the application database. It copies a
stopped local PostgreSQL template initialized by Flyway from the versioned
migrations, runs the copy on a test-only port, and deletes the entire run
directory afterward.

Browser screenshots, traces, and video are disabled, and Playwright failure
output suppresses raw browser errors and URLs. See the
[browser artifact policy](frontend/e2e/ARTIFACT_POLICY.md) for generated-file
retention and upload rules.

Set these variables in the shell that starts the suite; do not add credentials
to a tracked file. Alternatively, put them in the ignored
`frontend/.env.e2e.local` file:

| Variable | Purpose |
| --- | --- |
| `E2E_POSTGRES_BIN_DIR` | Directory containing the local `pg_ctl` executable |
| `E2E_POSTGRES_TEMPLATE_DIR` | Stopped, dedicated PostgreSQL data directory prepared for E2E copies |

```dotenv
E2E_POSTGRES_BIN_DIR=C:\Program Files\PostgreSQL\17\bin
E2E_POSTGRES_TEMPLATE_DIR=C:\path\to\KyiSplit\.e2e\postgres-template
```

Install the pinned browser once, then run the suite:

```powershell
npm.cmd --prefix frontend exec playwright install chromium
npm.cmd --prefix frontend run test:e2e
```

Each run copies the template to a uniquely named data directory, checks
required tables and columns before startup, builds the versioned artifact,
serves its frontend and API together on test-only port 5510, runs PostgreSQL on
port 55432, and uses a local deterministic FX provider on port 5512. Playwright stops the
services and removes the complete run directory after the suite, including
after test failures. It never deletes rows from a shared application database
and never runs migrations against the template or application database during
test startup.

## Repository Layout

```text
backend/   Express API, Flyway migrations, PostgreSQL access, and backend tests
frontend/  React browser application
roadmap/   Release decisions and phased plans
```

## Current Limitations

- The application is pre-release and intended only for development.
- End-to-end verification requires a separately prepared PostgreSQL template
  initialized with Flyway.
- Managed hosting, continuous delivery, and production operations remain
  roadmap work.
