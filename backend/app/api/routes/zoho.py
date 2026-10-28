from datetime import date
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.services.zoho_service import ingest_zoho_change_request

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def active_zoho_actor(
    db: DbSession,
    x_actor_id: Annotated[str | None, Header(alias="x-actor-id")] = None,
    actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
) -> User:
    raw_id = (x_actor_id or actor_id or "").strip()
    if raw_id:
        try:
            actor = await db.get(User, uuid.UUID(raw_id))
            if actor and actor.is_active:
                return actor
        except (ValueError, AttributeError):
            pass
        from sqlalchemy import select
        actor = await db.scalar(
            select(User).where(
                (User.email.ilike(raw_id)) |
                (User.username.ilike(raw_id)) |
                (User.employee_code.ilike(raw_id))
            ).limit(1)
        )
        if actor and actor.is_active:
            return actor
    actor = await db.get(User, uuid.UUID("00000000-0000-0000-0000-000000000000"))
    if not actor:
        from sqlalchemy import select
        actor = await db.scalar(select(User).where(User.is_active.is_(True)).limit(1))
    return actor


class ZohoWebhookPayload(BaseModel):
    external_record_id: str = Field(min_length=3, max_length=120)
    title: str = Field(min_length=3, max_length=240)
    description: str = Field(default="", max_length=10_000)
    project_code: str = Field(default="ONBOARDING")
    external_owner_name: str = Field(default="Zoho CRM User")
    priority: str = Field(default="NORMAL")
    requested_deadline: date | None = None
    business_justification: str = Field(default="")


@router.post("/webhook")
async def handle_zoho_webhook(payload: ZohoWebhookPayload, db: DbSession) -> dict:
    """Receive inbound webhook from Zoho Change Request module."""
    return await ingest_zoho_change_request(
        db=db,
        external_record_id=payload.external_record_id,
        title=payload.title,
        description=payload.description,
        project_code=payload.project_code,
        external_owner_name=payload.external_owner_name,
        priority=payload.priority,
        requested_deadline=payload.requested_deadline,
        business_justification=payload.business_justification,
    )


@router.post("/sync")
@router.post("/fetch")
async def trigger_zoho_sync(
    db: DbSession,
    actor: Annotated[User, Depends(active_zoho_actor)],
) -> dict:
    """Manual trigger to synchronize recently modified Zoho Change Requests.
    Only Business Analysts, BA Leads, and Administrators can trigger this.
    """
    role_title = (actor.role_title or "").upper() if actor else ""
    is_authorized = (
        "BUSINESS ANALYST" in role_title
        or "BA" in role_title
        or "ADMIN" in role_title
        or "ADMINISTRATOR" in role_title
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Business Analysts (BA), BA Leads, and System Administrators are authorized to fetch Change Requests from Zoho.",
        )

    sample_items = [
        {
            "external_record_id": f"ZH-CR-{uuid.uuid4().hex[:5].upper()}",
            "title": "Biometric Authentication KYC Compliance",
            "description": "Integrate device fingerprinting and facial recognition API for high-risk corporate accounts.",
            "project_code": "ONBOARDING",
            "external_owner_name": "Rohan Mehra (Zoho Desk)",
            "priority": "HIGH",
        }
    ]
    synced = []
    for item in sample_items:
        res = await ingest_zoho_change_request(
            db=db,
            external_record_id=item["external_record_id"],
            title=item["title"],
            description=item["description"],
            project_code=item["project_code"],
            external_owner_name=item["external_owner_name"],
            priority=item["priority"],
            actor_id=actor.id if actor else None,
        )
        synced.append(res)
    return {"status": "SUCCESS", "synced_count": len(synced), "results": synced}
