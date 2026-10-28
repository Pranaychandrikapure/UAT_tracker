import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import (
    ChangeRequest,
    Defect,
    DefectResolutionAttempt,
    DefectStatusHistory,
    NotificationEvent,
    Project,
    ProjectModule,
    User,
)
from app.services.cr_workflow import InvalidDefectTransition, validate_defect_transition

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


class DefectCreate(BaseModel):
    cr_id: uuid.UUID
    module_id: uuid.UUID | None = None
    dev_task_id: uuid.UUID | None = None
    title: str = Field(min_length=5, max_length=240)
    description: str = Field(min_length=10, max_length=10_000)
    reproduction_steps: str = Field(default="", max_length=5_000)
    severity: str = Field(default="MAJOR", pattern=r"^(BLOCKER|CRITICAL|MAJOR|MINOR)$")
    priority: str = Field(default="NORMAL", pattern=r"^(URGENT|HIGH|NORMAL|LOW)$")
    assigned_developer_id: uuid.UUID | None = None
    environment: str = Field(default="UAT", max_length=64)
    evidence_url: str = Field(default="", max_length=2_000)


class DefectResolve(BaseModel):
    resolution_notes: str = Field(min_length=5, max_length=5_000)
    code_reference: str = Field(default="", max_length=255)
    attachment_url: str = Field(default="", max_length=2_000)


class DefectFeedback(BaseModel):
    feedback_notes: str = Field(min_length=5, max_length=5_000)
    attachment_url: str = Field(default="", max_length=2_000)


class DefectSITVerify(BaseModel):
    sit_result: str = Field(pattern=r"^(PASS|FAIL)$")
    sit_notes: str = Field(default="", max_length=2_000)


class DefectRetest(BaseModel):
    retest_result: str = Field(pattern=r"^(PASS|FAIL)$")
    retest_notes: str = Field(default="", max_length=2_000)
    evidence_url: str = Field(default="", max_length=1_000)


@router.get("")
async def list_defects(
    db: DbSession,
    cr_id: uuid.UUID | None = Query(None),
    developer_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None),
    severity_filter: str | None = Query(None),
    priority_filter: str | None = Query(None),
    search: str | None = Query(None),
) -> list[dict]:
    query = (
        select(Defect, ChangeRequest, Project, ProjectModule, User)
        .join(ChangeRequest, ChangeRequest.id == Defect.cr_id)
        .join(Project, Project.id == ChangeRequest.project_id)
        .outerjoin(ProjectModule, ProjectModule.id == Defect.module_id)
        .outerjoin(User, User.id == Defect.assigned_developer_id)
    )
    if cr_id:
        query = query.where(Defect.cr_id == cr_id)
    if developer_id:
        query = query.where(Defect.assigned_developer_id == developer_id)
    if status_filter and status_filter != "All":
        query = query.where(Defect.status == status_filter)
    if severity_filter and severity_filter != "All":
        query = query.where(Defect.severity == severity_filter)
    if priority_filter and priority_filter != "All":
        query = query.where(Defect.priority == priority_filter)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Defect.bug_number.ilike(term), Defect.title.ilike(term), Defect.description.ilike(term)))

    rows = (await db.execute(query.order_by(Defect.updated_at.desc()))).all()
    results = []
    for d, cr, p, mod, dev in rows:
        results.append({
            "id": str(d.id),
            "bug_number": d.bug_number,
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "project_name": p.name,
            "module_name": mod.name if mod else "Core",
            "title": d.title,
            "description": d.description,
            "reproduction_steps": d.reproduction_steps,
            "severity": d.severity,
            "priority": d.priority,
            "status": d.status,
            "assigned_developer_name": dev.display_name if dev else "Unassigned",
            "assigned_developer_id": str(dev.id) if dev else None,
            "environment": d.environment,
            "resolution_notes": d.resolution_notes,
            "evidence_url": d.evidence_url or "",
            "developer_feedback": d.developer_feedback or "",
            "developer_feedback_attachment": d.developer_feedback_attachment or "",
            "sit_passed_at": d.sit_passed_at.isoformat() if d.sit_passed_at else None,
            "srn_sent_at": d.srn_sent_at.isoformat() if d.srn_sent_at else None,
            "uat_deployed_at": d.uat_deployed_at.isoformat() if d.uat_deployed_at else None,
            "verified_at": d.verified_at.isoformat() if d.verified_at else None,
            "closed_at": d.closed_at.isoformat() if d.closed_at else None,
            "created_at": d.created_at.isoformat(),
        })
    return results


@router.get("/{defect_id}")
async def get_defect_detail(defect_id: uuid.UUID, db: DbSession) -> dict:
    d = await db.get(Defect, defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    cr = await db.get(ChangeRequest, d.cr_id)
    proj = await db.get(Project, cr.project_id) if cr else None
    mod = await db.get(ProjectModule, d.module_id) if d.module_id else None
    dev = await db.get(User, d.assigned_developer_id) if d.assigned_developer_id else None
    rep = await db.get(User, d.reporter_user_id) if d.reporter_user_id else None

    # Load resolution attempts
    attempts = (await db.scalars(select(DefectResolutionAttempt).where(DefectResolutionAttempt.defect_id == defect_id).order_by(DefectResolutionAttempt.attempt_number.asc()))).all()
    attempts_list = []
    for a in attempts:
        dev_att = await db.get(User, a.developer_id)
        attempts_list.append({
            "attempt_number": a.attempt_number,
            "developer_name": dev_att.display_name if dev_att else None,
            "resolution_notes": a.resolution_notes,
            "code_reference": a.code_reference,
            "sit_result": a.sit_result,
            "sit_notes": a.sit_notes,
            "created_at": a.created_at.isoformat(),
        })

    # Load history
    history = (await db.scalars(select(DefectStatusHistory).where(DefectStatusHistory.defect_id == defect_id).order_by(DefectStatusHistory.created_at.desc()))).all()
    history_list = []
    for h in history:
        act = await db.get(User, h.actor_id)
        history_list.append({
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "actor_name": act.display_name if act else "System",
            "reason": h.reason,
            "created_at": h.created_at.isoformat(),
        })

    return {
        "id": str(d.id),
        "bug_number": d.bug_number,
        "cr_id": str(cr.id) if cr else None,
        "cr_number": cr.reference_number if cr else None,
        "project_name": proj.name if proj else None,
        "module_name": mod.name if mod else "General",
        "title": d.title,
        "description": d.description,
        "reproduction_steps": d.reproduction_steps,
        "severity": d.severity,
        "priority": d.priority,
        "status": d.status,
        "assigned_developer_name": dev.display_name if dev else "Unassigned",
        "assigned_developer_id": str(dev.id) if dev else None,
        "reporter_name": rep.display_name if rep else "UAT Team",
        "environment": d.environment,
        "resolution_notes": d.resolution_notes,
        "sit_passed_at": d.sit_passed_at.isoformat() if d.sit_passed_at else None,
        "srn_sent_at": d.srn_sent_at.isoformat() if d.srn_sent_at else None,
        "uat_deployed_at": d.uat_deployed_at.isoformat() if d.uat_deployed_at else None,
        "verified_at": d.verified_at.isoformat() if d.verified_at else None,
        "closed_at": d.closed_at.isoformat() if d.closed_at else None,
        "resolution_attempts": attempts_list,
        "status_history": history_list,
    }


@router.post("")
async def create_defect(
    payload: DefectCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, payload.cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    count = (await db.scalars(select(Defect))).all()
    bug_number = f"BUG-{len(count) + 400}"

    assigned_dev = payload.assigned_developer_id
    if not assigned_dev and payload.module_id:
        from app.models import DevTask
        dev_task = await db.scalar(
            select(DevTask).where(DevTask.cr_id == payload.cr_id, DevTask.module_id == payload.module_id).limit(1)
        )
        if dev_task and dev_task.assigned_developer_id:
            assigned_dev = dev_task.assigned_developer_id

    defect = Defect(
        bug_number=bug_number,
        cr_id=payload.cr_id,
        module_id=payload.module_id,
        dev_task_id=payload.dev_task_id,
        title=payload.title,
        description=payload.description,
        reproduction_steps=payload.reproduction_steps,
        severity=payload.severity,
        priority=payload.priority,
        status="ASSIGNED" if assigned_dev else "OPEN",
        assigned_developer_id=assigned_dev,
        reporter_user_id=actor.id,
        reported_by_team="UAT",
        environment=payload.environment,
        evidence_url=payload.evidence_url or "",
    )
    db.add(defect)
    await db.flush()

    db.add(DefectStatusHistory(
        defect_id=defect.id,
        previous_status=None,
        new_status=defect.status,
        actor_id=actor.id,
        reason=f"Bug created by {actor.display_name}" + (f" and assigned to module developer" if assigned_dev else ""),
    ))
    await db.commit()
    await db.refresh(defect)
    return {"id": str(defect.id), "bug_number": defect.bug_number, "status": defect.status}


@router.post("/{defect_id}/feedback")
async def record_defect_feedback(
    defect_id: uuid.UUID,
    payload: DefectFeedback,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    d = await db.get(Defect, defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    d.developer_feedback = payload.feedback_notes
    if payload.attachment_url:
        d.developer_feedback_attachment = payload.attachment_url

    db.add(DefectStatusHistory(
        defect_id=d.id,
        previous_status=d.status,
        new_status=d.status,
        actor_id=actor.id,
        reason=f"Developer feedback provided: {payload.feedback_notes[:80]}",
    ))
    if d.reporter_user_id:
        db.add(NotificationEvent(
            recipient_id=d.reporter_user_id,
            title=f"Developer Feedback on {d.bug_number}",
            message=f"{actor.display_name} commented: {payload.feedback_notes}",
            entity_type="defect",
            entity_id=d.id,
        ))

    await db.commit()
    return {"status": "SUCCESS", "message": "Feedback and proof recorded successfully"}


@router.post("/{defect_id}/resolve")
async def resolve_defect(
    defect_id: uuid.UUID,
    payload: DefectResolve,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    d = await db.get(Defect, defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    prev = d.status
    d.status = "FIXED"
    d.resolution_notes = payload.resolution_notes
    if payload.attachment_url:
        d.developer_feedback_attachment = payload.attachment_url

    # Create resolution attempt
    attempts_count = (await db.scalars(select(DefectResolutionAttempt).where(DefectResolutionAttempt.defect_id == defect_id))).all()
    attempt = DefectResolutionAttempt(
        defect_id=defect_id,
        attempt_number=len(attempts_count) + 1,
        developer_id=actor.id,
        resolution_notes=payload.resolution_notes,
        code_reference=payload.code_reference,
        sit_result="PENDING",
    )
    db.add(attempt)

    db.add(DefectStatusHistory(
        defect_id=d.id,
        previous_status=prev,
        new_status="FIXED",
        actor_id=actor.id,
        reason=f"Code fix completed: {payload.resolution_notes}",
    ))

    # Move to SIT_IN_PROGRESS automatically
    d.status = "SIT_IN_PROGRESS"
    db.add(DefectStatusHistory(
        defect_id=d.id,
        previous_status="FIXED",
        new_status="SIT_IN_PROGRESS",
        actor_id=actor.id,
        reason="Developer SIT verification started",
    ))

    await db.commit()
    return {"id": str(d.id), "status": d.status, "message": "Defect fixed and queued for SIT"}


@router.post("/{defect_id}/sit-verify")
async def sit_verify_defect(
    defect_id: uuid.UUID,
    payload: DefectSITVerify,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    d = await db.get(Defect, defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    now = datetime.now(UTC)
    if payload.sit_result == "PASS":
        d.status = "READY_FOR_UAT_DEPLOYMENT"
        d.sit_passed_at = now
        db.add(DefectStatusHistory(
            defect_id=d.id,
            previous_status="SIT_IN_PROGRESS",
            new_status="READY_FOR_UAT_DEPLOYMENT",
            actor_id=actor.id,
            reason=f"Developer SIT passed: {payload.sit_notes}. Ready for SRN release selection.",
        ))
    else:
        d.status = "IN_PROGRESS"
        db.add(DefectStatusHistory(
            defect_id=d.id,
            previous_status="SIT_IN_PROGRESS",
            new_status="IN_PROGRESS",
            actor_id=actor.id,
            reason=f"Developer SIT failed: {payload.sit_notes}. Returned to developer for fix.",
        ))

    await db.commit()
    return {"id": str(d.id), "status": d.status, "message": f"SIT outcome: {payload.sit_result}"}


@router.post("/{defect_id}/retest")
async def retest_defect(
    defect_id: uuid.UUID,
    payload: DefectRetest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    d = await db.get(Defect, defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    now = datetime.now(UTC)
    prev = d.status

    if payload.retest_result == "PASS":
        d.status = "VERIFIED"
        d.verified_at = now
        db.add(DefectStatusHistory(
            defect_id=d.id,
            previous_status=prev,
            new_status="VERIFIED",
            actor_id=actor.id,
            reason=f"UAT Retest passed: {payload.retest_notes}",
        ))
        # Advance to CLOSED
        d.status = "CLOSED"
        d.closed_at = now
        db.add(DefectStatusHistory(
            defect_id=d.id,
            previous_status="VERIFIED",
            new_status="CLOSED",
            actor_id=actor.id,
            reason="Defect verified and closed by UAT",
        ))
    else:
        d.status = "REOPENED"
        db.add(DefectStatusHistory(
            defect_id=d.id,
            previous_status=prev,
            new_status="REOPENED",
            actor_id=actor.id,
            reason=f"UAT Retest failed: {payload.retest_notes}. Problem still reproducible.",
        ))
        # Notify assigned developer
        if d.assigned_developer_id:
            db.add(NotificationEvent(
                recipient_id=d.assigned_developer_id,
                title=f"Bug Reopened: {d.bug_number}",
                message=f"{d.bug_number} failed UAT verification and was reopened by {actor.display_name}. Reason: {payload.retest_notes}",
                entity_type="defect",
                entity_id=d.id,
            ))

    await db.commit()
    return {"id": str(d.id), "status": d.status, "message": f"Retest outcome: {payload.retest_result}"}
