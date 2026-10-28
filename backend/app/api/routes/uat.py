import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import ChangeRequest, Defect, UATCycle, UATTestExecution, User

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def active_actor(
    db: DbSession,
    actor_id: Annotated[uuid.UUID | None, Header(alias="X-Actor-Id")] = None,
) -> User:
    if actor_id:
        actor = await db.get(User, actor_id)
        if actor and actor.is_active:
            return actor
    actor = await db.scalar(select(User).where(User.is_active.is_(True)).order_by(User.employee_code.asc()).limit(1))
    if not actor:
        raise HTTPException(status_code=401, detail="No active actor")
    return actor


class UATRunInput(BaseModel):
    status: str = Field(pattern=r"^(PASS|FAIL|BLOCKED)$")
    actual_result: str = Field(min_length=3, max_length=2_000)
    notes: str = Field(default="", max_length=2_000)
    evidence_url: str = Field(default="", max_length=1_000)


class UATSignoffInput(BaseModel):
    signoff_notes: str = Field(min_length=5, max_length=2_000)


@router.get("/cycles")
async def list_uat_cycles(
    db: DbSession,
    cr_id: uuid.UUID | None = Query(None),
) -> list[dict]:
    query = select(UATCycle, ChangeRequest, User).join(ChangeRequest, ChangeRequest.id == UATCycle.cr_id).outerjoin(User, User.id == UATCycle.lead_id)
    if cr_id:
        query = query.where(UATCycle.cr_id == cr_id)

    rows = (await db.execute(query.order_by(UATCycle.created_at.desc()))).all()
    results = []
    for c, cr, u in rows:
        results.append({
            "id": str(c.id),
            "cycle_number": c.cycle_number,
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "cr_title": cr.title,
            "status": c.status,
            "lead_name": u.display_name if u else "UAT Lead",
            "signed_off_at": c.signed_off_at.isoformat() if c.signed_off_at else None,
            "signoff_notes": c.signoff_notes,
        })
    return results


@router.get("/executions")
async def list_uat_executions(
    db: DbSession,
    cr_id: uuid.UUID | None = Query(None),
    cycle_id: uuid.UUID | None = Query(None),
) -> list[dict]:
    query = (
        select(UATTestExecution, ChangeRequest, User)
        .join(ChangeRequest, ChangeRequest.id == UATTestExecution.cr_id)
        .outerjoin(User, User.id == UATTestExecution.tester_id)
    )
    if cr_id:
        query = query.where(UATTestExecution.cr_id == cr_id)
    if cycle_id:
        query = query.where(UATTestExecution.uat_cycle_id == cycle_id)

    rows = (await db.execute(query.order_by(UATTestExecution.created_at.desc()))).all()
    results = []
    for e, cr, u in rows:
        results.append({
            "id": str(e.id),
            "cycle_id": str(e.uat_cycle_id),
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "test_name": e.test_name,
            "steps": e.steps,
            "expected_result": e.expected_result,
            "actual_result": e.actual_result,
            "status": e.status,
            "tester_name": u.display_name if u else "Unassigned",
            "notes": e.notes,
            "evidence_url": e.evidence_url,
            "executed_at": e.executed_at.isoformat() if e.executed_at else None,
        })
    return results


@router.post("/executions/{execution_id}/run")
async def record_uat_execution_run(
    execution_id: uuid.UUID,
    payload: UATRunInput,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    ex = await db.get(UATTestExecution, execution_id)
    if not ex:
        raise HTTPException(status_code=404, detail="UAT execution not found")

    now = datetime.now(UTC)
    ex.status = payload.status
    ex.actual_result = payload.actual_result
    ex.notes = payload.notes
    ex.evidence_url = payload.evidence_url
    ex.tester_id = actor.id
    ex.executed_at = now

    await db.commit()
    return {"id": str(ex.id), "status": ex.status, "message": "Test execution saved"}


@router.post("/cycles/{cycle_id}/sign-off")
async def signoff_uat_cycle(
    cycle_id: uuid.UUID,
    payload: UATSignoffInput,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cycle = await db.get(UATCycle, cycle_id)
    if not cycle:
        raise HTTPException(status_code=404, detail="UAT cycle not found")

    now = datetime.now(UTC)
    cycle.status = "PASSED"
    cycle.lead_id = actor.id
    cycle.signoff_notes = payload.signoff_notes
    cycle.signed_off_at = now

    cr = await db.get(ChangeRequest, cycle.cr_id)
    if cr:
        cr.uat_signed_off_at = now
        cr.status = "UAT_SIGNED_OFF"

    await db.commit()
    return {"id": str(cycle.id), "status": cycle.status, "message": "UAT Sign-off completed. Ready for Business Acceptance."}
