import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import NotificationEvent, User

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("")
async def list_notifications(
    db: DbSession,
    actor_id: Annotated[uuid.UUID | None, Header(alias="X-Actor-Id")] = None,
) -> list[dict]:
    query = select(NotificationEvent)
    if actor_id:
        query = query.where(NotificationEvent.recipient_id == actor_id)

    rows = (await db.scalars(query.order_by(NotificationEvent.created_at.desc()).limit(20))).all()
    return [{
        "id": str(n.id),
        "title": n.title,
        "message": n.message,
        "entity_type": n.entity_type,
        "entity_id": str(n.entity_id),
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    } for n in rows]


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: uuid.UUID, db: DbSession) -> dict:
    notif = await db.get(NotificationEvent, notification_id)
    if notif:
        notif.is_read = True
        await db.commit()
    return {"status": "SUCCESS"}
