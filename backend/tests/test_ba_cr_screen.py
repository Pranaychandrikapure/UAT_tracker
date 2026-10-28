import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.db.init_db import init_db
from app.main import app
from app.models import User, Project, ProjectModule, ModuleScreen
from app.db.session import SessionLocal
from sqlalchemy import select


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    import asyncio
    asyncio.run(init_db())


@pytest.mark.asyncio
async def test_ba_cr_creation_with_new_and_existing_screen():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create BA user and project with module
        async with SessionLocal() as db:
            ba = await db.scalar(select(User).where(User.role_title == "Business Analyst").limit(1))
            if not ba:
                ba = User(employee_code="BA-CR-TEST", email="ba.tester@neml.in", display_name="BA Tester", role_title="Business Analyst")
                db.add(ba)
                await db.commit()
                await db.refresh(ba)
            ba_id = str(ba.id)
            uid_str = uuid.uuid4().hex[:6]

            proj = Project(code=f"BA_PRJ_{uid_str}", name=f"BA Project {uid_str}", status="ACTIVE")
            db.add(proj)
            await db.flush()
            mod = ProjectModule(project_id=proj.id, code=f"MOD_{uid_str}", name="Settlement Module")
            db.add(mod)
            await db.commit()
            await db.refresh(proj)
            await db.refresh(mod)
            proj_id = str(proj.id)
            mod_id = str(mod.id)

        # BA creates CR with a NEW screen
        res_cr = await client.post(
            "/api/v1/change-requests",
            headers={"x-actor-id": ba_id},
            json={
                "project_id": proj_id,
                "title": "Add Instant Settlement Reconciliation Screen",
                "description": "Provide a dedicated view for settlement batches and clearing reconciliation",
                "business_justification": "Required for SEBI 2.0 intraday compliance",
                "priority": "HIGH",
                "impacted_module_ids": [mod_id],
                "screen_name": "Instant Settlement Reconciliation",
                "screen_type": "NEW",
            },
        )
        assert res_cr.status_code == 201, res_cr.text
        cr_data = res_cr.json()
        assert cr_data["screen_name"] == "Instant Settlement Reconciliation"
        assert cr_data["screen_type"] == "NEW"

        # Verify screen was auto-registered in module_screens!
        async with SessionLocal() as db:
            scr = await db.scalar(
                select(ModuleScreen).where(
                    ModuleScreen.module_id == mod.id,
                    ModuleScreen.name == "Instant Settlement Reconciliation"
                ).limit(1)
            )
            assert scr is not None
            assert scr.screen_type == "NEW"

        # Now BA creates another CR referencing the EXISTING screen
        res_cr2 = await client.post(
            "/api/v1/change-requests",
            headers={"x-actor-id": ba_id},
            json={
                "project_id": proj_id,
                "title": "Enhance Instant Settlement Reconciliation Screen Filters",
                "description": "Add multi-bank filter to settlement reconciliation view",
                "business_justification": "Operational enhancement",
                "priority": "NORMAL",
                "impacted_module_ids": [mod_id],
                "screen_name": "Instant Settlement Reconciliation",
                "screen_type": "EXISTING",
            },
        )
        assert res_cr2.status_code == 201
        assert res_cr2.json()["screen_name"] == "Instant Settlement Reconciliation"
        assert res_cr2.json()["screen_type"] == "EXISTING"
