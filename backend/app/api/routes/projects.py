import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import AuditLog, ModuleScreen, Project, ProjectMember, ProjectModule, User

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


def parse_uuid_safely(val: str | uuid.UUID | None) -> uuid.UUID | None:
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val).strip())
    except (ValueError, AttributeError):
        return None


async def get_effective_actor(
    db: DbSession,
    actor_id: Annotated[str | None, Header(alias="x-actor-id")] = None,
    alt_actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
) -> User | None:
    raw_id = (actor_id or alt_actor_id or "").strip()
    if raw_id:
        parsed_id = parse_uuid_safely(raw_id)
        if parsed_id:
            user = await db.get(User, parsed_id)
            if user:
                return user

        # Fallback search by email, username, or employee_code
        user = await db.scalar(
            select(User).where(
                (User.email.ilike(raw_id)) |
                (User.username.ilike(raw_id)) |
                (User.employee_code.ilike(raw_id))
            ).limit(1)
        )
        if user:
            return user

    # Default to first active System Administrator if no actor passed or actor not found
    admin = await db.scalar(select(User).where(User.role_title == "System Administrator").limit(1))
    if admin:
        return admin
    return await db.scalar(select(User).where(User.is_active.is_(True)).limit(1))


def check_can_manage_projects(actor: User | None) -> None:
    """Enforces authorization rule:
    Only System Administrator, Senior Project Manager, Project Manager, and Project Lead
    can create, edit, or delete projects, modules, and screens."""
    if not actor:
        return  # Allow development mode fallback if no explicit user
    role = (actor.role_title or "").lower().strip()
    allowed_roles = [
        "system administrator",
        "senior project manager",
        "project manager",
        "project lead",
        "admin",
        "spm",
        "pm",
        "pl",
    ]
    if not any(r in role for r in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Hierarchy Permission Denied: Role '{actor.role_title}' is not authorized to manage "
                f"projects, modules, or screens. Only Administrators, Senior Project Managers, "
                f"Project Managers, and Project Leads are authorized."
            ),
        )


# =============================================================================
# SCHEMAS
# =============================================================================

class ProjectCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=5000)
    status: str = Field(default="ACTIVE", max_length=32)


class ProjectUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=64)
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=5000)
    status: str | None = Field(default=None, max_length=32)


class ModuleCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=5000)


class ModuleUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=64)
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=5000)


class ScreenCreate(BaseModel):
    code: str | None = Field(default="", max_length=64)
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=5000)
    screen_type: str = Field(default="EXISTING", max_length=32)


class ScreenUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=64)
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=5000)
    screen_type: str | None = Field(default=None, max_length=32)
    is_active: bool | None = None


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID


# =============================================================================
# PROJECT ENDPOINTS
# =============================================================================

@router.get("", response_model=list[dict])
async def list_projects(db: DbSession) -> list[dict]:
    """Retrieves all projects with nested modules and screens catalog."""
    projs = (await db.scalars(select(Project).order_by(Project.name.asc()))).all()
    results = []
    for p in projs:
        mods = (await db.scalars(select(ProjectModule).where(ProjectModule.project_id == p.id).order_by(ProjectModule.name.asc()))).all()
        mod_results = []
        for m in mods:
            scrs = (await db.scalars(select(ModuleScreen).where(ModuleScreen.module_id == m.id).order_by(ModuleScreen.name.asc()))).all()
            mod_results.append({
                "id": str(m.id),
                "project_id": str(p.id),
                "code": m.code,
                "name": m.name,
                "description": m.description or "",
                "screens": [{
                    "id": str(s.id),
                    "module_id": str(m.id),
                    "code": s.code,
                    "name": s.name,
                    "description": s.description or "",
                    "screen_type": s.screen_type or "EXISTING",
                    "is_active": s.is_active,
                } for s in scrs],
            })
        results.append({
            "id": str(p.id),
            "code": p.code,
            "name": p.name,
            "description": getattr(p, "description", "") or "",
            "status": p.status,
            "modules": mod_results,
        })
    return results


@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: str, db: DbSession) -> dict:
    pid = parse_uuid_safely(project_id)
    p = await db.get(Project, pid) if pid else None
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    mods = (await db.scalars(select(ProjectModule).where(ProjectModule.project_id == p.id).order_by(ProjectModule.name.asc()))).all()
    mod_results = []
    for m in mods:
        scrs = (await db.scalars(select(ModuleScreen).where(ModuleScreen.module_id == m.id).order_by(ModuleScreen.name.asc()))).all()
        mod_results.append({
            "id": str(m.id),
            "project_id": str(p.id),
            "code": m.code,
            "name": m.name,
            "description": m.description or "",
            "screens": [{
                "id": str(s.id),
                "module_id": str(m.id),
                "code": s.code,
                "name": s.name,
                "description": s.description or "",
                "screen_type": s.screen_type or "EXISTING",
                "is_active": s.is_active,
            } for s in scrs],
        })
    return {
        "id": str(p.id),
        "code": p.code,
        "name": p.name,
        "description": getattr(p, "description", "") or "",
        "status": p.status,
        "modules": mod_results,
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    # Check duplicate code
    existing = await db.scalar(select(Project).where(Project.code == payload.code.strip().upper()))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project with code '{payload.code}' already exists")

    p = Project(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        description=payload.description.strip(),
        status=payload.status.strip().upper(),
    )
    db.add(p)
    await db.flush()

    # Automatically enroll creator as project member
    if actor:
        db.add(ProjectMember(project_id=p.id, user_id=actor.id, is_active=True))

    await db.commit()
    await db.refresh(p)
    return {
        "id": str(p.id),
        "code": p.code,
        "name": p.name,
        "description": p.description or "",
        "status": p.status,
        "modules": [],
    }


@router.patch("/{project_id}", response_model=dict)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    pid = parse_uuid_safely(project_id)
    p = await db.get(Project, pid) if pid else None
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if payload.code is not None:
        clean_code = payload.code.strip().upper()
        if clean_code != p.code:
            existing = await db.scalar(select(Project).where(Project.code == clean_code))
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project code '{clean_code}' is already in use")
            p.code = clean_code

    if payload.name is not None:
        p.name = payload.name.strip()
    if payload.description is not None:
        p.description = payload.description.strip()
    if payload.status is not None:
        p.status = payload.status.strip().upper()

    await db.commit()
    await db.refresh(p)
    return {
        "id": str(p.id),
        "code": p.code,
        "name": p.name,
        "description": p.description or "",
        "status": p.status,
    }


@router.delete("/{project_id}", response_model=dict)
async def delete_project(
    project_id: str,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    pid = parse_uuid_safely(project_id)
    p = await db.get(Project, pid) if pid else None
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Clean up project members and modules
    mods = (await db.scalars(select(ProjectModule).where(ProjectModule.project_id == pid))).all()
    for m in mods:
        scrs = (await db.scalars(select(ModuleScreen).where(ModuleScreen.module_id == m.id))).all()
        for s in scrs:
            await db.delete(s)
        await db.delete(m)

    members = (await db.scalars(select(ProjectMember).where(ProjectMember.project_id == pid))).all()
    for mem in members:
        await db.delete(mem)

    await db.delete(p)
    await db.commit()
    return {"status": "SUCCESS", "message": f"Project '{p.name}' and all associated modules/screens successfully deleted."}


# =============================================================================
# MODULE ENDPOINTS
# =============================================================================

@router.post("/{project_id}/modules", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_module(
    project_id: str,
    payload: ModuleCreate,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    pid = parse_uuid_safely(project_id)
    p = await db.get(Project, pid) if pid else None
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    clean_code = payload.code.strip().upper()
    existing = await db.scalar(
        select(ProjectModule).where(ProjectModule.project_id == pid, ProjectModule.code == clean_code)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Module with code '{clean_code}' already exists in this project")

    mod = ProjectModule(
        project_id=pid,
        code=clean_code,
        name=payload.name.strip(),
        description=payload.description.strip(),
    )
    db.add(mod)
    await db.commit()
    await db.refresh(mod)
    return {
        "id": str(mod.id),
        "project_id": str(pid),
        "code": mod.code,
        "name": mod.name,
        "description": mod.description or "",
        "screens": [],
    }


@router.patch("/modules/{module_id}", response_model=dict)
async def update_module(
    module_id: str,
    payload: ModuleUpdate,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    mid = parse_uuid_safely(module_id)
    mod = await db.get(ProjectModule, mid) if mid else None
    if not mod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    if payload.code is not None:
        clean_code = payload.code.strip().upper()
        if clean_code != mod.code:
            existing = await db.scalar(
                select(ProjectModule).where(ProjectModule.project_id == mod.project_id, ProjectModule.code == clean_code)
            )
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Module code '{clean_code}' already exists in this project")
            mod.code = clean_code

    if payload.name is not None:
        mod.name = payload.name.strip()
    if payload.description is not None:
        mod.description = payload.description.strip()

    await db.commit()
    await db.refresh(mod)
    return {
        "id": str(mod.id),
        "project_id": str(mod.project_id),
        "code": mod.code,
        "name": mod.name,
        "description": mod.description or "",
    }


@router.delete("/modules/{module_id}", response_model=dict)
async def delete_module(
    module_id: str,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    mid = parse_uuid_safely(module_id)
    mod = await db.get(ProjectModule, mid) if mid else None
    if not mod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    # Clean up child screens
    scrs = (await db.scalars(select(ModuleScreen).where(ModuleScreen.module_id == mid))).all()
    for s in scrs:
        await db.delete(s)

    await db.delete(mod)
    await db.commit()
    return {"status": "SUCCESS", "message": f"Module '{mod.name}' and all associated screens successfully deleted."}


# =============================================================================
# SCREEN / FUNCTIONALITY ENDPOINTS
# =============================================================================

@router.get("/modules/{module_id}/screens", response_model=list[dict])
async def list_module_screens(module_id: str, db: DbSession) -> list[dict]:
    mid = parse_uuid_safely(module_id)
    mod = await db.get(ProjectModule, mid) if mid else None
    if not mod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    scrs = (await db.scalars(select(ModuleScreen).where(ModuleScreen.module_id == mid).order_by(ModuleScreen.name.asc()))).all()
    return [{
        "id": str(s.id),
        "module_id": str(s.module_id),
        "code": s.code,
        "name": s.name,
        "description": s.description or "",
        "screen_type": s.screen_type or "EXISTING",
        "is_active": s.is_active,
    } for s in scrs]


@router.post("/modules/{module_id}/screens", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_module_screen(
    module_id: str,
    payload: ScreenCreate,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    """Creates a new screen or functionality under a specific module.
    Authorized for Admin, SPM, PM, and PL (and automatically invoked by BA during new screen CR creation)."""
    # If invoked directly via project management, check permission
    # (BAs are authorized during CR creation via internal workflow)
    if actor and not any(r in (actor.role_title or "").lower() for r in ["business analyst", "ba lead"]):
        check_can_manage_projects(actor)

    mid = parse_uuid_safely(module_id)
    mod = await db.get(ProjectModule, mid) if mid else None
    if not mod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    clean_name = payload.name.strip()
    clean_code = (payload.code or clean_name.upper().replace(" ", "_"))[:64]

    existing = await db.scalar(
        select(ModuleScreen).where(ModuleScreen.module_id == mid, ModuleScreen.name.ilike(clean_name))
    )
    if existing:
        return {
            "id": str(existing.id),
            "module_id": str(existing.module_id),
            "code": existing.code,
            "name": existing.name,
            "description": existing.description or "",
            "screen_type": existing.screen_type or "EXISTING",
            "is_active": existing.is_active,
            "already_existed": True,
        }

    scr = ModuleScreen(
        module_id=mid,
        code=clean_code,
        name=clean_name,
        description=payload.description.strip(),
        screen_type=payload.screen_type.strip().upper(),
        is_active=True,
    )
    db.add(scr)
    await db.commit()
    await db.refresh(scr)
    return {
        "id": str(scr.id),
        "module_id": str(scr.module_id),
        "code": scr.code,
        "name": scr.name,
        "description": scr.description or "",
        "screen_type": scr.screen_type or "EXISTING",
        "is_active": scr.is_active,
    }


@router.patch("/screens/{screen_id}", response_model=dict)
async def update_screen(
    screen_id: str,
    payload: ScreenUpdate,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    sid = parse_uuid_safely(screen_id)
    scr = await db.get(ModuleScreen, sid) if sid else None
    if not scr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screen not found")

    if payload.name is not None:
        scr.name = payload.name.strip()
    if payload.code is not None:
        scr.code = payload.code.strip().upper()
    if payload.description is not None:
        scr.description = payload.description.strip()
    if payload.screen_type is not None:
        scr.screen_type = payload.screen_type.strip().upper()
    if payload.is_active is not None:
        scr.is_active = payload.is_active

    await db.commit()
    await db.refresh(scr)
    return {
        "id": str(scr.id),
        "module_id": str(scr.module_id),
        "code": scr.code,
        "name": scr.name,
        "description": scr.description or "",
        "screen_type": scr.screen_type or "EXISTING",
        "is_active": scr.is_active,
    }


@router.delete("/screens/{screen_id}", response_model=dict)
async def delete_screen(
    screen_id: str,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    sid = parse_uuid_safely(screen_id)
    scr = await db.get(ModuleScreen, sid) if sid else None
    if not scr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screen not found")

    await db.delete(scr)
    await db.commit()
    return {"status": "SUCCESS", "message": f"Screen '{scr.name}' successfully deleted."}


# =============================================================================
# PROJECT MEMBERSHIP
# =============================================================================

@router.post("/{project_id}/members", response_model=dict)
async def add_project_member(
    project_id: str,
    payload: ProjectMemberAdd,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    pid = parse_uuid_safely(project_id)
    p = await db.get(Project, pid) if pid else None
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    u = await db.get(User, payload.user_id)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = await db.scalar(
        select(ProjectMember).where(ProjectMember.project_id == pid, ProjectMember.user_id == payload.user_id)
    )
    if not existing:
        db.add(ProjectMember(project_id=pid, user_id=payload.user_id, is_active=True))
        await db.commit()
    return {"status": "SUCCESS", "message": f"{u.display_name} assigned to {p.name}"}


@router.delete("/{project_id}/members/{user_id}", response_model=dict)
async def remove_project_member(
    project_id: str,
    user_id: str,
    db: DbSession,
    actor: Annotated[User | None, Depends(get_effective_actor)],
) -> dict:
    check_can_manage_projects(actor)

    pid = parse_uuid_safely(project_id)
    uid = parse_uuid_safely(user_id)
    if not pid or not uid:
        return {"status": "SUCCESS", "message": "Project member removed"}

    existing = await db.scalar(
        select(ProjectMember).where(ProjectMember.project_id == pid, ProjectMember.user_id == uid)
    )
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"status": "SUCCESS", "message": "Project member removed"}

