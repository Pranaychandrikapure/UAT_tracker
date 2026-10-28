# Enterprise CR Platform — Repository Audit and Implementation Plan

Date: 27 October 2026

## Architecture alignment

The supplied architecture and ER diagrams are the target design. The existing repository is a small vertical slice, not yet the complete platform. The correct evolution path is a FastAPI modular monolith backed by normalized PostgreSQL tables, with Next.js as the role-aware presentation layer and Redis/Celery used only for cache and asynchronous processing.

## Existing implementation

- Next.js 16, React 19 and TypeScript frontend with a responsive UAT Tracker shell.
- Role-switching demonstration, CR list, manual UAT interactions, defect UI, SRN generation and dashboard visualizations.
- FastAPI application with health, `work-items`, and dashboard-summary APIs.
- SQLAlchemy async PostgreSQL configuration and Alembic migrations.
- A legacy `work_items` CR/CRS table with project, developer, assignment date and due date fields.
- Docker Compose for PostgreSQL, backend and frontend.
- Unit tests for health and the legacy work-item schema.

## Gaps and required refactoring

- Authentication is demonstration-only; there is no verified SSO/JWT session or backend identity middleware.
- Frontend business data is largely hardcoded or stored in `localStorage`; it is not the system of record.
- One `developer` string on `work_items` cannot represent multiple developers, PMs, leads or assignment history.
- No normalized users, teams, projects, roles, permissions, CR stakeholders, scope versions, baselines, tasks, SIT cycles, UAT cycles, defects, releases, notifications, audit logs or KRA records existed before the enterprise-core migration.
- No Zoho adapter, owner mapping, idempotent sync log or webhook reconciliation exists.
- No Redis, Celery, transactional worker, S3/MinIO storage, attachment policy or email delivery audit exists.
- Workflow permissions were mostly frontend-only and status transitions were not centrally validated.
- The frontend is currently one large component and should be split by domain as APIs replace demonstration state.

## Foundation implemented in this phase

- Normalized identity and organization entities: users, departments, teams and memberships.
- Project-scoped RBAC entities: roles, permissions, assignments, projects, project members and modules.
- Canonical `change_requests` entity, distinct source ownership, BA and primary-PM fields.
- Effective-dated CR stakeholder assignments and a database constraint for one active primary PM.
- Append-only CR status history, audit log and transactional outbox tables.
- Central CR lifecycle transition rules with permission and mandatory-reason validation.
- Database-driven internal CR creation and transition API foundations with project-scoped permissions.
- Existing `work_items` endpoints retained as a compatibility slice; migration to canonical CRs will be incremental.

## Dependency-ordered roadmap

| Phase | Module | State | Main dependency |
|---|---|---|---|
| 1 | Enterprise identity, projects, RBAC, canonical CR, audit/outbox | Started | PostgreSQL |
| 2 | Verified SSO/JWT identity and resource authorization | New | Identity provider metadata |
| 3 | Requirements, scope versions, impact assessment, deadline proposals and schedule baselines | New | Canonical CR + approvals |
| 4 | CR stakeholders, module impacts, development tasks, assignments, blockers, time entries and code reviews | New | Projects/modules + RBAC |
| 5 | SIT cycles, test cases, executions and sign-off | New | Development readiness rules |
| 6 | UAT handoff, cycles, tester assignment, executions and sign-off | Refactor | SIT sign-off + releases |
| 7 | Defects, resolution attempts, retesting and history | Refactor | SIT/UAT execution identities |
| 8 | Releases, release-to-CR links, deployments and closure | Refactor | UAT/business acceptance |
| 9 | Zoho adapter, mappings, snapshots, sync runs and errors | New | Confirm Zoho product/module |
| 10 | Redis cache, Celery workers, durable outbox dispatch and notification delivery | New | Outbox + SMTP/provider |
| 11 | Attachments and evidence through S3/MinIO signed uploads | New | Storage decision |
| 12 | Operational reports, KRA evidence and authorized reviews | New | Stable lifecycle data |
| 13 | Split Next.js UI into API-backed role-aware modules | Refactor | Backend modules 2–12 |

## Business assumptions requiring configuration

- The exact Zoho product and module are not present in this repository; provider-specific calls must wait until connection metadata is supplied.
- The existing SSO button has no backend verifier. Production API access must remain behind a trusted identity integration; `X-Actor-Id` is only a transitional development contract.
- Deadline calculations use calendar dates until a business calendar, holidays and working-hour policy are configured.
- PostgreSQL remains authoritative. Redis will never store permanent CR, approval or appraisal state.

## Next implementation milestone

Implement verified authentication and bootstrap administration, then add scope/baseline tables and APIs. Once those contracts stabilize, migrate the CR list/detail/creation screens away from `localStorage` and legacy `work_items` to `/api/v1/change-requests`.
