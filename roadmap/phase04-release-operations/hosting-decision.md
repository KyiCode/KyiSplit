# Hosting Decision — Render Web Services

- Status: Accepted
- Decision date: 2026-08-04
- Decision owner: Repository maintainer
- Applies to: KyiSplit private release

## Decision

Deploy KyiSplit to **Render** as two web services in the **Singapore** region:

- `kyisplit-staging`: production-like verification, normally suspended or on a
  Free instance while release work is active.
- `kyisplit-production`: private-user service on a paid Starter instance or
  larger.

Both services will pull the same prebuilt OCI image from GitHub Container
Registry by immutable digest. They will not build application source on
Render. Production promotion changes only the selected image digest after the
staging checks pass.

## Deployment Contract

| Concern | Decision |
| --- | --- |
| Service | Public Render Web Service with managed HTTPS |
| Region | Singapore |
| Runtime | OCI image based on pinned Node.js 22 LTS |
| Artifact source | Private GHCR image created from `release/kyisplit` by CI |
| Artifact identity | Git commit release version plus immutable image digest; never `latest` |
| Build command | CI runs locked installs, verification, `build:artifact`, and the image build; Render performs no source build |
| Start command | `node dist/server.js` from the packaged artifact working directory |
| Port | Render-provided `PORT`; Express binds the service listener |
| Health | Task 06 adds `/health/live` and `/health/ready`; Render deploy health gate uses `/health/ready` |
| Secrets | Separate staging and production Render environment values; no secrets in source, images, or deploy hooks |
| Database | Separate Supabase PostgreSQL URLs for staging and production over encrypted public connectivity |
| Deployment | Auto-deploy off; CI/API requests an explicit image digest after checks pass |
| Rollback | Render rollback to a retained image digest, followed by health and same-origin smoke checks |
| Logs | Structured stdout/stderr in Render; Task 09 configures retention and external transport |

The environments use the same image and configuration names but distinct
service URLs, `DATABASE_URL`, `JWT_KEY`, and release authority. No environment
uses a separate source branch.

## Cost Boundary

- Keep the Render Hobby workspace at $0.
- Use a Free staging service only for controlled verification; suspend it when
  unused because free services sleep and share monthly free instance hours.
- Production must use an always-on paid instance. The approved application-host
  ceiling is **US$10 per month** for one production instance, excluding
  Supabase, domain registration, and usage overages.
- Before Task 08 creates a paid service, verify the live Starter price in the
  Render dashboard. Stop and revisit this decision if the smallest suitable
  paid instance exceeds US$10 per month.
- Monitor outbound bandwidth because traffic from Render to Supabase is public
  egress. The Hobby workspace currently includes 5 GB monthly; exceeding the
  allowance can incur charges when a payment method is present.

Supabase pricing and backup upgrades remain a separate operational cost. Task
09 decides when the private release requires a paid Supabase plan.

## Options Considered

| Criterion | Render | Railway |
| --- | --- | --- |
| Managed HTTPS and Node service | Supported | Supported |
| Singapore region | Supported | Supported |
| Prebuilt registry image | Supported; digest-based rollback documented | Supported through Docker/private registry deployment |
| Secret injection | Environment variables, secret files, and scoped environment groups | Environment variables and environment scoping |
| Health-gated deployment | Configurable web-service health check | Configurable deployment health check |
| Logs | Searchable service logs; external streams available | Service logs and metrics available |
| Environment separation | Project environments and scoped configuration | Project environments and scoped variables |
| Rollback | Reuses retained build artifact or exact registry digest | Deployment rollback/redeploy with plan-dependent image retention |
| Entry cost | Free sleeping service; paid instance selected separately | $5 Hobby minimum with metered usage beyond included credit |

### Why Render

- Its documented rollback model retains the target deploy's artifact and uses
  the same registry digest when images are addressed immutably.
- Prebuilt-image deployment cleanly preserves the Task 04 artifact boundary and
  prevents an unverified provider rebuild.
- Singapore, managed TLS, environment separation, secrets, health checks,
  logs, and zero-downtime deploy behavior match the release requirements.
- A sleeping Free staging service keeps pre-release cost low, while a paid
  production instance avoids free-tier cold starts.

### Why Railway Was Not Selected

Railway is technically viable and has a Singapore region, health checks,
variables, private image support, and a low entry price. It was not selected
because its Hobby cost is usage-metered above the included credit and its image
retention window is plan-dependent. Render's explicit artifact/digest rollback
contract and free staging option better match this small private release.

### Other Options Rejected

- **Fly.io:** capable and regionally flexible, but its lower-level machine and
  networking model adds operational work without improving this release's
  single-service requirements.
- **Separate static frontend hosting:** rejected because it would break the
  accepted single-origin artifact and reintroduce a cross-origin browser/API
  deployment contract.
- **Render native source builds:** rejected because production must promote the
  exact artifact verified by CI rather than rebuild source on the host.

## Risks and Follow-Up

- The service-to-Supabase connection crosses the public network. Task 06 must
  bound pool usage and timeouts; Task 08 must verify TLS connectivity and
  latency from Singapore.
- Free staging cold starts make it unsuitable for monitoring or final release
  evidence. Resume it before verification and wait for readiness.
- Registry credentials and Render API credentials become release secrets and
  must be scoped and rotated under Task 09.
- Render region changes require creating a replacement service, so a material
  mismatch with the Supabase region requires revisiting this decision before
  Task 08.

## Official Sources Reviewed

Reviewed on 2026-08-04:

- [Render Web Services](https://render.com/docs/web-services)
- [Render regions](https://render.com/docs/regions)
- [Docker and prebuilt images on Render](https://render.com/docs/docker)
- [Render deploy behavior](https://render.com/docs/deploys)
- [Render rollbacks](https://render.com/docs/rollbacks)
- [Render environment variables and secrets](https://render.com/docs/configure-environment-variables)
- [Render health checks](https://render.com/docs/health-checks)
- [Render projects and environments](https://render.com/docs/projects)
- [Render logs](https://render.com/docs/logging)
- [Render outbound bandwidth](https://render.com/docs/outbound-bandwidth)
- [Render free-service limitations](https://render.com/docs/free)
- [Railway plans and pricing](https://docs.railway.com/pricing/plans)
- [Railway regions](https://docs.railway.com/deployments/regions)
- [Railway deployments](https://docs.railway.com/deployments)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [Railway variables](https://docs.railway.com/variables)
