import io
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models import (
    ChangeRequest,
    CRActivity,
    CRAttachment,
    CRDiscussion,
    DevTask,
    ModuleScreen,
    Project,
    ProjectMember,
    ProjectModule,
    User,
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    import asyncio
    asyncio.run(init_db())


@pytest.mark.asyncio
async def test_full_cr_governance_and_assignment_lifecycle():
    uid = uuid.uuid4().hex[:6]
    async with SessionLocal() as db:
        # Create users for all relevant roles
        admin = User(employee_code=f"ADM-{uid}", email=f"adm.{uid}@neml.in", display_name=f"Admin {uid}", role_title="System Administrator")
        ba_lead = User(employee_code=f"BAL-{uid}", email=f"bal.{uid}@neml.in", display_name=f"BA Lead {uid}", role_title="BA Lead")
        ba_project = User(employee_code=f"BA-{uid}", email=f"ba.{uid}@neml.in", display_name=f"Project BA {uid}", role_title="Business Analyst")
        pl = User(employee_code=f"PL-{uid}", email=f"pl.{uid}@neml.in", display_name=f"Project Lead {uid}", role_title="Project Lead")
        pm = User(employee_code=f"PM-{uid}", email=f"pm.{uid}@neml.in", display_name=f"Project Manager {uid}", role_title="Project Manager")
        spm = User(employee_code=f"SPM-{uid}", email=f"spm.{uid}@neml.in", display_name=f"Senior PM {uid}", role_title="Senior Project Manager")
        dev1 = User(employee_code=f"DEV1-{uid}", email=f"dev1.{uid}@neml.in", display_name=f"Dev One {uid}", role_title="Developer")
        dev2 = User(employee_code=f"DEV2-{uid}", email=f"dev2.{uid}@neml.in", display_name=f"Dev Two {uid}", role_title="Developer")

        # Project with module
        project = Project(code=f"GOV_PRJ_{uid}", name=f"Gov Project {uid}", status="ACTIVE")
        db.add_all([admin, ba_lead, ba_project, pl, pm, spm, dev1, dev2, project])
        await db.commit()

        # Map BA and PL to project
        db.add_all([
            ProjectMember(project_id=project.id, user_id=ba_project.id),
            ProjectMember(project_id=project.id, user_id=pl.id),
        ])
        module = ProjectModule(project_id=project.id, code=f"MOD_{uid}", name="Settlement Core")
        db.add(module)
        await db.commit()

        admin_id = str(admin.id)
        ba_lead_id = str(ba_lead.id)
        ba_proj_id = str(ba_project.id)
        pl_id = str(pl.id)
        pm_id = str(pm.id)
        spm_id = str(spm.id)
        dev1_id = str(dev1.id)
        dev2_id = str(dev2.id)
        project_id = str(project.id)
        module_id = str(module.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Developer cannot fetch Zoho CR or create CR
        dev_zoho = await client.post("/api/v1/zoho/fetch", headers={"x-actor-id": dev1_id})
        assert dev_zoho.status_code == 403

        dev_create = await client.post(
            "/api/v1/change-requests",
            headers={"x-actor-id": dev1_id},
            json={"project_id": project_id, "title": "Dev trying to author CR", "description": "Not allowed per security policy"},
        )
        assert dev_create.status_code == 403

        # 2. Admin or BA can fetch from Zoho -> assigned to project BA
        zoho_fetch = await client.post("/api/v1/zoho/fetch", headers={"x-actor-id": admin_id})
        assert zoho_fetch.status_code == 200
        assert zoho_fetch.json()["status"] == "SUCCESS"

        # 3. BA Lead creates internal CR -> automatically routed to mapped project BA
        cr_res = await client.post(
            "/api/v1/change-requests",
            headers={"x-actor-id": ba_lead_id},
            json={
                "project_id": project_id,
                "title": f"KYC Onboarding Realtime Batch {uid}",
                "description": "Automate verification with external regulatory gateway",
                "priority": "HIGH",
            },
        )
        assert cr_res.status_code == 201
        cr_data = cr_res.json()
        cr_id = cr_data["id"]
        assert cr_data["status"] == "PENDING_BA_VERIFICATION"
        assert cr_data["assigned_ba_id"] == ba_proj_id

        # 4. Attachments (Upload file + Link URL)
        fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRfake_wireframe_data")
        att_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/attachments/upload",
            headers={"x-actor-id": ba_proj_id},
            files={"file": ("wireframe.png", fake_png, "image/png")},
            data={"note": "UI/UX Figma export for KYC form"},
        )
        assert att_res.status_code == 200
        assert att_res.json()["file_type"] == "UPLOAD"

        link_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/attachments/link",
            headers={"x-actor-id": ba_proj_id},
            json={
                "original_name": "Regulatory Circular Reference",
                "file_url": "https://gov.in/circulars/kyc-2026.pdf",
                "note": "Official guidelines",
            },
        )
        assert link_res.status_code == 200
        assert link_res.json()["file_type"] == "EXTERNAL_LINK"

        # 5. BA Verification: First test revert with reason
        revert_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/ba-verify",
            headers={"x-actor-id": ba_proj_id},
            json={"action": "REVERT", "revert_note": "Missing stakeholder business impact notes"},
        )
        assert revert_res.status_code == 200
        assert revert_res.json()["action"] == "REVERTED"

        # 6. BA Verification: Forward with enriched details (deadline, module, new screen, PL assignment)
        verify_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/ba-verify",
            headers={"x-actor-id": ba_proj_id},
            json={
                "action": "FORWARD",
                "requested_deadline": "2026-11-30",
                "impacted_module_ids": [module_id],
                "screen_name": f"Aadhaar Vault Screen {uid}",
                "screen_type": "NEW",
                "priority": "CRITICAL",
                "remarks": "High priority delivery requested by Compliance team",
                "assigned_pl_ids": [pl_id],
            },
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["action"] == "FORWARDED"
        assert verify_res.json()["cr_status"] == "PENDING_PL_REVIEW"

        # 7. Project Lead Review:
        # PL can pass to SPM / PM
        pl_review_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/pl-review",
            headers={"x-actor-id": pl_id},
            json={
                "action": "PASS_TO_MANAGEMENT",
                "remarks": "Technical feasibility confirmed. Passing to SPM/PM for baseline budget approval.",
                "target_pm_id": pm_id,
                "target_spm_id": spm_id,
            },
        )
        assert pl_review_res.status_code == 200
        assert pl_review_res.json()["cr_status"] == "PENDING_MANAGEMENT_REVIEW"

        # 8. Management Review (SPM / PM):
        # PM requests changes back to PL
        mgmt_changes_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/management-review",
            headers={"x-actor-id": pm_id},
            json={"action": "REQUEST_CHANGES", "remarks": "Please provide buffer for integration testing"},
        )
        assert mgmt_changes_res.status_code == 200
        assert mgmt_changes_res.json()["cr_status"] == "CHANGES_REQUESTED_BY_MANAGEMENT"

        # PL resolves management changes and resubmits to SPM/PM
        pl_resolve_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/pl-handle-management-changes",
            headers={"x-actor-id": pl_id},
            json={"action": "RESOLVED", "remarks": "Added 3-day buffer to schedule. Ready for sign-off."},
        )
        assert pl_resolve_res.status_code == 200
        assert pl_resolve_res.json()["cr_status"] == "PENDING_MANAGEMENT_REVIEW"

        # SPM approves
        mgmt_appr_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/management-review",
            headers={"x-actor-id": spm_id},
            json={"action": "APPROVE", "remarks": "Executive approval granted by Senior PM."},
        )
        assert mgmt_appr_res.status_code == 200
        assert mgmt_appr_res.json()["cr_status"] == "APPROVED_BY_MANAGEMENT"

        # 9. Developer Assignment (Modular screens to different developers)
        assign_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/assign-developers",
            headers={"x-actor-id": pm_id},
            json={
                "mode": "MODULAR_SCREENS",
                "modular_assignments": [
                    {
                        "module_id": module_id,
                        "screen_name": f"Aadhaar Vault Screen {uid}",
                        "developer_id": dev1_id,
                        "title": "Backend Vault Encryption Service",
                        "estimated_hours": 16.0,
                    },
                    {
                        "module_id": module_id,
                        "screen_name": f"Aadhaar Vault Screen {uid}",
                        "developer_id": dev2_id,
                        "title": "Frontend Verification UI & Consent",
                        "estimated_hours": 12.0,
                    },
                ],
            },
        )
        assert assign_res.status_code == 200
        assert assign_res.json()["cr_status"] == "DEVELOPMENT"
        assert len(assign_res.json()["created_tasks"]) == 2

        # 10. Developer Discussion & Escalation Protocol
        # Developer raises concern
        disc_res = await client.post(
            f"/api/v1/change-requests/{cr_id}/discussions",
            headers={"x-actor-id": dev1_id},
            json={
                "title": "Hardware HSM API latency issue",
                "concern_text": "Sandbox HSM endpoint taking 4.2 seconds to respond; exceeds SEBI latency limit.",
                "priority": "HIGH",
            },
        )
        assert disc_res.status_code == 200
        disc_data = disc_res.json()
        disc_id = disc_data["id"]
        assert disc_data["current_level"] == "PM"
        assert disc_data["status"] == "OPEN"

        # PM cannot resolve -> escalates to SPM
        esc_spm = await client.post(
            f"/api/v1/change-requests/discussions/{disc_id}/escalate",
            headers={"x-actor-id": pm_id},
            json={"escalation_remark": "Requires infrastructure budget upgrade from SPM for dedicated leased line."},
        )
        assert esc_spm.status_code == 200
        assert esc_spm.json()["current_level"] == "SPM"

        # SPM cannot resolve -> escalates to PL
        esc_pl = await client.post(
            f"/api/v1/change-requests/discussions/{disc_id}/escalate",
            headers={"x-actor-id": spm_id},
            json={"escalation_remark": "Check if async queue architecture can decouple immediate response."},
        )
        assert esc_pl.status_code == 200
        assert esc_pl.json()["current_level"] == "PL"

        # PL cannot resolve -> escalates to BA
        esc_ba = await client.post(
            f"/api/v1/change-requests/discussions/{disc_id}/escalate",
            headers={"x-actor-id": pl_id},
            json={"escalation_remark": "Consult Business team if asynchronous callback token is acceptable."},
        )
        assert esc_ba.status_code == 200
        assert esc_ba.json()["current_level"] == "BA"

        # BA resolves the concern
        resolve_res = await client.post(
            f"/api/v1/change-requests/discussions/{disc_id}/resolve",
            headers={"x-actor-id": ba_proj_id},
            json={"resolution_notes": "Business confirmed asynchronous webhook pattern with polling token is fully acceptable."},
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "RESOLVED"

        # 11. Activity Audit Table Verification
        act_res = await client.get(f"/api/v1/change-requests/{cr_id}/activities")
        assert act_res.status_code == 200
        activities = act_res.json()
        assert len(activities) >= 8

        event_types = [a["event_type"] for a in activities]
        assert "CR_CREATED_INTERNAL" in event_types
        assert "ATTACHMENT_UPLOAD" in event_types
        assert "ATTACHMENT_LINK" in event_types
        assert "BA_REVERT" in event_types
        assert "BA_VERIFY_AND_FORWARD" in event_types
        assert "PL_PASS_TO_MANAGEMENT" in event_types
        assert "MANAGEMENT_REQUEST_CHANGES" in event_types
        assert "MANAGEMENT_APPROVE" in event_types
        assert "DEV_ASSIGNMENT_MODULAR" in event_types
        assert "DEV_CONCERN_RAISED" in event_types
        assert "DEV_CONCERN_ESCALATED" in event_types
        assert "DEV_CONCERN_RESOLVED" in event_types

        # 12. Full CR Detail check
        detail_res = await client.get(f"/api/v1/change-requests/{cr_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert len(detail["attachments"]) >= 2
        assert len(detail["discussions"]) >= 1
        assert len(detail["activities"]) >= 8

