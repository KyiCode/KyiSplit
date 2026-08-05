# Task 09 — Establish Operations and Recovery

- Story points: 5
- Area: Operations
- Status: Planned
- Dependencies: Task 08

## Goal

Make failures visible and recovery actions executable before promotion.

## Acceptance Criteria

- Structured application logs are transported with defined retention and
  remain searchable by request ID without sensitive fields.
- Alerts cover sustained unavailability, readiness failure, elevated server
  errors, authentication abuse, database saturation, and deployment failure
  with actionable thresholds and owners.
- Supabase backup availability, retention, restore authority, and a restore
  validation procedure are recorded.
- Secret inventory, ownership, rotation sequence, and post-rotation validation
  cover the database, JWT signing, and provider credentials.
- Incident triage, user communication, containment, recovery, and evidence
  preservation are documented.
- Rollback selects a previously verified artifact and accounts for manual
  schema compatibility before execution.

## Verification

- Trigger safe production-like health, error, and abuse signals and confirm the
  expected logs and alerts arrive.
- Perform tabletop backup-restore, secret-rotation, incident, and rollback
  walkthroughs without recording secret values.
