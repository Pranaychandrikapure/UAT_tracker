import hashlib
import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models import AuditLog, Project, ProjectMember, Role, User, UserRoleAssignment

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


class GoogleSSORequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    display_name: str | None = None
    avatar_url: str | None = None
    google_id: str | None = None
    id_token: str | None = None


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=320, description="Admin username or admin email")
    password: str = Field(min_length=1, max_length=128)


class EmailLoginRequest(BaseModel):
    email: str | None = Field(default=None, max_length=320)
    username: str | None = Field(default=None, max_length=320)
    password: str | None = Field(default=None, max_length=128)


def generate_session_token(user_id: uuid.UUID, email: str) -> str:
    seed = f"{user_id}:{email}:{settings.session_secret_key}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


async def get_user_assigned_projects(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    memberships = (
        await db.execute(
            select(ProjectMember.project_id, Project.id, Project.code, Project.name)
            .join(Project, Project.id == ProjectMember.project_id)
            .where(ProjectMember.user_id == user_id, ProjectMember.is_active.is_(True))
        )
    ).all()
    return [{
        "id": str(pid),
        "code": pcode,
        "name": pname,
    } for _, pid, pcode, pname in memberships]


async def check_is_user_admin(db: AsyncSession, user: User) -> bool:
    """Checks if a given user has the System Administrator role."""
    if user.role_title and user.role_title.strip().lower() == "system administrator":
        return True
    admin_role = await db.scalar(select(Role).where(Role.code == "admin"))
    if admin_role:
        has_admin_assignment = await db.scalar(
            select(UserRoleAssignment.id).where(
                UserRoleAssignment.user_id == user.id,
                UserRoleAssignment.role_id == admin_role.id,
                UserRoleAssignment.is_active.is_(True),
            ).limit(1)
        )
        if has_admin_assignment:
            return True
    return False


@router.get("/google/url")
async def get_google_auth_url() -> dict:
    """Returns the Google OAuth 2.0 Authorization URL for Google Workspace & Gmail SSO."""
    base_auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = (
        f"?client_id={settings.google_client_id}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&redirect_uri={settings.google_redirect_uri}"
        f"&state=neml_uat_state"
        f"&prompt=select_account"
    )
    return {
        "auth_url": base_auth_url + params,
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
    }


@router.post("/google/callback")
async def google_sso_callback(payload: GoogleSSORequest, db: DbSession) -> dict:
    """Handles Google SSO authentication, user lookup, and on-demand provisioning."""
    email_clean = payload.email.strip().lower()

    # 1. Lookup user by email in database
    user = await db.scalar(select(User).where(User.email.ilike(email_clean)).limit(1))

    if not user:
        # Auto-provision new enterprise user via Google SSO
        display_name = payload.display_name or email_clean.split("@")[0].replace(".", " ").title()
        
        # Determine initial role: if email contains admin/management, grant admin, else Developer
        initial_role = "System Administrator" if ("admin" in email_clean or "management" in email_clean) else "Developer"
        role_code = "admin" if initial_role == "System Administrator" else "developer"

        # Count existing users for employee code
        user_count = len((await db.scalars(select(User))).all())
        code = f"G-EMP-{user_count + 1:03d}"

        user = User(
            employee_code=code,
            email=email_clean,
            display_name=display_name,
            role_title=initial_role,
            avatar_url=payload.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={display_name}",
            google_id=payload.google_id,
            auth_provider="GOOGLE_SSO",
            is_active=True,
        )
        db.add(user)
        await db.flush()

        # Map role assignment
        db_role = await db.scalar(select(Role).where(Role.code == role_code))
        if db_role:
            db.add(UserRoleAssignment(user_id=user.id, role_id=db_role.id))

        # Assign to active projects
        projs = (await db.scalars(select(Project).where(Project.status == "ACTIVE"))).all()
        for p in projs:
            db.add(ProjectMember(project_id=p.id, user_id=user.id, is_active=True))

        db.add(AuditLog(
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            action="GOOGLE_SSO_USER_PROVISIONED",
            change_payload=json.dumps({
                "email": email_clean,
                "display_name": display_name,
                "provider": "GOOGLE_SSO",
            }),
        ))
        await db.commit()
    else:
        # Update SSO metadata
        if payload.google_id and not user.google_id:
            user.google_id = payload.google_id
        user.auth_provider = "GOOGLE_SSO"
        if payload.avatar_url and not user.avatar_url:
            user.avatar_url = payload.avatar_url
        await db.commit()

    assigned_projs = await get_user_assigned_projects(db, user.id)
    token = generate_session_token(user.id, user.email)

    return {
        "token": token,
        "login_method": "GOOGLE_SSO",
        "user": {
            "id": str(user.id),
            "employee_code": user.employee_code,
            "username": getattr(user, "username", None) or user.employee_code,
            "email": user.email,
            "display_name": user.display_name,
            "role_title": user.role_title,
            "avatar_url": user.avatar_url,
            "assigned_projects": assigned_projs,
            "auth_provider": user.auth_provider,
        },
    }


@router.post("/admin/login")
async def admin_credentials_login(payload: AdminLoginRequest, db: DbSession) -> dict:
    """Authenticates an Administrator using username (or admin email) and password.
    Enforces strict security: Non-administrator users are prohibited from logging in via password."""
    ident_clean = payload.username.strip().lower()

    # 1. Lookup user by username, email, or employee_code
    user = await db.scalar(
        select(User).where(
            (User.username.ilike(ident_clean)) |
            (User.email.ilike(ident_clean)) |
            (User.employee_code.ilike(ident_clean))
        ).limit(1)
    )

    if not user:
        # If no user found, check if credentials match the system environment default admin
        if (
            ident_clean in [settings.admin_username.lower(), settings.admin_email.lower()]
            and payload.password == settings.admin_password
        ):
            # Bootstrap initial admin
            user = User(
                employee_code="ADM-001",
                username=settings.admin_username,
                email=settings.admin_email,
                display_name="System Administrator",
                role_title="System Administrator",
                password_hash=hash_password(settings.admin_password),
                auth_provider="LOCAL_CREDENTIALS",
                is_active=True,
            )
            db.add(user)
            await db.flush()
            admin_role = await db.scalar(select(Role).where(Role.code == "admin"))
            if admin_role:
                db.add(UserRoleAssignment(user_id=user.id, role_id=admin_role.id))
            await db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrator username or password.",
            )

    # 2. Enforce policy: Only System Administrators can log in using username and password!
    is_admin = await check_is_user_admin(db, user)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Access Denied: Standard users cannot log in with username and password. "
                "All non-administrator users must sign in via Enterprise SSO."
            ),
        )

    # 3. Verify admin password
    is_password_valid = verify_password(payload.password, getattr(user, "password_hash", None))
    if not is_password_valid:
        # Check against settings default admin password if user is the designated admin
        if (
            ident_clean in [settings.admin_username.lower(), settings.admin_email.lower()]
            and payload.password == settings.admin_password
        ):
            user.password_hash = hash_password(settings.admin_password)
            await db.commit()
            is_password_valid = True

    if not is_password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator username or password.",
        )

    assigned_projs = await get_user_assigned_projects(db, user.id)
    token = generate_session_token(user.id, user.email)

    return {
        "token": token,
        "login_method": "PASSWORD",
        "user": {
            "id": str(user.id),
            "employee_code": user.employee_code,
            "username": getattr(user, "username", None) or "admin",
            "email": user.email,
            "display_name": user.display_name,
            "role_title": user.role_title,
            "avatar_url": user.avatar_url,
            "assigned_projects": assigned_projs,
            "auth_provider": user.auth_provider,
        },
    }


@router.post("/login")
async def email_login(payload: EmailLoginRequest, db: DbSession) -> dict:
    """Unified login endpoint: Delegates to admin_credentials_login when credentials are provided,
    and blocks non-admin users from passwordless login (requiring SSO)."""
    username_or_email = payload.username or payload.email
    if not username_or_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required.",
        )

    # If password is provided, delegate to admin credential validation
    if payload.password:
        return await admin_credentials_login(
            AdminLoginRequest(username=username_or_email, password=payload.password),
            db=db,
        )

    # If no password is provided:
    ident_clean = username_or_email.strip().lower()
    user = await db.scalar(
        select(User).where(
            (User.email.ilike(ident_clean)) |
            (User.username.ilike(ident_clean))
        ).limit(1)
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user found. Non-admin users must sign in via Enterprise SSO.",
        )

    is_admin = await check_is_user_admin(db, user)
    if is_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password required: Administrator accounts require password authentication.",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Access Denied: Standard users cannot log in with username and password. "
                "Please sign in using Enterprise Single Sign-On (SSO)."
            ),
        )


@router.get("/me")
async def get_current_user_profile(
    db: DbSession,
    actor_id: Annotated[str | None, Header(alias="x-actor-id")] = None,
    alt_actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
) -> dict:
    """Returns the current authenticated user's session profile."""
    raw_id = (actor_id or alt_actor_id or "").strip()
    user = None
    if raw_id:
        try:
            user = await db.get(User, uuid.UUID(raw_id))
        except (ValueError, AttributeError):
            pass
        if not user:
            user = await db.scalar(
                select(User).where(
                    (User.email.ilike(raw_id)) |
                    (User.username.ilike(raw_id)) |
                    (User.employee_code.ilike(raw_id))
                ).limit(1)
            )
    if not user:
        user = await db.scalar(select(User).where(User.is_active.is_(True)).order_by(User.created_at.asc()).limit(1))

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    assigned_projs = await get_user_assigned_projects(db, user.id)
    return {
        "id": str(user.id),
        "employee_code": user.employee_code,
        "username": getattr(user, "username", None) or user.employee_code,
        "email": user.email,
        "display_name": user.display_name,
        "role_title": user.role_title,
        "avatar_url": user.avatar_url,
        "assigned_projects": assigned_projs,
        "auth_provider": user.auth_provider,
    }


@router.post("/logout")
async def logout_user() -> dict:
    """Terminates session."""
    return {"status": "SUCCESS", "message": "Successfully signed out"}


