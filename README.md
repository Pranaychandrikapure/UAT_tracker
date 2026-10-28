# UAT Tracker

Enterprise UAT, change-request, and release-management platform.

## Stack

- Frontend: Next.js, React, TypeScript
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL with Alembic migrations

## Repository layout

```text
frontend/   Next.js application
backend/    FastAPI API and database migrations
```

## Run locally

### Database

Start PostgreSQL locally and create a database named `uat_tracker`, or use the included Compose file on a machine with Docker:

```bash
docker compose up postgres -d
```

Copy `.env.example` to `.env` and adjust credentials if needed.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API documentation is available at `http://localhost:8000/docs`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

# UAT Tracker — Enterprise Change Request & Release Management System

A mission-critical enterprise Change Request (CR) Management, Development, SIT, UAT, Bug Fixing, Consolidated SRN Email Dispatch, and Management Tracking Application.

## Key Capabilities & Business Workflows

1. **Zoho CRM & Internal CR Ingestion:**
   - Periodic or webhook-driven ingestion from Zoho with deduplication via `external_record_id`.
   - External Zoho owners are kept strictly separate from the internally assigned Primary PM.
   - **Baseline Protection:** If Zoho alters an approved scope, the system preserves the baseline and automatically generates a pending `ScopeChangeProposal` for review rather than silently overwriting requirements.

2. **Multi-PM Ownership Governance:**
   - Multi-PM support with strictly one active `PRIMARY_PM` accountable for complete delivery, alongside Supporting PMs, Tech Leads, Developers, and UAT Leads/Testers.

3. **Impact Assessment & Deadline Negotiation:**
   - Technical evaluation of impacted modules, complexity, DB/API/frontend changes, and developer/SIT/UAT/buffer hours.
   - Separate tracking for BA requested deadline, PM proposed deadline, and approved baseline.
   - Formal "Request Deadline Revision" workflow with business approver acceptance/rejection controls.

4. **Module-Wise Development & Progress:**
   - Relationship hierarchy: `CR -> Impacted Modules -> Dev Tasks -> Assigned Developers`.
   - Task statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `CODE_REVIEW`, `READY_FOR_SIT`, `SIT_IN_PROGRESS`, `SIT_FAILED`, `SIT_PASSED`, `DEVELOPMENT_COMPLETE`.
   - Distinct separation between development completion and SIT readiness.

5. **Developer System Integration Testing (SIT):**
   - Formal SIT cycles, test executions, pass/fail results, defect discovery, and lead sign-off before entering UAT handoff.

6. **Consolidated SRN Release & Same-Thread Email Dispatch:**
   - Multi-item selection screen for eligible CR changes and fixed bugs that satisfied mandatory SIT checks.
   - Generates consolidated Software Release Notes (SRN) with HTML email body.
   - **Email Threading:** Uses RFC-compliant `In-Reply-To` and `References` headers and provider conversation IDs to reply directly within the existing business discussion thread.
   - Multi-thread conflict resolution: Option to reply in the master release thread or generate a new consolidated release thread.

7. **Critical Business Rule: Fixed != UAT Deployed:**
   - Bug lifecycle: `OPEN -> ASSIGNED -> IN_PROGRESS -> FIXED -> SIT_IN_PROGRESS -> SIT_PASSED -> READY_FOR_UAT_DEPLOYMENT -> SRN_SENT -> UAT_DEPLOYED -> READY_FOR_RETEST -> VERIFIED -> CLOSED`.
   - Sending an SRN email marks the defect `SRN_SENT` but **never** marks it `UAT_DEPLOYED`.
   - Requires an explicit deployment confirmation gate (`confirm_uat_deployment`) with build identifier and verification evidence to transition defects to `UAT_DEPLOYED` and unlock UAT retesting (`READY_FOR_RETEST`).

8. **UAT Retesting & Formal Closure:**
   - Retest verification with PASS / FAIL outcomes, reproduction notes, and evidence.
   - Reopening workflow when defects persist.
   - Separate milestone timestamps: `dev_completed_at`, `sit_completed_at`, `srn_sent_at`, `uat_deployed_at`, `uat_signed_off_at`, `business_accepted_at`, `prod_deployed_at`, `closed_at`.

9. **Executive Analytics & Contextual KRA Tracking:**
   - 16 role-aware application views across all engineering disciplines.
   - Real-time management KPIs: CR distribution, Zoho vs internal ratio, SIT first-pass rate, delivery delay variance.
   - Contextual KRA employee evaluation accounting for complexity weights, business delay reasons, and scope changes rather than raw bug/task counts.

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Lucide React, CSS Design System
- **Backend:** FastAPI, Python 3.12, SQLAlchemy 2.0 (async), Pydantic v2
- **Database:** PostgreSQL (with automatic SQLite fallback for local developer setups) & Alembic migrations
- **Asynchronous & Jobs:** Redis, Celery worker structure, transactional outbox & email send jobs

---

## 16 Application Views

1. **Dashboard:** Portfolio KPI cards, quick actions, recent pipeline, active bug count.
2. **Change Requests:** Complete CR data grid, stage filter, search, detail modal with 7 tabs and stage timeline.
3. **Projects & Modules:** Project portfolio cards with module tags and active defect counts.
4. **Teams & Employees:** Organization directory, role titles, assigned tasks, and defect metrics.
5. **My Tasks:** Developer view with task cards, blockers, and progress updates.
6. **Development Board:** Multi-column Kanban board for developer tasks.
7. **SIT Testing:** Technical test cycles, executions, pass rate metrics, and SIT sign-off.
8. **Ready for UAT / Send SRN:** Multi-item selection data grid, consolidated SRN draft, same-thread email preview & send.
9. **SRN History:** Release documents, email provider message IDs, sent timestamps, recipients.
10. **UAT Testing:** Business acceptance gate, active UAT cycles, test executions, sign-off status.
11. **Bug Tracker:** Defect lifecycle board, visual defect timeline, resolve modal, and retest verification modal.
12. **Releases & Deployments:** Release trains, environment gates, deployment confirmation with build ID & evidence.
13. **Pending Approvals:** Deadline revision requests with Accept/Reject actions.
14. **Reports & Analytics:** Executive intelligence, status distribution bars, defect velocity breakdown.
15. **KRA & Performance:** Employee contribution cards, complexity weights, delivery variance, business reasons.
16. **Admin Settings:** Zoho CR synchronization trigger, SMTP email thread configuration.

---

## Running Locally

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
# Optional: alembic upgrade head (tables and rich seed data auto-initialize on startup)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

FastAPI docs: `http://localhost:8000/docs`.

### 2. Frontend

```powershell
cd frontend
npm install
npm run build
npm run start
```

Frontend app: `http://localhost:3000`.

---

## Automated Test Suite

```powershell
# Run backend pytest suite
cd backend
pytest

# Run frontend typecheck and production build
cd ..\frontend
npm run typecheck
npm run build
```


