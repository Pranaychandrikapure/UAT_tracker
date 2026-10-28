import uuid
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import ChangeRequest, DevTask, ProjectModule, TaskWorkLog, User
from app.services.cr_workflow import InvalidTaskTransition, validate_task_transition

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
        user_count = await db.scalar(select(func.count(User.id)))
        if user_count == 0:
            return User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                employee_code="BOOTSTRAP",
                email="admin@company.com",
                display_name="System Administrator",
                role_title="System Administrator",
                is_active=True,
            )
        raise HTTPException(status_code=401, detail="No active actor")
    return actor


class DevTaskCreate(BaseModel):
    cr_id: uuid.UUID
    module_id: uuid.UUID
    title: str = Field(min_length=5, max_length=240)
    description: str = Field(default="", max_length=10_000)
    priority: str = Field(default="NORMAL", pattern=r"^(LOW|NORMAL|HIGH|URGENT)$")
    assigned_developer_id: uuid.UUID | None = None
    estimated_hours: float = Field(default=0.0, ge=0)
    start_date: date | None = None
    due_date: date | None = None


class DevTaskUpdate(BaseModel):
    status: str | None = None
    blockers: str | None = None
    technical_evidence: str | None = None
    notes: str | None = None
    actual_hours: float | None = None
    assigned_developer_id: uuid.UUID | None = None


class WorkLogCreate(BaseModel):
    hours_spent: float = Field(gt=0)
    log_date: date = Field(default_factory=date.today)
    notes: str = Field(default="", max_length=1_000)


@router.get("")
async def list_dev_tasks(
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
    cr_id: uuid.UUID | None = Query(None),
    developer_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None),
) -> list[dict]:
    query = (
        select(DevTask, ChangeRequest, ProjectModule, User)
        .join(ChangeRequest, ChangeRequest.id == DevTask.cr_id)
        .join(ProjectModule, ProjectModule.id == DevTask.module_id)
        .outerjoin(User, User.id == DevTask.assigned_developer_id)
    )
    if cr_id:
        query = query.where(DevTask.cr_id == cr_id)
    if developer_id:
        query = query.where(DevTask.assigned_developer_id == developer_id)
    if status_filter and status_filter != "All":
        query = query.where(DevTask.status == status_filter)

    rows = (await db.execute(query.order_by(DevTask.updated_at.desc()))).all()
    results = []
    for t, cr, mod, dev in rows:
        results.append({
            "id": str(t.id),
            "task_number": t.task_number,
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "cr_title": cr.title,
            "module_id": str(mod.id),
            "module_name": mod.name,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "assigned_developer_id": str(dev.id) if dev else None,
            "assigned_developer_name": dev.display_name if dev else "Unassigned",
            "estimated_hours": t.estimated_hours,
            "actual_hours": t.actual_hours,
            "start_date": str(t.start_date) if t.start_date else None,
            "due_date": str(t.due_date) if t.due_date else None,
            "blockers": t.blockers,
            "technical_evidence": t.technical_evidence,
            "notes": t.notes,
        })
    return results


@router.post("")
async def create_dev_task(
    payload: DevTaskCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, payload.cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    task_number = f"TSK-{cr.reference_number.split('-')[-1]}-{uuid.uuid4().hex[:4].upper()}"
    task = DevTask(
        cr_id=payload.cr_id,
        module_id=payload.module_id,
        task_number=task_number,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status="TODO",
        assigned_developer_id=payload.assigned_developer_id or actor.id,
        estimated_hours=payload.estimated_hours,
        start_date=payload.start_date,
        due_date=payload.due_date,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return {"id": str(task.id), "task_number": task.task_number, "status": task.status}


@router.patch("/{task_id}")
async def update_dev_task(
    task_id: uuid.UUID,
    payload: DevTaskUpdate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    task = await db.get(DevTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.status and payload.status != task.status:
        try:
            validate_task_transition(task.status, payload.status)
        except InvalidTaskTransition as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        task.status = payload.status

    if payload.blockers is not None:
        task.blockers = payload.blockers
    if payload.technical_evidence is not None:
        task.technical_evidence = payload.technical_evidence
    if payload.notes is not None:
        task.notes = payload.notes
    if payload.actual_hours is not None:
        task.actual_hours = payload.actual_hours
    if payload.assigned_developer_id is not None:
        task.assigned_developer_id = payload.assigned_developer_id

    await db.commit()
    return {"id": str(task.id), "status": task.status, "message": "Task updated"}


@router.post("/{task_id}/work-logs")
async def log_task_work(
    task_id: uuid.UUID,
    payload: WorkLogCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    task = await db.get(DevTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    log = TaskWorkLog(
        task_id=task_id,
        user_id=actor.id,
        hours_spent=payload.hours_spent,
        log_date=payload.log_date,
        notes=payload.notes,
    )
    db.add(log)
    task.actual_hours += payload.hours_spent
    await db.commit()
    return {"status": "SUCCESS", "logged_hours": payload.hours_spent, "total_actual": task.actual_hours}


class DevDifficultyInput(BaseModel):
    difficulty_note: str = Field(min_length=5, max_length=5_000)
    category: str = Field(default="TECHNICAL", max_length=64)


@router.post("/{task_id}/raise-difficulty")
async def raise_task_difficulty(
    task_id: uuid.UUID,
    payload: DevDifficultyInput,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    task = await db.get(DevTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    cr = await db.get(ChangeRequest, task.cr_id)
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
    new_entry = f"[{now_str} - {actor.display_name} ({payload.category})]: {payload.difficulty_note}"
    task.blockers = f"{task.blockers}\n{new_entry}".strip() if task.blockers else new_entry

    recipients = []
    if cr and cr.primary_pm_id:
        recipients.append(cr.primary_pm_id)
    if cr and cr.ba_user_id:
        recipients.append(cr.ba_user_id)

    from app.models import NotificationEvent
    for r_id in set(recipients):
        db.add(NotificationEvent(
            recipient_id=r_id,
            title=f"Difficulty / Blocker Raised on {task.task_number}",
            message=f"Developer {actor.display_name} reported an impediment on '{task.title}': {payload.difficulty_note}",
            entity_type="dev_task",
            entity_id=task.id,
        ))

    await db.commit()
    return {"status": "SUCCESS", "message": "Difficulty recorded and manager notified", "blockers": task.blockers}

