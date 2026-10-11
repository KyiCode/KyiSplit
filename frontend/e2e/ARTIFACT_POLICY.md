# Browser Test Artifact Policy

Playwright runs with screenshots, traces, and videos disabled. Its reporter
prints the test name and retry number for a failure, but suppresses the raw
browser error, response body, and URL.

Never upload or publish these generated or local files:

- `frontend/test-results/**` (including `artifacts/**`, screenshots, traces,
  videos, and the isolated PostgreSQL run directory)
- `frontend/playwright-report/**`
- `frontend/.env.e2e.local` or other local `.env` files
- application or browser logs from an E2E run

The versioned production output in `release/kyisplit/**` is the only generated
directory intended for publication. Runtime secrets are injected after build;
they must not be copied into the artifact. CI upload steps must name this
directory and list the E2E output paths as explicit exclusions.
