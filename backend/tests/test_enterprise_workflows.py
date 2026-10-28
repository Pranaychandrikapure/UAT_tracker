import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models import (
    ChangeRequest,
    Defect,
    Deployment,
    DevTask,
    EmailMessage,
    EmailThread,
    Release,
    ScopeChangeProposal,
    User,
)
from app.services.cr_workflow import InvalidDefectTransition, InvalidTaskTransition, validate_defect_transition, validate_task_transition
from app.services.deployment_service import confirm_uat_deployment
from app.services.email_service import send_srn_email
from app.services.srn_service import generate_srn_draft, get_ready_for_uat_items
from app.services.zoho_service import ingest_zoho_change_request


from httpx import ASGITransport, AsyncClient


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    import asyncio
    asyncio.run(init_db())


@pytest.mark.asyncio
async def test_api_routes_health_and_users():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        users_res = await client.get("/api/v1/users")
        assert users_res.status_code == 200
        data = users_res.json()
        assert len(data) >= 1
        usernames = [u["display_name"] for u in data]
        assert "System Administrator" in usernames


@pytest.mark.asyncio
async def test_change_requests_list_and_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/change-requests")
        assert res.status_code == 200
        payload = res.json()
        assert "items" in payload
        assert "total" in payload
        if payload["items"]:
            first_cr = payload["items"][0]
            detail_res = await client.get(f"/api/v1/change-requests/{first_cr['id']}")
            assert detail_res.status_code == 200
            detail = detail_res.json()
            assert detail["id"] == first_cr["id"]


def test_task_transition_rules():
    # Valid transitions
    validate_task_transition("TODO", "IN_PROGRESS")
    validate_task_transition("IN_PROGRESS", "READY_FOR_SIT")
    validate_task_transition("READY_FOR_SIT", "SIT_IN_PROGRESS")
    validate_task_transition("SIT_IN_PROGRESS", "SIT_PASSED")
    validate_task_transition("SIT_PASSED", "DEVELOPMENT_COMPLETE")

    # Invalid jump
    with pytest.raises(InvalidTaskTransition):
        validate_task_transition("TODO", "DEVELOPMENT_COMPLETE")


def test_defect_transition_rules():
    # Valid transitions
    validate_defect_transition("OPEN", "ASSIGNED")
    validate_defect_transition("ASSIGNED", "IN_PROGRESS")
    validate_defect_transition("IN_PROGRESS", "FIXED")
    validate_defect_transition("FIXED", "SIT_IN_PROGRESS")
    validate_defect_transition("SIT_IN_PROGRESS", "SIT_PASSED")
    validate_defect_transition("SIT_PASSED", "READY_FOR_UAT_DEPLOYMENT")
    validate_defect_transition("READY_FOR_UAT_DEPLOYMENT", "SRN_SENT")
    validate_defect_transition("SRN_SENT", "UAT_DEPLOYED")
    validate_defect_transition("UAT_DEPLOYED", "READY_FOR_RETEST")
    validate_defect_transition("READY_FOR_RETEST", "VERIFIED")
    validate_defect_transition("VERIFIED", "CLOSED")

    # Invalid jump: developer cannot mark defect directly from FIXED to UAT_DEPLOYED or CLOSED
    with pytest.raises(InvalidDefectTransition):
        validate_defect_transition("FIXED", "CLOSED")

    with pytest.raises(InvalidDefectTransition):
        validate_defect_transition("FIXED", "UAT_DEPLOYED")


@pytest.mark.asyncio
async def test_zoho_ingestion_and_scope_preservation():
    unique_external_id = f"ZH-TEST-{uuid.uuid4().hex[:6]}"
    async with SessionLocal() as db:
        # Ingest new CR
        res = await ingest_zoho_change_request(
            db=db,
            external_record_id=unique_external_id,
            title="Biometric KYC API Integration",
            description="Integration with biometric hardware SDK",
            project_code="ONBOARDING",
            external_owner_name="Zoho Owner Rajesh",
        )
        assert res["action"] == "CREATED"
        cr_id = uuid.UUID(res["cr_id"])

        # Advance CR to SCOPE_APPROVED
        cr = await db.get(ChangeRequest, cr_id)
        cr.status = "SCOPE_APPROVED"
        await db.commit()

        # Ingest update from Zoho after scope is approved: MUST NOT overwrite approved scope!
        res_update = await ingest_zoho_change_request(
            db=db,
            external_record_id=unique_external_id,
            title="Biometric KYC API Integration (Updated Scope)",
            description="Add iris scan support in addition to fingerprinting",
            project_code="ONBOARDING",
            external_owner_name="Zoho Owner Rajesh",
        )
        assert res_update["action"] == "SCOPE_CHANGE_PROPOSED"
        assert "Existing approved scope was preserved" in res_update["message"]

        # Verify a ScopeChangeProposal was created
        proposal = await db.scalar(
            select(ScopeChangeProposal).where(ScopeChangeProposal.cr_id == cr.id)
        )
        assert proposal is not None
        assert "iris scan" in proposal.description
        assert cr.status == "SCOPE_APPROVED"  # untouched!


@pytest.mark.asyncio
async def test_ready_for_uat_and_srn_generation():
    async with SessionLocal() as db:
        actor = await db.scalar(select(User).limit(1))
        cr = await db.scalar(select(ChangeRequest).limit(1))

        # Create an eligible defect with READY_FOR_UAT_DEPLOYMENT
        test_bug = Defect(
            bug_number=f"BUG-T{uuid.uuid4().hex[:4]}",
            cr_id=cr.id,
            title="Test defect ready for UAT",
            description="Testing SRN selection",
            severity="MAJOR",
            priority="HIGH",
            status="READY_FOR_UAT_DEPLOYMENT",
            assigned_developer_id=actor.id,
            reporter_user_id=actor.id,
        )
        db.add(test_bug)
        await db.commit()
        await db.refresh(test_bug)

        # Check ready for UAT items
        ready_items = await get_ready_for_uat_items(db)
        assert len(ready_items) >= 1

        bug_items = [it for it in ready_items if it["id"] == str(test_bug.id)]
        assert len(bug_items) == 1
        target_bug = bug_items[0]

        # Generate SRN Draft
        draft = await generate_srn_draft(
            db=db,
            selected_items=[{"id": target_bug["id"], "item_type": target_bug["item_type"]}],
            actor_id=actor.id,
            release_version="v2.15.0",
        )
        assert draft["status"] == "DRAFT"
        assert "software release note" in draft["rendered_email_body"].lower()
        assert draft["srn_number"].startswith("SRN-")
        srn_id = draft["srn_id"]

        # Send SRN
        send_res = await send_srn_email(
            db=db,
            srn_id=srn_id,
            actor_id=actor.id,
        )
        assert send_res["status"] == "SENT"
        assert send_res["provider_message_id"] is not None

        # Critical Business Rule Check:
        # After SRN is sent, defect status MUST be SRN_SENT, NOT UAT_DEPLOYED!
        bug = await db.get(Defect, uuid.UUID(target_bug["id"]))
        assert bug.status == "SRN_SENT"
        assert bug.uat_deployed_at is None


@pytest.mark.asyncio
async def test_deployment_confirmation_transitions_bug_to_uat_deployed():
    async with SessionLocal() as db:
        actor = await db.scalar(select(User).limit(1))
        rel = await db.scalar(select(Release).where(Release.status == "PLANNED").limit(1))
        if not rel:
            rel = Release(
                release_number=f"REL-TEST-{uuid.uuid4().hex[:4]}",
                version="v2.99.0",
                title="Test Release",
                environment="UAT",
                status="PLANNED",
            )
            db.add(rel)
            await db.flush()

        dep = await db.scalar(select(Deployment).where(Deployment.release_id == rel.id).limit(1))
        if not dep:
            dep = Deployment(
                release_id=rel.id,
                environment="UAT",
                deployment_owner_id=actor.id,
                status="PENDING",
            )
            db.add(dep)
            await db.commit()
            await db.refresh(dep)

        # Confirm deployment
        confirm_res = await confirm_uat_deployment(
            db=db,
            deployment_id=dep.id,
            actor_id=actor.id,
            evidence="Kubernetes deployment roll-out status succeeded",
            build_identifier="build-20261027.99",
        )
        assert confirm_res["status"] == "CONFIRMED"

        # Verify deployment and release statuses
        await db.refresh(dep)
        await db.refresh(rel)
        assert dep.status == "CONFIRMED"
        assert rel.status == "DEPLOYED"
