import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import ChangeRequest, DevTask, ProjectModule, SITCycle, SITExecution, User

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


class SITCycleCreate(BaseModel):
    cr_id: uuid.UUID
    module_id: uuid.UUID | None = None
    notes: str = Field(default="", max_length=1_000)


class SITExecutionCreate(BaseModel):
    sit_cycle_id: uuid.UUID
    dev_task_id: uuid.UUID | None = None
    test_case_title: str = Field(min_length=5, max_length=240)
    test_steps: str = Field(default="", max_length=5_000)
    expected_result: str = Field(default="", max_length=2_000)
    actual_result: str = Field(default="", max_length=2_000)
    result: str = Field(pattern=r"^(PASS|FAIL|BLOCKED)$")
    evidence_notes: str = Field(default="", max_length=2_000)


@router.get("/cycles")
async def list_sit_cycles(
    db: DbSession,
    cr_id: uuid.UUID | None = Query(None),
) -> list[dict]:
    query = (
        select(SITCycle, ChangeRequest, User)
        .join(ChangeRequest, ChangeRequest.id == SITCycle.cr_id)
        .outerjoin(User, User.id == SITCycle.lead_approver_id)
    )
    if cr_id:
        query = query.where(SITCycle.cr_id == cr_id)

    rows = (await db.execute(query.order_by(SITCycle.created_at.desc()))).all()
    results = []
    for c, cr, u in rows:
        results.append({
            "id": str(c.id),
            "cycle_number": c.cycle_number,
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "cr_title": cr.title,
            "status": c.status,
            "lead_approver": u.display_name if u else None,
            "signed_off_at": c.signed_off_at.isoformat() if c.signed_off_at else None,
            "notes": c.notes,
        })
    return results


@router.get("/executions")
async def list_sit_executions(
    db: DbSession,
    cycle_id: uuid.UUID | None = Query(None),
) -> list[dict]:
    query = select(SITExecution, User).join(User, User.id == SITExecution.executed_by_user_id)
    if cycle_id:
        query = query.where(SITExecution.sit_cycle_id == cycle_id)

    rows = (await db.execute(query.order_by(SITExecution.executed_at.desc()))).all()
    results = []
    for e, u in rows:
        results.append({
            "id": str(e.id),
            "cycle_id": str(e.sit_cycle_id),
            "test_case_title": e.test_case_title,
            "test_steps": e.test_steps,
            "expected_result": e.expected_result,
            "actual_result": e.actual_result,
            "result": e.result,
            "executed_by": u.display_name,
            "evidence_notes": e.evidence_notes,
            "executed_at": e.executed_at.isoformat(),
        })
    return results


@router.post("/cycles")
async def create_sit_cycle(
    payload: SITCycleCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, payload.cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    existing_count = (await db.scalars(select(SITCycle).where(SITCycle.cr_id == payload.cr_id))).all()
    cycle = SITCycle(
        cr_id=payload.cr_id,
        module_id=payload.module_id,
        cycle_number=len(existing_count) + 1,
        status="IN_PROGRESS",
        lead_approver_id=actor.id,
        notes=payload.notes,
    )
    db.add(cycle)
    if cr.status in ("DEVELOPMENT", "CODE_REVIEW"):
        cr.status = "SIT"
    await db.commit()
    await db.refresh(cycle)
    return {"id": str(cycle.id), "cycle_number": cycle.cycle_number, "status": cycle.status}


@router.post("/executions")
async def record_sit_execution(
    payload: SITExecutionCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cycle = await db.get(SITCycle, payload.sit_cycle_id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")

    execution = SITExecution(
        sit_cycle_id=payload.sit_cycle_id,
        dev_task_id=payload.dev_task_id,
        test_case_title=payload.test_case_title,
        test_steps=payload.test_steps,
        expected_result=payload.expected_result,
        actual_result=payload.actual_result,
        result=payload.result,
        executed_by_user_id=actor.id,
        evidence_notes=payload.evidence_notes,
    )
    db.add(execution)

    # Update associated task status
    if payload.dev_task_id:
        task = await db.get(DevTask, payload.dev_task_id)
        if task:
            if payload.result == "PASS":
                task.status = "SIT_PASSED"
            elif payload.result == "FAIL":
                task.status = "SIT_FAILED"

    await db.commit()
    return {"id": str(execution.id), "result": execution.result}


@router.post("/cycles/{cycle_id}/sign-off")
async def signoff_sit_cycle(
    cycle_id: uuid.UUID,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cycle = await db.get(SITCycle, cycle_id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")

    now = datetime.now(UTC)
    cycle.status = "PASSED"
    cycle.lead_approver_id = actor.id
    cycle.signed_off_at = now

    cr = await db.get(ChangeRequest, cycle.cr_id)
    if cr:
        cr.sit_completed_at = now
        cr.status = "UAT_READY"

    await db.commit()
    return {"id": str(cycle.id), "status": cycle.status, "message": "SIT Cycle signed off. CR is ready for UAT."}
