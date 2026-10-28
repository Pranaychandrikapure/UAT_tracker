from app.schemas.change_request import (
    BAGatekeepRequest,
    ProductionArtifactsRead,
    SRNApproveRequest,
    SRNReviewRequest,
)
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import (
    CRActivity,
    ChangeRequest,
    Defect,
    DevTask,
    EmailMessage,
    EmailThread,
    Project,
    Release,
    SRNDocument,
    SRNItem,
    User,
)
from app.services.email_service import EmailServiceError, send_srn_email
from app.services.srn_service import (
    SRNServiceError,
    generate_srn_draft,
    get_ready_for_uat_items,
)

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


class DraftItemInput(BaseModel):
    id: str
    item_type: str = Field(pattern=r"^(CR_CHANGE|BUG_FIX)$")
    item_key: str | None = None


class SRNDraftRequest(BaseModel):
    selected_items: list[DraftItemInput]
    release_version: str = Field(default="v2.15.0", max_length=64)
    target_environment: str = Field(default="UAT", max_length=32)


class SRNSendRequest(BaseModel):
    srn_id: uuid.UUID
    thread_option: str = Field(default="AUTO", pattern=r"^(AUTO|MASTER_THREAD|NEW_THREAD)$")
    selected_thread_id: uuid.UUID | None = None
    email_recipients_to: str | None = None
    email_recipients_cc: str | None = None
    email_subject: str | None = None
    rendered_email_body: str | None = None


@router.get("/ready-items")
async def list_ready_for_uat_items(
    db: DbSession,
    project_id: uuid.UUID | None = Query(None),
) -> list[dict]:
    """Retrieve all eligible CR changes and Bug Fixes ready for SRN release selection."""
    return await get_ready_for_uat_items(db, project_id)


@router.post("/draft")
async def create_srn_draft(
    payload: SRNDraftRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """Generate consolidated SRN draft and email preview from selected eligible items."""
    try:
        return await generate_srn_draft(
            db=db,
            selected_items=[it.model_dump() for it in payload.selected_items],
            actor_id=actor.id,
            release_version=payload.release_version,
            target_environment=payload.target_environment,
        )
    except SRNServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/send")
async def dispatch_srn(
    payload: SRNSendRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """Send SRN email in the same email conversation thread."""
    srn = await db.get(SRNDocument, payload.srn_id)
    if not srn:
        raise HTTPException(status_code=404, detail="SRN document not found")

    if payload.email_recipients_to:
        srn.email_recipients_to = payload.email_recipients_to
    if payload.email_recipients_cc:
        srn.email_recipients_cc = payload.email_recipients_cc
    if payload.email_subject:
        srn.email_subject = payload.email_subject
    if payload.rendered_email_body:
        srn.rendered_email_body = payload.rendered_email_body
    await db.flush()

    try:
        return await send_srn_email(
            db=db,
            srn_id=payload.srn_id,
            actor_id=actor.id,
            thread_option=payload.thread_option,
            selected_thread_id=payload.selected_thread_id,
        )
    except EmailServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/documents")
async def list_srn_documents(
    db: DbSession,
    project_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None),
) -> list[dict]:
    query = (
        select(SRNDocument, Release, User, Project)
        .outerjoin(Release, Release.id == SRNDocument.release_id)
        .outerjoin(User, User.id == SRNDocument.created_by_user_id)
        .outerjoin(Project, Project.id == SRNDocument.project_id)
    )
    if project_id:
        query = query.where(SRNDocument.project_id == project_id)
    if status_filter and status_filter != "All":
        query = query.where(SRNDocument.status == status_filter)

    rows = (await db.execute(query.order_by(SRNDocument.created_at.desc()))).all()
    results = []
    for s, rel, u, p in rows:
        item_count = await db.scalar(
            select(SRNItem.id).where(SRNItem.srn_id == s.id)
        )
        results.append({
            "id": str(s.id),
            "srn_number": s.srn_number,
            "title": s.title,
            "release_version": s.release_version or (rel.version if rel else "v2.14.0"),
            "target_environment": s.target_environment,
            "status": s.status,
            "project_name": p.name if p else "Enterprise",
            "author_name": u.display_name if u else "System",
            "email_subject": s.email_subject,
            "recipients_to": s.email_recipients_to,
            "provider_message_id": s.provider_message_id,
            "sent_at": s.sent_at.isoformat() if s.sent_at else None,
            "created_at": s.created_at.isoformat(),
        })
    return results


@router.get("/documents/{srn_id}")
async def get_srn_document_detail(srn_id: uuid.UUID, db: DbSession) -> dict:
    s = await db.get(SRNDocument, srn_id)
    if not s:
        raise HTTPException(status_code=404, detail="SRN document not found")

    rel = await db.get(Release, s.release_id) if s.release_id else None
    author = await db.get(User, s.created_by_user_id) if s.created_by_user_id else None
    proj = await db.get(Project, s.project_id) if s.project_id else None
    thread = await db.get(EmailThread, s.email_thread_id) if s.email_thread_id else None

    # Load items
    items = (await db.scalars(select(SRNItem).where(SRNItem.srn_id == srn_id))).all()
    item_list = []
    for it in items:
        cr = await db.get(ChangeRequest, it.cr_id)
        defect = await db.get(Defect, it.defect_id) if it.defect_id else None
        task = await db.get(DevTask, it.dev_task_id) if it.dev_task_id else None
        item_list.append({
            "id": str(it.id),
            "item_type": it.item_type,
            "cr_number": cr.reference_number if cr else None,
            "cr_title": cr.title if cr else None,
            "key": defect.bug_number if defect else (task.task_number if task else "CR Item"),
            "title": defect.title if defect else (task.title if task else "Item"),
            "fix_summary": it.fix_summary,
            "status": it.status,
        })

    return {
        "id": str(s.id),
        "srn_number": s.srn_number,
        "title": s.title,
        "target_environment": s.target_environment,
        "release_version": s.release_version,
        "change_summary": s.change_summary,
        "module_changes": s.module_changes,
        "technical_notes": s.technical_notes,
        "sit_summary": s.sit_summary,
        "deployment_instructions": s.deployment_instructions,
        "rollback_notes": s.rollback_notes,
        "status": s.status,
        "author_name": author.display_name if author else None,
        "project_name": proj.name if proj else None,
        "email_subject": s.email_subject,
        "email_recipients_to": s.email_recipients_to,
        "email_recipients_cc": s.email_recipients_cc,
        "rendered_email_body": s.rendered_email_body,
        "provider_message_id": s.provider_message_id,
        "sent_at": s.sent_at.isoformat() if s.sent_at else None,
        "thread": {
            "id": str(thread.id),
            "subject": thread.original_subject,
            "root_message_id": thread.root_message_id,
            "latest_message_id": thread.latest_message_id,
        } if thread else None,
        "items": item_list,
    }



@router.post("/{srn_id}/pm-review", response_model=dict)
async def review_srn_by_pm(
    srn_id: uuid.UUID,
    payload: SRNReviewRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    srn = await db.get(SRNDocument, srn_id)
    if not srn:
        raise HTTPException(status_code=404, detail="SRN document not found")

    srn.reviewer_pm_id = actor.id
    srn.reviewed_at = datetime.now(UTC)
    srn.pm_review_remarks = payload.remarks
    srn.approval_stage = "PM_REVIEWED" if payload.status == "REVIEWED" else "REJECTED"

    items = (await db.scalars(select(SRNItem).where(SRNItem.srn_id == srn_id))).all()
    for it in items:
        if it.cr_id:
            cr = await db.get(ChangeRequest, it.cr_id)
            if cr:
                db.add(CRActivity(
                    cr_id=cr.id,
                    cr_ref=cr.reference_number,
                    event_type="SRN_REVIEW",
                    actor_name=actor.display_name,
                    actor_role="Project Manager",
                    details=f"SRN {srn.srn_number} reviewed by PM ({payload.status}). Remarks: {payload.remarks or 'Approved'}",
                ))
    await db.commit()
    return {"status": "SUCCESS", "approval_stage": srn.approval_stage, "srn_id": str(srn.id)}


@router.post("/{srn_id}/spm-approve", response_model=dict)
async def approve_srn_by_spm(
    srn_id: uuid.UUID,
    payload: SRNApproveRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    srn = await db.get(SRNDocument, srn_id)
    if not srn:
        raise HTTPException(status_code=404, detail="SRN document not found")

    srn.approver_spm_id = actor.id
    srn.approved_at = datetime.now(UTC)
    srn.spm_approval_remarks = payload.remarks
    srn.approval_stage = "SPM_APPROVED" if payload.status == "APPROVED" else "REJECTED"

    items = (await db.scalars(select(SRNItem).where(SRNItem.srn_id == srn_id))).all()
    for it in items:
        if it.cr_id:
            cr = await db.get(ChangeRequest, it.cr_id)
            if cr:
                db.add(CRActivity(
                    cr_id=cr.id,
                    cr_ref=cr.reference_number,
                    event_type="SRN_APPROVE",
                    actor_name=actor.display_name,
                    actor_role="Senior Project Manager",
                    details=f"SRN {srn.srn_number} formally approved by SPM. Remarks: {payload.remarks or 'Ready for BA Gatekeeper'}",
                ))
    await db.commit()
    return {"status": "SUCCESS", "approval_stage": srn.approval_stage, "srn_id": str(srn.id)}


@router.post("/{srn_id}/ba-gatekeep", response_model=dict)
async def gatekeep_srn_by_ba(
    srn_id: uuid.UUID,
    payload: BAGatekeepRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    srn = await db.get(SRNDocument, srn_id)
    if not srn:
        raise HTTPException(status_code=404, detail="SRN document not found")

    srn.ba_gatekeeper_id = actor.id
    srn.ba_approved_at = datetime.now(UTC)
    srn.ba_hold_reason = payload.remarks
    srn.ba_hold_until = payload.hold_until_date
    srn.approval_stage = "BA_GATEKEEP_PASSED" if payload.action == "PASS" else "BA_HELD"

    items = (await db.scalars(select(SRNItem).where(SRNItem.srn_id == srn_id))).all()
    for it in items:
        if it.cr_id:
            cr = await db.get(ChangeRequest, it.cr_id)
            if cr:
                db.add(CRActivity(
                    cr_id=cr.id,
                    cr_ref=cr.reference_number,
                    event_type="BA_GATEKEEP",
                    actor_name=actor.display_name,
                    actor_role="BA Gatekeeper",
                    details=f"SRN {srn.srn_number} gatekeep action: {payload.action}. Remarks: {payload.remarks or 'Requirements verified'}",
                ))
    await db.commit()
    return {"status": "SUCCESS", "approval_stage": srn.approval_stage, "srn_id": str(srn.id)}


@router.post("/cr/{cr_id}/production-artifacts", response_model=ProductionArtifactsRead)
async def generate_cr_production_artifacts(
    cr_id: uuid.UUID,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    from app.services.srn_service import generate_production_package
    artifacts = await generate_production_package(db, cr_id)
    cr = await db.get(ChangeRequest, cr_id)
    if cr:
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="PROD_ARTIFACTS",
            actor_name=actor.display_name,
            actor_role=actor.role_title or "Release Coordinator",
            details="Phase 5.2 Production Release Package generated (Production SRN, Deployment Checklist, RFC Document).",
        ))
        await db.commit()
    return artifacts
