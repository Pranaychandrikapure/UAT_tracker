import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.db.init_db import init_db
from app.main import app
from app.models import User, Role, UserRoleAssignment
from app.db.session import SessionLocal
from sqlalchemy import select


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    import asyncio
    asyncio.run(init_db())


@pytest.mark.asyncio
async def test_project_module_screen_crud_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get or create admin user for x-actor-id
        async with SessionLocal() as db:
            admin_user = await db.scalar(select(User).where(User.role_title == "System Administrator").limit(1))
            admin_id = str(admin_user.id)

        # 1. Admin creates a project
        proj_code = "TEST_TRADE_01"
        res = await client.post(
            "/api/v1/projects",
            headers={"x-actor-id": admin_id},
            json={
                "code": proj_code,
                "name": "Trade Platform Modernization",
                "description": "Enterprise trading platform next-gen engine",
                "status": "ACTIVE",
            },
        )
        assert res.status_code == 201, res.text
        proj_data = res.json()
        proj_id = proj_data["id"]
        assert proj_data["code"] == proj_code

        # 2. Update the project
        res_update = await client.patch(
            f"/api/v1/projects/{proj_id}",
            headers={"x-actor-id": admin_id},
            json={"name": "Trade Platform Modernization V2"},
        )
        assert res_update.status_code == 200
        assert res_update.json()["name"] == "Trade Platform Modernization V2"

        # 3. Add a module to the project
        mod_res = await client.post(
            f"/api/v1/projects/{proj_id}/modules",
            headers={"x-actor-id": admin_id},
            json={
                "code": "AUCTION_MOD",
                "name": "E-Auction Engine",
                "description": "High frequency reverse & forward auctions",
            },
        )
        assert mod_res.status_code == 201, mod_res.text
        mod_data = mod_res.json()
        mod_id = mod_data["id"]

        # 4. Update the module
        mod_update_res = await client.patch(
            f"/api/v1/projects/modules/{mod_id}",
            headers={"x-actor-id": admin_id},
            json={"name": "E-Auction Realtime Engine"},
        )
        assert mod_update_res.status_code == 200
        assert mod_update_res.json()["name"] == "E-Auction Realtime Engine"

        # 5. Add screen / functionality to the module
        scr_res = await client.post(
            f"/api/v1/projects/modules/{mod_id}/screens",
            headers={"x-actor-id": admin_id},
            json={
                "code": "LOT_SCHEDULE",
                "name": "Auction Lot Scheduling",
                "description": "Configure lot timings and auction rounds",
                "screen_type": "EXISTING",
            },
        )
        assert scr_res.status_code == 201, scr_res.text
        scr_data = scr_res.json()
        scr_id = scr_data["id"]

        # 6. Update the screen
        scr_update_res = await client.patch(
            f"/api/v1/projects/screens/{scr_id}",
            headers={"x-actor-id": admin_id},
            json={"description": "Updated lot schedule description"},
        )
        assert scr_update_res.status_code == 200
        assert scr_update_res.json()["description"] == "Updated lot schedule description"

        # 7. List projects and verify nested structure
        list_res = await client.get("/api/v1/projects")
        assert list_res.status_code == 200
        projects_list = list_res.json()
        target_proj = next((p for p in projects_list if p["id"] == proj_id), None)
        assert target_proj is not None
        assert len(target_proj["modules"]) >= 1
        target_mod = next((m for m in target_proj["modules"] if m["id"] == mod_id), None)
        assert target_mod is not None
        assert len(target_mod["screens"]) >= 1
        assert target_mod["screens"][0]["name"] == "Auction Lot Scheduling"

        # 8. Delete screen
        del_scr_res = await client.delete(f"/api/v1/projects/screens/{scr_id}", headers={"x-actor-id": admin_id})
        assert del_scr_res.status_code == 200

        # 9. Delete module
        del_mod_res = await client.delete(f"/api/v1/projects/modules/{mod_id}", headers={"x-actor-id": admin_id})
        assert del_mod_res.status_code == 200

        # 10. Delete project
        del_proj_res = await client.delete(f"/api/v1/projects/{proj_id}", headers={"x-actor-id": admin_id})
        assert del_proj_res.status_code == 200


@pytest.mark.asyncio
async def test_project_management_role_permissions():
    """Verify that SPM, PM, PL can manage, while Developer cannot."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create or fetch users with specific roles
        uid = uuid.uuid4().hex[:6]
        async with SessionLocal() as db:
            pm = User(employee_code=f"PM-{uid}", email=f"pm.{uid}@neml.in", display_name="Test PM", role_title="Project Manager")
            dev = User(employee_code=f"DEV-{uid}", email=f"dev.{uid}@neml.in", display_name="Test Dev", role_title="Developer")
            db.add_all([pm, dev])
            await db.commit()
            await db.refresh(pm)
            await db.refresh(dev)
            pm_id = str(pm.id)
            dev_id = str(dev.id)

        # PM can create a project
        res_pm = await client.post(
            "/api/v1/projects",
            headers={"x-actor-id": pm_id},
            json={"code": f"PM_PROJ_{uid}", "name": "PM Project", "description": "PM Project Desc"},
        )
        assert res_pm.status_code == 201
        created_p_id = res_pm.json()["id"]

        # Developer CANNOT create a project (403 Forbidden)
        res_dev = await client.post(
            "/api/v1/projects",
            headers={"x-actor-id": dev_id},
            json={"code": f"DEV_PROJ_{uid}", "name": "Dev Project"},
        )
        assert res_dev.status_code == 403
        assert "Hierarchy Permission Denied" in res_dev.json()["detail"]

        # Clean up
        await client.delete(f"/api/v1/projects/{created_p_id}", headers={"x-actor-id": pm_id})
