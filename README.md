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
| Backend | `JWT_KEY` | Secret used to sign session tokens |
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
| Backend | `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | Login and signup attempts per client window |
| Backend | `AUTH_RATE_LIMIT_WINDOW_MS` | Login and signup throttling window |
| Frontend | `VITE_BASE_URL` | Development-only backend origin; production always uses same-origin API paths |

Do not commit credentials or secret values.

## Database Schema

KyiSplit does not include or run database migrations. Database changes are
performed manually by the database owner, and application startup never
creates or alters schema objects.

The consolidated schema the application expects is documented in
[`roadmap/schema-reference.sql`](roadmap/schema-reference.sql). Treat that file
as a target-state reference, not as an incremental or production-safe update
script. Before changing a populated database, take a backup, compare its
current schema and data with the reference, and apply the required changes
manually in an appropriate transaction.

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

## Build the Production Artifact

Set an explicit release identifier, then run the locked artifact build:

```powershell
$env:RELEASE_VERSION="local-2026-08-04"
npm.cmd --prefix backend run build:artifact
```

The command compiles the backend and frontend, assembles them under
`release/kyisplit`, writes `release.json`, and installs only backend production
dependencies with `npm ci --omit=dev`. The generated directory is ignored by
Git and is the complete provider-neutral deployment artifact.

With production configuration injected by the runtime, start it from the
artifact directory:

```powershell
npm.cmd --prefix release/kyisplit start
```

Express serves `/api` before static files, returns JSON for unknown API routes,
and serves the React application shell for direct browser-route navigation.
Production browser requests always use relative same-origin API paths.

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

### Isolated end-to-end verification

The Playwright suite never falls back to the application database. It copies a
stopped local PostgreSQL template whose schema matches
`roadmap/schema-reference.sql`, runs the copy on a test-only port, and deletes
the entire run directory afterward.

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
and never applies `schema-reference.sql` during test startup.

## Repository Layout

```text
backend/   Express API, PostgreSQL access, and backend tests
frontend/  React browser application
roadmap/   Release decisions, phased plans, and schema context
```

## Current Limitations

- The application is pre-release and intended only for development.
- End-to-end verification requires a separately prepared PostgreSQL template.
- Managed hosting, continuous delivery, and production operations remain
  roadmap work.
