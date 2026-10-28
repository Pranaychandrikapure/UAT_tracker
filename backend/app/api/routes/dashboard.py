from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.work_item import WorkItem
from app.schemas.work_item import DashboardSummary

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(db: DbSession) -> DashboardSummary:
    rows = await db.execute(
        select(WorkItem.status, func.count(WorkItem.id)).group_by(WorkItem.status)
    )
    counts = {status: count for status, count in rows}
    return DashboardSummary(
        total=sum(counts.values()),
        in_development=counts.get("In Development", 0),
        ready_for_uat=counts.get("Ready for UAT", 0),
        uat_approved=counts.get("UAT Approved", 0),
    )

