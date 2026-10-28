import json

import uuid

from typing import Annotated



from fastapi import APIRouter, Depends, Header, HTTPException, status

from pydantic import BaseModel, Field

from sqlalchemy import select

from sqlalchemy.ext.asyncio import AsyncSession



from app.core.security import hash_password
from app.db.session import get_db

from app.models import (

    AuditLog,

    Department,

    Project,

    ProjectMember,

    ProjectModule,

    Role,

    Team,

    TeamMember,

    User,

    UserRoleAssignment,

)



router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]





ROLE_CREATION_HIERARCHY: dict[str, set[str]] = {

    # System Admin / Management can create ANY role (UAT lead, Project Manager, BA lead, and other members)

    "system administrator": {

        "Senior Project Manager", "Project Manager", "BA Lead", "Business Analyst",

        "Project Lead", "Developer Lead", "Developer", "UAT Manager", "UAT Lead",

        "UAT Member", "UAT Tester", "Senior Management", "System Administrator", "Employee"

    },

    "senior management": {

        "Senior Project Manager", "Project Manager", "BA Lead", "Business Analyst",

        "Project Lead", "Developer Lead", "Developer", "UAT Manager", "UAT Lead",

        "UAT Member", "UAT Tester", "Employee"

    },

    # Senior Project Manager & Project Manager:

    # User SOP: "Project manager can create only Sinero project manager, project manager, developer cant not UAT lead or BA lead"

    "senior project manager": {

        "Senior Project Manager", "Project Manager", "Project Lead",

        "Developer Lead", "Developer", "Employee"

    },

    "project manager": {

        "Senior Project Manager", "Project Manager", "Project Lead",

        "Developer Lead", "Developer", "Employee"

    },

    # Project Lead / Developer Lead

    "project lead": {"Developer", "Employee"},

    "developer lead": {"Developer", "Employee"},

    # BA Lead: "BA lead can create others BA"

    "ba lead": {"Business Analyst", "BA Lead", "Employee"},

    # UAT Manager / Lead: "same for UAT lead"

    "uat manager": {"UAT Member", "UAT Tester", "UAT Lead", "UAT Manager", "Employee"},

    "uat lead": {"UAT Member", "UAT Tester", "UAT Lead", "UAT Manager", "Employee"},

}





def can_create_role(creator_role: str, target_role: str) -> bool:

    creator_lower = creator_role.lower()

    for key, allowed_set in ROLE_CREATION_HIERARCHY.items():

        if key in creator_lower:

            for allowed in allowed_set:

                if allowed.lower() == target_role.lower():

                    return True

            return False

    return False





class UserCreate(BaseModel):

    employee_code: str = Field(min_length=2, max_length=64)
    username: str | None = None
    password: str | None = None

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    display_name: str = Field(min_length=2, max_length=180)

    role_title: str = Field(min_length=2, max_length=100)

    avatar_url: str | None = None

    project_ids: list[uuid.UUID] = Field(default_factory=list)





class UserRoleUpdate(BaseModel):

    role_title: str = Field(min_length=2, max_length=100)





class ProjectMemberAdd(BaseModel):

    user_id: uuid.UUID





class ProjectModuleAdd(BaseModel):

    code: str = Field(min_length=2, max_length=64)

    name: str = Field(min_length=2, max_length=180)

    description: str = Field(default="", max_length=1000)





@router.get("/users")

async def list_users(db: DbSession) -> list[dict]:

    users = (await db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.display_name.asc()))).all()

    

    # Query project memberships

    memberships = (

        await db.execute(

            select(ProjectMember.user_id, Project.id, Project.code, Project.name)

            .join(Project, Project.id == ProjectMember.project_id)

            .where(ProjectMember.is_active.is_(True))

        )

    ).all()



    user_projects_map: dict[uuid.UUID, list[dict]] = {}

    for uid, pid, pcode, pname in memberships:

        user_projects_map.setdefault(uid, []).append({

            "id": str(pid),

            "code": pcode,

            "name": pname,

        })



    return [{

        "id": str(u.id),

        "employee_code": u.employee_code,
        "username": getattr(u, "username", None) or u.employee_code,

        "email": u.email,

        "display_name": u.display_name,

        "role_title": u.role_title,

        "avatar_url": u.avatar_url,

        "assigned_projects": user_projects_map.get(u.id, []),

    } for u in users]





@router.post("/users", response_model=dict, status_code=status.HTTP_201_CREATED)

async def create_user(

    payload: UserCreate,

    db: DbSession,

    actor_id: Annotated[str | None, Header(alias="x-actor-id")] = None,
    alt_actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
) -> dict:
    effective_actor_id = (actor_id or alt_actor_id or "").strip()
    actor = None
    if effective_actor_id:
        try:
            actor = await db.get(User, uuid.UUID(effective_actor_id))
        except (ValueError, AttributeError):
            pass
        if not actor:
            actor = await db.scalar(
                select(User).where(
                    (User.email.ilike(effective_actor_id)) |
                    (User.username.ilike(effective_actor_id)) |
                    (User.employee_code.ilike(effective_actor_id))
                ).limit(1)
            )

    if not actor:

        # Fallback in local dev/demo to System Administrator

        actor = await db.scalar(select(User).where(User.role_title == "System Administrator").limit(1))

        if not actor:

            actor = await db.scalar(select(User).where(User.is_active.is_(True)).limit(1))



    creator_role = (actor.role_title or "System Administrator") if actor else "System Administrator"



    # Enforce hierarchy permission ladder

    if not can_create_role(creator_role, payload.role_title):

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail=(

                f"Hierarchy Permission Denied: A user with role '{creator_role}' cannot create a user with role '{payload.role_title}'. "

                f"Project Managers can only create Senior Project Managers, Project Managers, and Developers (cannot create BA Leads or UAT Leads)."

            ),

        )



    # Check for duplicates

    existing_email = await db.scalar(select(User).where(User.email == payload.email))

    if existing_email:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email address already exists")



    existing_code = await db.scalar(select(User).where(User.employee_code == payload.employee_code))

    if existing_code:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this employee code already exists")



    new_user = User(

        employee_code=payload.employee_code,
        username=payload.username or payload.employee_code.lower(),
        password_hash=hash_password(payload.password) if (payload.password and payload.role_title == "System Administrator") else None,

        email=payload.email,

        display_name=payload.display_name,

        role_title=payload.role_title,

        avatar_url=payload.avatar_url,

        is_active=True,

    )

    db.add(new_user)

    await db.flush()



    # Map role_title to Role code and assign

    role_mapping = {

        "Senior Project Manager": "spm",

        "Project Manager": "pm",

        "Project Lead": "pl",

        "Developer Lead": "dev_lead",

        "Developer": "developer",

        "BA Lead": "ba_lead",

        "Business Analyst": "ba",

        "UAT Manager": "uat_manager",

        "UAT Lead": "uat_lead",

        "UAT Member": "uat_member",

        "UAT Tester": "uat_tester",

        "Senior Management": "management",

        "System Administrator": "admin",

    }

    role_code = role_mapping.get(payload.role_title, "developer")

    db_role = await db.scalar(select(Role).where(Role.code == role_code))

    if db_role:

        db.add(UserRoleAssignment(user_id=new_user.id, role_id=db_role.id))



    # Assign to designated projects (single user can work in multiple projects)

    assigned_projects_res: list[dict] = []

    if payload.project_ids:

        for pid in payload.project_ids:

            proj = await db.get(Project, pid)

            if proj:

                db.add(ProjectMember(project_id=proj.id, user_id=new_user.id, is_active=True))

                assigned_projects_res.append({"id": str(proj.id), "code": proj.code, "name": proj.name})

    else:

        # Fallback to all active projects

        projs = (await db.scalars(select(Project).where(Project.status == "ACTIVE"))).all()

        for p in projs:

            db.add(ProjectMember(project_id=p.id, user_id=new_user.id, is_active=True))

            assigned_projects_res.append({"id": str(p.id), "code": p.code, "name": p.name})



    db.add(AuditLog(

        actor_id=actor.id if actor else None,

        entity_type="user",

        entity_id=new_user.id,

        action="USER_CREATED",

        change_payload=json.dumps({

            "creator_role": creator_role,

            "created_role": payload.role_title,

            "user_name": payload.display_name,

            "email": payload.email,

        }),

    ))

    await db.commit()



    return {

        "id": str(new_user.id),

        "employee_code": new_user.employee_code,
        "username": getattr(new_user, "username", None) or new_user.employee_code,

        "email": new_user.email,

        "display_name": new_user.display_name,

        "role_title": new_user.role_title,

        "avatar_url": new_user.avatar_url,

        "assigned_projects": assigned_projects_res,

    }





# Projects and modules are managed in app.api.routes.projects





@router.get("/teams")

async def list_teams(db: DbSession) -> list[dict]:

    teams = (await db.scalars(select(Team))).all()

    results = []

    for t in teams:

        lead = await db.get(User, t.lead_user_id) if t.lead_user_id else None

        members = (await db.scalars(select(User).join(TeamMember, TeamMember.user_id == User.id).where(TeamMember.team_id == t.id))).all()

        results.append({

            "id": str(t.id),

            "code": t.code,

            "name": t.name,

            "lead_name": lead.display_name if lead else None,

            "members": [{

                "id": str(m.id),

                "display_name": m.display_name,

                "role_title": m.role_title,

            } for m in members],

        })

    return results





@router.patch("/users/{user_id}/role")

async def update_user_role(

    user_id: uuid.UUID,

    payload: UserRoleUpdate,

    db: DbSession,

) -> dict:

    u = await db.get(User, user_id)

    if not u:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    u.role_title = payload.role_title

    await db.commit()

    return {"status": "SUCCESS", "user_id": str(u.id), "role_title": u.role_title}





