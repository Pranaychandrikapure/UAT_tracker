import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.work_item import WorkItem, WorkItemType
from app.schemas.work_item import WorkItemCreate, WorkItemList, WorkItemRead

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=WorkItemList)
async def list_work_items(
    db: DbSession,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> WorkItemList:
    total = await db.scalar(select(func.count()).select_from(WorkItem))
    result = await db.scalars(
        select(WorkItem).order_by(WorkItem.updated_at.desc()).limit(limit).offset(offset)
    )
    return WorkItemList(items=list(result), total=total or 0, limit=limit, offset=offset)


@router.post("", response_model=WorkItemRead, status_code=status.HTTP_201_CREATED)
async def create_work_item(
    payload: WorkItemCreate,
    db: DbSession,
) -> WorkItem:
    if payload.item_type == WorkItemType.CRS:
        parent = await db.get(WorkItem, payload.parent_id)
        if parent is None or parent.item_type != WorkItemType.CR:
            raise HTTPException(status_code=422, detail="parent_id must reference an existing CR")

    work_item = WorkItem(**payload.model_dump())
    db.add(work_item)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Work item key already exists") from exc
    await db.refresh(work_item)
    return work_item


@router.get("/{work_item_id}", response_model=WorkItemRead)
async def get_work_item(
    work_item_id: uuid.UUID,
    db: DbSession,
) -> WorkItem:
    work_item = await db.get(WorkItem, work_item_id)
    if work_item is None:
        raise HTTPException(status_code=404, detail="Work item not found")
    return work_item

