# Task 08 — Configure Production-Like Deployment

- Story points: 3
- Area: Operations
- Status: Planned
- Dependencies: Tasks 05–07

## Goal

Deploy the immutable release artifact to the selected host using explicit,
reviewable production-like configuration.

## Acceptance Criteria

- Provider configuration matches the accepted hosting decision and deploys the
  artifact produced by CI rather than rebuilding unverified source.
- Runtime secrets and database configuration are injected by the platform and
  no secret values are committed or printed.
- HTTPS, one-origin routing, runtime version, region, start command, liveness,
  readiness, and deployment timeout are explicit.
- Production-like and production use the same artifact and configuration shape
  while keeping databases, secrets, URLs, and release authority separate.
- Deployment failure preserves the last healthy release.

## Verification

- Validate provider configuration with its official tooling.
- Deploy a CI-produced artifact to the production-like environment.
- Confirm health checks pass and record the artifact version without secrets.
