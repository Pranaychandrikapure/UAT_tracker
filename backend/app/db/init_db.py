from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.models import (
    Department,
    Permission,
    Role,
    RolePermission,
)


async def init_db() -> None:
    schema = settings.database_schema or "tracker"
    connect_args = {}
    if "postgresql" in settings.database_url:
        connect_args["server_settings"] = {"search_path": schema}
    elif "sqlite" in settings.database_url:
        connect_args["check_same_thread"] = False

    init_engine = create_async_engine(settings.database_url, connect_args=connect_args)
    async with init_engine.begin() as conn:
        if "postgresql" in settings.database_url:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text(f'ALTER TABLE "{schema}".projects ADD COLUMN IF NOT EXISTS description TEXT DEFAULT \'\''))
                await conn.execute(text(f'ALTER TABLE "{schema}".users ADD COLUMN IF NOT EXISTS username VARCHAR(100)'))
                await conn.execute(text(f'ALTER TABLE "{schema}".users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)'))
                await conn.execute(text(f'ALTER TABLE "{schema}".email_messages ALTER COLUMN thread_id DROP NOT NULL'))
                await conn.execute(text(f'ALTER TABLE "{schema}".change_requests ADD COLUMN IF NOT EXISTS assigned_ba_id UUID'))
                await conn.execute(text(f'ALTER TABLE "{schema}".change_requests ADD COLUMN IF NOT EXISTS revert_reason TEXT'))
                await conn.execute(text(f'ALTER TABLE "{schema}".change_requests ADD COLUMN IF NOT EXISTS reverted_by_role VARCHAR(80)'))
                await conn.execute(text(f'ALTER TABLE "{schema}".change_requests ADD COLUMN IF NOT EXISTS reverted_by_user_id UUID'))
                await conn.execute(text(f'ALTER TABLE "{schema}".change_requests ADD COLUMN IF NOT EXISTS review_notes TEXT'))
                await conn.execute(text(f'ALTER TABLE "{schema}".change_requests ADD COLUMN IF NOT EXISTS management_review_status VARCHAR(32) DEFAULT \'PENDING\''))
            except Exception:
                pass
        else:
            await conn.run_sync(Base.metadata.create_all)

    from app.db.session import SessionLocal

    async with SessionLocal() as db:
        role_count = await db.scalar(select(Role.id).limit(1))
        if role_count is None:
            await seed_system_metadata(db)
        await ensure_admin_user(db)
    await init_engine.dispose()


async def seed_system_metadata(db: AsyncSession) -> None:
    """Seeds only fundamental structural metadata (departments, roles, permissions). No dummy/mock records."""
    # 1. Base Departments
    dept_eng = Department(code="ENG", name="Platform Engineering")
    dept_qa = Department(code="QA", name="Quality Assurance & Testing")
    dept_biz = Department(code="BIZ", name="Product & Business Analysis")
    db.add_all([dept_eng, dept_qa, dept_biz])
    await db.flush()

    # 2. System Roles (Pure schema foundation - zero dummy users)
    roles_dict = {
        "admin": Role(code="admin", name="System Administrator"),
        "ba": Role(code="ba", name="Business Analyst"),
        "pm": Role(code="pm", name="Project Manager"),
        "dev_lead": Role(code="dev_lead", name="Developer Lead"),
        "developer": Role(code="developer", name="Developer"),
        "uat_lead": Role(code="uat_lead", name="UAT Lead"),
        "uat_tester": Role(code="uat_tester", name="UAT Tester"),
        "management": Role(code="management", name="Senior Management"),
        "spm": Role(code="spm", name="Senior Project Manager"),
        "pl": Role(code="pl", name="Project Lead"),
        "ba_lead": Role(code="ba_lead", name="BA Lead"),
        "uat_manager": Role(code="uat_manager", name="UAT Manager"),
        "uat_member": Role(code="uat_member", name="UAT Member"),
    }
    for r in roles_dict.values():
        db.add(r)
    await db.flush()

    # 3. Permissions
    all_permission_codes = [
        "cr.create", "cr.view_all", "cr.submit", "cr.assign_pm", "cr.review_requirements",
        "cr.request_clarification", "cr.clarify", "cr.assess_impact", "cr.propose_deadline",
        "cr.approve_baseline", "cr.start_development", "cr.submit_code_review",
        "cr.approve_code_review", "cr.return_development", "cr.request_scope_change",
        "cr.approve_scope_change", "cr.hold", "cr.resume", "cr.business_accept",
        "cr.close", "cr.reopen", "cr.cancel", "cr.reject",
        "task.manage", "task.update", "sit.execute", "sit.signoff", "sit.fail",
        "srn.create", "srn.send", "deployment.manage", "deployment.confirm",
        "uat.accept_handoff", "uat.execute", "uat.signoff", "uat.return_for_fix", "uat.hold",
        "defect.manage", "defect.fix", "defect.verify", "reports.view", "kra.view_all",
    ]
    perms_objs = {}
    for code in all_permission_codes:
        p = Permission(code=code, description=f"Permission to {code}")
        db.add(p)
        perms_objs[code] = p
    await db.flush()

    # Role Permissions
    for p in perms_objs.values():
        db.add(RolePermission(role_id=roles_dict["admin"].id, permission_id=p.id))

    for code in ["cr.view_all", "cr.assign_pm", "cr.assess_impact", "cr.propose_deadline", "cr.approve_baseline", "cr.start_development", "task.manage", "srn.create", "srn.send", "deployment.confirm", "reports.view"]:
        db.add(RolePermission(role_id=roles_dict["pm"].id, permission_id=perms_objs[code].id))
    for code in ["cr.create", "cr.view_all", "cr.submit", "cr.clarify", "cr.approve_baseline", "cr.business_accept", "reports.view"]:
        db.add(RolePermission(role_id=roles_dict["ba"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "task.manage", "task.update", "sit.execute", "sit.signoff", "defect.manage", "defect.fix", "srn.create"]:
        db.add(RolePermission(role_id=roles_dict["dev_lead"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "task.update", "sit.execute", "defect.fix", "srn.create"]:
        db.add(RolePermission(role_id=roles_dict["developer"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "uat.accept_handoff", "uat.execute", "uat.signoff", "uat.return_for_fix", "uat.hold", "defect.manage", "defect.verify"]:
        db.add(RolePermission(role_id=roles_dict["uat_lead"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "uat.execute", "uat.hold", "defect.manage", "defect.verify"]:
        db.add(RolePermission(role_id=roles_dict["uat_tester"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "reports.view", "kra.view_all"]:
        db.add(RolePermission(role_id=roles_dict["management"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "cr.assign_pm", "cr.assess_impact", "cr.approve_baseline", "cr.start_development", "task.manage", "srn.create", "srn.send", "deployment.confirm", "reports.view", "kra.view_all"]:
        db.add(RolePermission(role_id=roles_dict["spm"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "task.manage", "task.update", "sit.execute", "sit.signoff", "defect.manage", "defect.fix", "srn.create"]:
        db.add(RolePermission(role_id=roles_dict["pl"].id, permission_id=perms_objs[code].id))
    for code in ["cr.create", "cr.view_all", "cr.submit", "cr.clarify", "cr.approve_baseline", "cr.business_accept", "reports.view"]:
        db.add(RolePermission(role_id=roles_dict["ba_lead"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "uat.accept_handoff", "uat.execute", "uat.signoff", "uat.return_for_fix", "uat.hold", "defect.manage", "defect.verify", "reports.view"]:
        db.add(RolePermission(role_id=roles_dict["uat_manager"].id, permission_id=perms_objs[code].id))
    for code in ["cr.view_all", "uat.execute", "uat.hold", "defect.manage", "defect.verify"]:
        db.add(RolePermission(role_id=roles_dict["uat_member"].id, permission_id=perms_objs[code].id))

    await db.commit()


async def ensure_admin_user(db: AsyncSession) -> None:
    """Ensures at least one System Administrator exists with local credentials for password authentication."""
    from app.core.security import hash_password
    from app.models import User, UserRoleAssignment

    # Search for an existing admin user
    admin_user = await db.scalar(
        select(User).where(
            (User.role_title == "System Administrator") |
            (User.username == settings.admin_username) |
            (User.email == settings.admin_email)
        ).limit(1)
    )

    admin_role = await db.scalar(select(Role).where(Role.code == "admin"))

    if not admin_user:
        hashed = hash_password(settings.admin_password)
        admin_user = User(
            employee_code="ADM-001",
            username=settings.admin_username,
            email=settings.admin_email,
            display_name="System Administrator",
            role_title="System Administrator",
            password_hash=hashed,
            auth_provider="LOCAL_CREDENTIALS",
            is_active=True,
        )
        db.add(admin_user)
        await db.flush()

        if admin_role:
            db.add(UserRoleAssignment(user_id=admin_user.id, role_id=admin_role.id))
        await db.commit()
    else:
        # Guarantee username and password_hash exist for the admin
        changed = False
        if not admin_user.username:
            admin_user.username = settings.admin_username
            changed = True
        if not admin_user.password_hash:
            admin_user.password_hash = hash_password(settings.admin_password)
            changed = True
        if admin_user.role_title != "System Administrator":
            admin_user.role_title = "System Administrator"
            changed = True
        if admin_role:
            has_assignment = await db.scalar(
                select(UserRoleAssignment.id).where(
                    UserRoleAssignment.user_id == admin_user.id,
                    UserRoleAssignment.role_id == admin_role.id
                ).limit(1)
            )
            if not has_assignment:
                db.add(UserRoleAssignment(user_id=admin_user.id, role_id=admin_role.id))
                changed = True
        if changed:
            await db.commit()

