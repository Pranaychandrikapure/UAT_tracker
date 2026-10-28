import json
import uuid
from datetime import UTC, datetime
from typing import Annotated

import os
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import (
    AuditLog,
    ChangeRequest,
    CRActivity,
    CRAttachment,
    CRDiscussion,
    CRDiscussionMessage,
    CRImpactedModule,
    CRStakeholder,
    CRStatusHistory,
    DeadlineNegotiation,
    Defect,
    DevTask,
    EmailThread,
    ImpactAssessment,
    ModuleScreen,
    NotificationEvent,
    OutboxEvent,
    Permission,
    Project,
    ProjectMember,
    ProjectModule,
    RolePermission,
    ScopeChangeProposal,
    User,
    UserRoleAssignment,
)
from app.schemas.change_request import (
    AssignDevelopersPayload,
    BAVerifyPayload,
    ChangeRequestApproveHoldInput,
    ChangeRequestAssignStakeholder,
    ChangeRequestCreate,
    ChangeRequestDetailRead,
    ChangeRequestHoldInput,
    ChangeRequestList,
    ChangeRequestRead,
    ChangeRequestTransition,
    ChangeRequestUpdate,
    CRActivityRead,
    CRAttachmentLinkPayload,
    CRAttachmentRead,
    CRDiscussionComment,
    CRDiscussionCreate,
    CRDiscussionEscalate,
    CRDiscussionMessageRead,
    CRDiscussionRead,
    CRDiscussionResolve,
    DeadlineNegotiateApprove,
    DeadlineNegotiateRequest,
    DevTaskCompleteRequest,
    ImpactAssessmentCreate,
    ImpactAssessmentRead,
    ManagementReviewActionPayload,
    PLHandleManagementChangesPayload,
    PLReviewActionPayload,
    PLReviewRequest,
    ScopeChangeCreate,
)
from app.services.cr_workflow import InvalidCRTransition, validate_transition

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def active_actor(
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
        actor = await db.scalar(
            select(User).where(
                (User.email.ilike(raw_id)) |
                (User.username.ilike(raw_id)) |
                (User.employee_code.ilike(raw_id))
            ).limit(1)
        )
        if actor and actor.is_active:
            return actor
    # Fallback in local dev/demo
    actor = await db.scalar(
        select(User).where(User.is_active.is_(True)).order_by(User.employee_code.asc()).limit(1)
    )
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
        raise HTTPException(status_code=401, detail="No active actor available")
    return actor


async def actor_permissions(db: AsyncSession, actor_id: uuid.UUID, project_id: uuid.UUID) -> set[str]:
    rows = await db.scalars(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRoleAssignment, UserRoleAssignment.role_id == RolePermission.role_id)
        .where(
            UserRoleAssignment.user_id == actor_id,
            UserRoleAssignment.is_active.is_(True),
            or_(UserRoleAssignment.project_id.is_(None), UserRoleAssignment.project_id == project_id),
        )
    )
    perms = set(rows)
    # Grant basic CR view/manage permissions by default in dev environment if none configured
    if not perms:
        perms = {"cr.create", "cr.view_all", "cr.submit", "cr.assign_pm", "cr.assess_impact", "cr.propose_deadline", "cr.approve_baseline", "cr.start_development", "cr.close"}
    return perms


@router.get("", response_model=ChangeRequestList)
async def list_change_requests(
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    project_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None),
    priority_filter: str | None = Query(None),
    source_filter: str | None = Query(None),
    search: str | None = Query(None),
) -> ChangeRequestList:
    scope = select(ChangeRequest)
    count_scope = select(func.count()).select_from(ChangeRequest)

    if project_id:
        scope = scope.where(ChangeRequest.project_id == project_id)
        count_scope = count_scope.where(ChangeRequest.project_id == project_id)
    if status_filter and status_filter != "All":
        scope = scope.where(ChangeRequest.status == status_filter)
        count_scope = count_scope.where(ChangeRequest.status == status_filter)
    if priority_filter and priority_filter != "All":
        scope = scope.where(ChangeRequest.priority == priority_filter)
        count_scope = count_scope.where(ChangeRequest.priority == priority_filter)
    if source_filter and source_filter != "All":
        scope = scope.where(ChangeRequest.source == source_filter)
        count_scope = count_scope.where(ChangeRequest.source == source_filter)
    if search:
        term = f"%{search}%"
        scope = scope.where(or_(ChangeRequest.reference_number.ilike(term), ChangeRequest.title.ilike(term), ChangeRequest.description.ilike(term)))
        count_scope = count_scope.where(or_(ChangeRequest.reference_number.ilike(term), ChangeRequest.title.ilike(term), ChangeRequest.description.ilike(term)))

    total = await db.scalar(count_scope)
    records = (await db.scalars(scope.order_by(ChangeRequest.updated_at.desc()).limit(limit).offset(offset))).all()

    items = []
    for r in records:
        proj = await db.get(Project, r.project_id)
        ba = await db.get(User, r.ba_user_id)
        pm = await db.get(User, r.primary_pm_id) if r.primary_pm_id else None
        pl = await db.get(User, r.pl_user_id) if r.pl_user_id else None
        spm = await db.get(User, r.spm_user_id) if r.spm_user_id else None
        assigned_ba = await db.get(User, r.assigned_ba_id) if r.assigned_ba_id else None
        item_dict = {
            "id": r.id,
            "reference_number": r.reference_number,
            "project_id": r.project_id,
            "project_name": proj.name if proj else None,
            "source": r.source,
            "external_record_id": r.external_record_id,
            "external_owner_name": r.external_owner_name,
            "ba_user_id": r.ba_user_id,
            "ba_user_name": ba.display_name if ba else None,
            "primary_pm_id": r.primary_pm_id,
            "primary_pm_name": pm.display_name if pm else None,
            "pl_user_id": r.pl_user_id,
            "pl_user_name": pl.display_name if pl else None,
            "spm_user_id": r.spm_user_id,
            "spm_user_name": spm.display_name if spm else None,
            "assigned_ba_id": r.assigned_ba_id,
            "assigned_ba_name": assigned_ba.display_name if assigned_ba else None,
            "revert_reason": r.revert_reason,
            "reverted_by_role": r.reverted_by_role,
            "reverted_by_user_id": r.reverted_by_user_id,
            "review_notes": r.review_notes,
            "management_review_status": r.management_review_status or "PENDING",
            "screen_name": r.screen_name,
            "screen_type": r.screen_type or "EXISTING",
            "is_uat_unlocked": r.is_uat_unlocked,
            "pl_review_status": r.pl_review_status or "PENDING",
            "escalation_reason": r.escalation_reason,
            "title": r.title,
            "description": r.description,
            "business_justification": r.business_justification,
            "priority": r.priority,
            "status": r.status,
            "requested_deadline": r.requested_deadline,
            "pm_proposed_deadline": r.pm_proposed_deadline,
            "approved_deadline": r.approved_deadline,
            "dev_target_date": r.dev_target_date,
            "sit_target_date": r.sit_target_date,
            "uat_target_date": r.uat_target_date,
            "prod_target_date": r.prod_target_date,
            "dev_completed_at": r.dev_completed_at,
            "sit_completed_at": r.sit_completed_at,
            "srn_sent_at": r.srn_sent_at,
            "uat_deployed_at": r.uat_deployed_at,
            "uat_signed_off_at": r.uat_signed_off_at,
            "business_accepted_at": r.business_accepted_at,
            "prod_deployed_at": r.prod_deployed_at,
            "closed_at": r.closed_at,
            "current_scope_version": r.current_scope_version,
            "hold_reason": r.hold_reason,
            "hold_until_date": r.hold_until_date,
            "hold_status": r.hold_status,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }
        items.append(ChangeRequestRead(**item_dict))

    return ChangeRequestList(items=items, total=total or 0, limit=limit, offset=offset)


@router.get("/activities", response_model=list[CRActivityRead])
async def list_all_activities(
    db: DbSession,
    cr_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[CRActivity]:
    query = select(CRActivity).order_by(CRActivity.created_at.desc()).limit(limit)
    if cr_id:
        query = query.where(CRActivity.cr_id == cr_id)
    records = (await db.scalars(query)).all()
    return list(records)


@router.get("/{cr_id}", response_model=ChangeRequestDetailRead)
async def get_change_request_detail(
    cr_id: uuid.UUID,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> ChangeRequestDetailRead:
    record = await db.get(ChangeRequest, cr_id)
    if not record:
        raise HTTPException(status_code=404, detail="Change request not found")

    proj = await db.get(Project, record.project_id)
    ba = await db.get(User, record.ba_user_id)
    pm = await db.get(User, record.primary_pm_id) if record.primary_pm_id else None

    # Load stakeholders
    sh_rows = (await db.scalars(select(CRStakeholder).where(CRStakeholder.cr_id == cr_id))).all()
    stakeholders_list = []
    for sh in sh_rows:
        u = await db.get(User, sh.user_id)
        stakeholders_list.append({
            "id": str(sh.id),
            "user_id": str(sh.user_id),
            "user_name": u.display_name if u else "Unknown",
            "user_role": u.role_title if u else None,
            "responsibility": sh.responsibility,
            "is_primary": sh.is_primary,
            "effective_from": sh.effective_from.isoformat() if sh.effective_from else None,
            "assignment_reason": sh.assignment_reason,
        })

    # Load impact assessment
    ia = await db.scalar(select(ImpactAssessment).where(ImpactAssessment.cr_id == cr_id))
    ia_dict = None
    if ia:
        assessor = await db.get(User, ia.assessed_by_user_id)
        ia_dict = {
            "id": str(ia.id),
            "dev_complexity": ia.dev_complexity,
            "functional_changes": ia.functional_changes,
            "db_changes": ia.db_changes,
            "api_changes": ia.api_changes,
            "frontend_changes": ia.frontend_changes,
            "third_party_integrations": ia.third_party_integrations,
            "dependency_risks": ia.dependency_risks,
            "developers_required": ia.developers_required,
            "est_dev_hours": ia.est_dev_hours,
            "est_sit_hours": ia.est_sit_hours,
            "est_uat_hours": ia.est_uat_hours,
            "est_bugfix_buffer_hours": ia.est_bugfix_buffer_hours,
            "proposed_delivery_date": str(ia.proposed_delivery_date) if ia.proposed_delivery_date else None,
            "release_prep_notes": ia.release_prep_notes,
            "technical_explanation": ia.technical_explanation,
            "assessor_name": assessor.display_name if assessor else None,
            "assessed_at": ia.assessed_at.isoformat() if ia.assessed_at else None,
        }

    # Load deadline negotiations
    dns = (await db.scalars(select(DeadlineNegotiation).where(DeadlineNegotiation.cr_id == cr_id).order_by(DeadlineNegotiation.created_at.desc()))).all()
    dn_list = []
    for d in dns:
        req_u = await db.get(User, d.requested_by_user_id)
        resp_u = await db.get(User, d.responded_by_user_id) if d.responded_by_user_id else None
        dn_list.append({
            "id": str(d.id),
            "requested_by_name": req_u.display_name if req_u else None,
            "proposed_deadline": str(d.proposed_deadline),
            "current_approved_deadline": str(d.current_approved_deadline) if d.current_approved_deadline else None,
            "revision_reason": d.revision_reason,
            "status": d.status,
            "response_notes": d.response_notes,
            "responded_by_name": resp_u.display_name if resp_u else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    # Load scope changes
    scs = (await db.scalars(select(ScopeChangeProposal).where(ScopeChangeProposal.cr_id == cr_id).order_by(ScopeChangeProposal.version.desc()))).all()
    sc_list = [{
        "id": str(s.id),
        "version": s.version,
        "title": s.title,
        "description": s.description,
        "source": s.source,
        "status": s.status,
        "additional_effort_hours": s.additional_effort_hours,
    } for s in scs]

    # Load tasks
    ts = (await db.scalars(select(DevTask).where(DevTask.cr_id == cr_id))).all()
    task_list = []
    for t in ts:
        dev_u = await db.get(User, t.assigned_developer_id) if t.assigned_developer_id else None
        task_list.append({
            "id": str(t.id),
            "task_number": t.task_number,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "assigned_developer": dev_u.display_name if dev_u else "Unassigned",
            "estimated_hours": t.estimated_hours,
            "actual_hours": t.actual_hours,
            "blockers": t.blockers,
            "due_date": str(t.due_date) if t.due_date else None,
            "screen_name": t.screen_name,
            "is_overdue": t.is_overdue,
            "overdue_reason": t.overdue_reason,
        })

    # Load defects
    dfs = (await db.scalars(select(Defect).where(Defect.cr_id == cr_id))).all()
    defect_list = []
    for df in dfs:
        dev_u = await db.get(User, df.assigned_developer_id) if df.assigned_developer_id else None
        defect_list.append({
            "id": str(df.id),
            "bug_number": df.bug_number,
            "title": df.title,
            "severity": df.severity,
            "priority": df.priority,
            "status": df.status,
            "assigned_developer": dev_u.display_name if dev_u else "Unassigned",
        })

    # Load history
    hist = (await db.scalars(select(CRStatusHistory).where(CRStatusHistory.cr_id == cr_id).order_by(CRStatusHistory.changed_at.desc()))).all()
    hist_list = []
    for h in hist:
        act = await db.get(User, h.actor_id)
        hist_list.append({
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "actor_name": act.display_name if act else "System",
            "reason": h.reason,
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
        })

    # Load email thread
    thread = await db.scalar(select(EmailThread).where(EmailThread.cr_id == cr_id).limit(1))
    thread_dict = None
    if thread:
        thread_dict = {
            "id": str(thread.id),
            "mailbox": thread.mailbox,
            "subject": thread.original_subject,
            "root_message_id": thread.root_message_id,
            "latest_message_id": thread.latest_message_id,
        }

    # Fetch attachments
    attachments_records = (await db.scalars(
        select(CRAttachment).where(CRAttachment.cr_id == cr_id).order_by(CRAttachment.created_at.desc())
    )).all()
    attachments_list = [
        {
            "id": str(a.id),
            "uploader_id": str(a.uploader_id) if a.uploader_id else None,
            "uploader_name": a.uploader_name,
            "file_type": a.file_type,
            "original_name": a.original_name,
            "file_url": a.file_url,
            "file_size_bytes": a.file_size_bytes,
            "file_format": a.file_format,
            "note": a.note,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in attachments_records
    ]

    # Fetch discussions and their messages
    discussions_records = (await db.scalars(
        select(CRDiscussion).where(CRDiscussion.cr_id == cr_id).order_by(CRDiscussion.created_at.desc())
    )).all()
    discussions_list = []
    for disc in discussions_records:
        disc_msgs = (await db.scalars(
            select(CRDiscussionMessage).where(CRDiscussionMessage.discussion_id == disc.id).order_by(CRDiscussionMessage.created_at.asc())
        )).all()
        discussions_list.append({
            "id": str(disc.id),
            "cr_id": str(disc.cr_id),
            "task_id": str(disc.task_id) if disc.task_id else None,
            "developer_id": str(disc.developer_id),
            "developer_name": disc.developer_name,
            "title": disc.title,
            "concern_text": disc.concern_text,
            "priority": disc.priority,
            "current_level": disc.current_level,
            "status": disc.status,
            "assigned_role": disc.assigned_role,
            "assigned_user_id": str(disc.assigned_user_id) if disc.assigned_user_id else None,
            "resolution_notes": disc.resolution_notes,
            "resolved_by_id": str(disc.resolved_by_id) if disc.resolved_by_id else None,
            "resolved_at": disc.resolved_at.isoformat() if disc.resolved_at else None,
            "created_at": disc.created_at.isoformat() if disc.created_at else None,
            "messages": [
                {
                    "id": str(m.id),
                    "discussion_id": str(m.discussion_id),
                    "sender_id": str(m.sender_id),
                    "sender_name": m.sender_name,
                    "sender_role": m.sender_role,
                    "action": m.action,
                    "message": m.message,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in disc_msgs
            ],
        })

    # Fetch full activities audit trail
    activities_records = (await db.scalars(
        select(CRActivity).where(CRActivity.cr_id == cr_id).order_by(CRActivity.created_at.desc())
    )).all()
    activities_list = [
        {
            "id": str(act.id),
            "cr_id": str(act.cr_id),
            "cr_ref": act.cr_ref,
            "event_type": act.event_type,
            "actor_name": act.actor_name,
            "actor_role": act.actor_role,
            "details": act.details,
            "created_at": act.created_at.isoformat() if act.created_at else None,
        }
        for act in activities_records
    ]

    assigned_ba_user = await db.get(User, record.assigned_ba_id) if record.assigned_ba_id else None

    return ChangeRequestDetailRead(
        id=record.id,
        reference_number=record.reference_number,
        project_id=record.project_id,
        project_name=proj.name if proj else None,
        source=record.source,
        external_record_id=record.external_record_id,
        external_owner_name=record.external_owner_name,
        ba_user_id=record.ba_user_id,
        ba_user_name=ba.display_name if ba else None,
        primary_pm_id=record.primary_pm_id,
        primary_pm_name=pm.display_name if pm else None,
        pl_user_id=record.pl_user_id,
        pl_user_name=pl.display_name if (pl := await db.get(User, record.pl_user_id)) else None,
        spm_user_id=record.spm_user_id,
        spm_user_name=spm.display_name if (spm := await db.get(User, record.spm_user_id)) else None,
        assigned_ba_id=record.assigned_ba_id,
        assigned_ba_name=assigned_ba_user.display_name if assigned_ba_user else None,
        revert_reason=record.revert_reason,
        reverted_by_role=record.reverted_by_role,
        reverted_by_user_id=record.reverted_by_user_id,
        review_notes=record.review_notes,
        management_review_status=record.management_review_status or "PENDING",
        screen_name=record.screen_name,
        screen_type=record.screen_type or "EXISTING",
        is_uat_unlocked=record.is_uat_unlocked,
        pl_review_status=record.pl_review_status or "PENDING",
        escalation_reason=record.escalation_reason,
        title=record.title,
        description=record.description,
        business_justification=record.business_justification,
        priority=record.priority,
        status=record.status,
        requested_deadline=record.requested_deadline,
        pm_proposed_deadline=record.pm_proposed_deadline,
        approved_deadline=record.approved_deadline,
        dev_target_date=record.dev_target_date,
        sit_target_date=record.sit_target_date,
        uat_target_date=record.uat_target_date,
        prod_target_date=record.prod_target_date,
        dev_completed_at=record.dev_completed_at,
        sit_completed_at=record.sit_completed_at,
        srn_sent_at=record.srn_sent_at,
        uat_deployed_at=record.uat_deployed_at,
        uat_signed_off_at=record.uat_signed_off_at,
        business_accepted_at=record.business_accepted_at,
        prod_deployed_at=record.prod_deployed_at,
        closed_at=record.closed_at,
        current_scope_version=record.current_scope_version,
        hold_reason=record.hold_reason,
        hold_until_date=record.hold_until_date,
        hold_status=record.hold_status,
        created_at=record.created_at,
        updated_at=record.updated_at,
        stakeholders=stakeholders_list,
        impact_assessment=ia_dict,
        deadline_negotiations=dn_list,
        scope_changes=sc_list,
        tasks=task_list,
        defects=defect_list,
        status_history=hist_list,
        email_thread=thread_dict,
        attachments=attachments_list,
        discussions=discussions_list,
        activities=activities_list,
    )


@router.post("", response_model=ChangeRequestRead, status_code=status.HTTP_201_CREATED)
async def create_change_request(
    payload: ChangeRequestCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> ChangeRequest:
    project = await db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=422, detail="Unknown project")

    # Enforce strict role restriction: ONLY Business Analysts (BA) or BA Leads can create Change Requests.
    # Developers, Administrators, Project Managers, and Testers cannot author CRs.
    role_title = (actor.role_title or "").upper()
    is_ba = "BUSINESS ANALYST" in role_title or "BUSINESS_ANALYST" in role_title or "BA" in role_title
    if not is_ba:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Business Analysts (BA) or BA Leads are authorized to create Change Requests. Developers, Administrators, Leads, PMs, and Testers cannot author CRs.",
        )

    is_ba_lead = "LEAD" in role_title
    assigned_ba_user = actor

    # If created internally by BA Lead, assign to mapped BA according to project
    if is_ba_lead:
        mapped_ba = await db.scalar(
            select(User)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .where(
                ProjectMember.project_id == payload.project_id,
                or_(
                    User.role_title.ilike("%Business Analyst%"),
                    User.role_title.ilike("%BA%"),
                ),
                User.id != actor.id,
                User.is_active.is_(True),
            )
            .limit(1)
        )
        if mapped_ba:
            assigned_ba_user = mapped_ba

    now = datetime.now(UTC)
    reference = f"CR-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    record = ChangeRequest(
        reference_number=reference,
        project_id=payload.project_id,
        source="INTERNAL",
        ba_user_id=assigned_ba_user.id,
        assigned_ba_id=assigned_ba_user.id,
        primary_pm_id=payload.primary_pm_id,
        title=payload.title,
        description=payload.description,
        business_justification=payload.business_justification,
        priority=payload.priority,
        status="PENDING_BA_VERIFICATION",
        requested_deadline=payload.requested_deadline,
        current_scope_version=1,
        pl_user_id=payload.pl_user_id,
        screen_name=payload.screen_name,
        screen_type=payload.screen_type or "EXISTING",
        is_uat_unlocked=False,
        pl_review_status="PENDING",
    )
    db.add(record)
    await db.flush()

    # Link impacted modules if specified
    for mod_id in payload.impacted_module_ids:
        db.add(CRImpactedModule(cr_id=record.id, module_id=mod_id))

    # Auto-register screen/functionality under module if specified by BA
    if payload.screen_name and payload.impacted_module_ids:
        first_mod_id = payload.impacted_module_ids[0]
        clean_scr_name = payload.screen_name.strip()
        existing_scr = await db.scalar(
            select(ModuleScreen).where(
                ModuleScreen.module_id == first_mod_id,
                ModuleScreen.name.ilike(clean_scr_name),
            ).limit(1)
        )
        if not existing_scr:
            scr_code = clean_scr_name.upper().replace(" ", "_")[:64]
            new_scr = ModuleScreen(
                module_id=first_mod_id,
                code=scr_code,
                name=clean_scr_name,
                description="Auto-registered from Change Request creation.",
                screen_type=payload.screen_type.upper() if payload.screen_type else "EXISTING",
                is_active=True,
            )
            db.add(new_scr)

    # Create root email thread for this CR
    db.add(EmailThread(
        cr_id=record.id,
        provider="INTERNAL_SMTP",
        mailbox=f"cr-{project.code.lower()}@company.com",
        provider_thread_id=f"thread-{record.reference_number.lower()}",
        original_subject=f"[{record.reference_number}] {record.title}",
        root_message_id=f"<{record.reference_number.lower()}.root@company.com>",
        latest_message_id=f"<{record.reference_number.lower()}.root@company.com>",
    ))

    # Add initial stakeholders: assigned BA, and optional PM/Lead Dev
    stakeholders_to_add = [
        CRStakeholder(cr_id=record.id, user_id=assigned_ba_user.id, responsibility="BUSINESS_ANALYST", is_primary=True, assignment_reason="Assigned Project BA for verification"),
    ]
    if actor.id != assigned_ba_user.id:
        stakeholders_to_add.append(
            CRStakeholder(cr_id=record.id, user_id=actor.id, responsibility="BUSINESS_ANALYST", is_primary=False, assignment_reason="CR Author (BA Lead)")
        )
    if payload.primary_pm_id:
        stakeholders_to_add.append(
            CRStakeholder(cr_id=record.id, user_id=payload.primary_pm_id, responsibility="PRIMARY_PM", is_primary=True, assignment_reason="Assigned Primary PM at CR creation by BA")
        )
    if payload.lead_dev_id:
        stakeholders_to_add.append(
            CRStakeholder(cr_id=record.id, user_id=payload.lead_dev_id, responsibility="DEV_LEAD", is_primary=True, assignment_reason="Assigned Lead Developer at CR creation by BA")
        )

    creation_details = (
        f"CR authored by BA Lead {actor.display_name} and assigned to {assigned_ba_user.display_name} (BA) for functional verification."
        if is_ba_lead and actor.id != assigned_ba_user.id
        else f"CR authored by BA {actor.display_name} in pending verification."
    )

    db.add_all([
        *stakeholders_to_add,
        CRActivity(
            cr_id=record.id,
            cr_ref=reference,
            event_type="CR_CREATED_INTERNAL",
            actor_name=actor.display_name,
            actor_role=actor.role_title,
            details=creation_details,
        ),
        CRStatusHistory(cr_id=record.id, previous_status=None, new_status="PENDING_BA_VERIFICATION", actor_id=actor.id, reason=creation_details),
        AuditLog(actor_id=actor.id, entity_type="change_request", entity_id=record.id, action="CREATE", change_payload=json.dumps({"reference_number": reference, "assigned_ba": assigned_ba_user.display_name})),
        OutboxEvent(event_type="cr.created", aggregate_type="change_request", aggregate_id=record.id, payload=json.dumps({"cr_id": str(record.id), "reference_number": reference}), deduplication_key=f"cr.created:{record.id}"),
    ])
    await db.commit()
    await db.refresh(record)
    return record


@router.patch("/{cr_id}", response_model=ChangeRequestRead)
async def update_change_request(
    cr_id: uuid.UUID,
    payload: ChangeRequestUpdate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> ChangeRequest:
    record = await db.get(ChangeRequest, cr_id)
    if not record:
        raise HTTPException(status_code=404, detail="Change request not found")

    update_data = payload.model_dump(exclude_unset=True)
    prev_status = record.status
    for k, v in update_data.items():
        if v is not None:
            setattr(record, k, v)

    if "status" in update_data and update_data["status"] != prev_status:
        db.add(CRStatusHistory(
            cr_id=record.id,
            previous_status=prev_status,
            new_status=record.status,
            actor_id=actor.id,
            reason=f"Status updated via CR edit by {actor.display_name}",
        ))

    db.add(AuditLog(
        actor_id=actor.id,
        entity_type="change_request",
        entity_id=record.id,
        action="UPDATE",
        change_payload=json.dumps(update_data, default=str),
    ))
    await db.commit()
    await db.refresh(record)
    return record


@router.post("/{cr_id}/hold", response_model=dict)
async def hold_change_request(
    cr_id: uuid.UUID,
    payload: ChangeRequestHoldInput,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    prev = cr.status
    cr.status = "ON_HOLD"
    cr.hold_reason = payload.hold_reason
    cr.hold_until_date = payload.hold_until_date

    if payload.action_type == "REQUEST_HOLD":
        cr.hold_status = "PENDING_APPROVAL"
        db.add(NotificationEvent(
            recipient_id=cr.ba_user_id,
            title=f"Hold Approval Requested for {cr.reference_number}",
            message=f"UAT Lead ({actor.display_name}) requested ON HOLD until {payload.hold_until_date}. Remark: {payload.hold_reason}",
            entity_type="change_request",
            entity_id=cr.id,
        ))
    else:
        role_upper = (actor.role_title or "").upper()
        cr.hold_status = "ON_HOLD_UAT" if "UAT" in role_upper else "HELD_BY_BA"

    db.add_all([
        CRStatusHistory(
            cr_id=cr.id,
            previous_status=prev,
            new_status="ON_HOLD",
            actor_id=actor.id,
            reason=f"Hold set ({payload.action_type}): {payload.hold_reason} (Until: {payload.hold_until_date})",
        ),
        AuditLog(
            actor_id=actor.id,
            entity_type="change_request",
            entity_id=cr.id,
            action="HOLD",
            change_payload=json.dumps({
                "action_type": payload.action_type,
                "reason": payload.hold_reason,
                "until": str(payload.hold_until_date) if payload.hold_until_date else None,
            }),
        ),
    ])
    await db.commit()
    return {"status": "ON_HOLD", "hold_status": cr.hold_status, "hold_until": str(cr.hold_until_date)}


@router.post("/{cr_id}/approve-hold", response_model=dict)
async def approve_hold_change_request(
    cr_id: uuid.UUID,
    payload: ChangeRequestApproveHoldInput,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    prev_status = cr.status
    if payload.action == "APPROVE":
        cr.hold_status = "APPROVED_BY_BA"
        cr.status = "ON_HOLD"
        db.add(CRStatusHistory(
            cr_id=cr.id,
            previous_status=prev_status,
            new_status="ON_HOLD",
            actor_id=actor.id,
            reason=f"Hold approved by BA ({actor.display_name}): {payload.remarks}",
        ))
    else:
        cr.hold_status = "REJECTED_BY_BA" if payload.action == "REJECT" else "RELEASED"
        cr.status = "UAT"
        db.add(CRStatusHistory(
            cr_id=cr.id,
            previous_status="ON_HOLD",
            new_status="UAT",
            actor_id=actor.id,
            reason=f"Hold decision ({payload.action}) by {actor.display_name}. Resumed active UAT: {payload.remarks}",
        ))

    db.add(AuditLog(
        actor_id=actor.id,
        entity_type="change_request",
        entity_id=cr.id,
        action="HOLD_DECISION",
        change_payload=json.dumps({"decision": payload.action, "remarks": payload.remarks}),
    ))
    await db.commit()
    return {"status": cr.status, "hold_status": cr.hold_status, "decision": payload.action}


@router.post("/{cr_id}/transitions", response_model=ChangeRequestRead)
async def transition_change_request(
    cr_id: uuid.UUID,
    payload: ChangeRequestTransition,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> ChangeRequest:
    record = await db.get(ChangeRequest, cr_id, with_for_update=True)
    if record is None:
        raise HTTPException(status_code=404, detail="Change request not found")

    permissions = await actor_permissions(db, actor.id, record.project_id)
    try:
        validate_transition(record.status, payload.target_status, permissions, payload.reason)
    except InvalidCRTransition as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    previous = record.status
    record.status = payload.target_status
    now = datetime.now(UTC)

    # Record milestone timestamps
    if payload.target_status == "DEVELOPMENT" and not record.dev_target_date:
        record.dev_target_date = datetime.now(UTC).date()
    elif payload.target_status == "SIT":
        record.dev_completed_at = now
    elif payload.target_status == "UAT_READY":
        record.sit_completed_at = now
    elif payload.target_status == "UAT":
        record.uat_deployed_at = now
    elif payload.target_status == "UAT_SIGNED_OFF":
        record.uat_signed_off_at = now
    elif payload.target_status == "BUSINESS_ACCEPTANCE":
        record.business_accepted_at = now
    elif payload.target_status == "PRODUCTION_VERIFIED":
        record.prod_deployed_at = now
    elif payload.target_status == "CLOSED":
        record.closed_at = now

    db.add_all([
        CRStatusHistory(cr_id=record.id, previous_status=previous, new_status=record.status, actor_id=actor.id, reason=payload.reason),
        AuditLog(actor_id=actor.id, entity_type="change_request", entity_id=record.id, action="STATUS_CHANGE", change_payload=json.dumps({"from": previous, "to": record.status, "reason": payload.reason})),
        OutboxEvent(event_type="cr.status_changed", aggregate_type="change_request", aggregate_id=record.id, payload=json.dumps({"cr_id": str(record.id), "from": previous, "to": record.status}), deduplication_key=f"cr.status_changed:{record.id}:{previous}:{record.status}:{uuid.uuid4()}"),
    ])
    await db.commit()
    await db.refresh(record)
    return record


@router.post("/{cr_id}/assign-stakeholder", response_model=dict)
async def assign_cr_stakeholder(
    cr_id: uuid.UUID,
    payload: ChangeRequestAssignStakeholder,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    target_user = await db.get(User, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # If assigning Primary PM, enforce exactly one active primary PM
    if payload.responsibility == "PRIMARY_PM":
        # Unmark existing primary PM stakeholder
        existing_primary = (
            await db.scalars(
                select(CRStakeholder).where(
                    CRStakeholder.cr_id == cr_id,
                    CRStakeholder.responsibility == "PRIMARY_PM",
                    CRStakeholder.effective_to.is_(None),
                )
            )
        ).all()
        for ep in existing_primary:
            ep.effective_to = datetime.now(UTC)
            ep.is_primary = False

        cr.primary_pm_id = target_user.id
        if cr.status in ("SUBMITTED", "PENDING_PM_ASSIGNMENT"):
            cr.status = "REQUIREMENT_REVIEW"

    # Add stakeholder record
    sh = CRStakeholder(
        cr_id=cr_id,
        user_id=target_user.id,
        responsibility=payload.responsibility,
        is_primary=payload.is_primary or (payload.responsibility == "PRIMARY_PM"),
        assignment_reason=payload.assignment_reason or f"Assigned by {actor.display_name}",
    )
    db.add(sh)

    # Notify assigned user
    db.add(NotificationEvent(
        recipient_id=target_user.id,
        title=f"Assigned to {cr.reference_number}: {payload.responsibility}",
        message=f"You have been assigned as {payload.responsibility} on '{cr.title}' by {actor.display_name}.",
        entity_type="change_request",
        entity_id=cr.id,
    ))

    await db.commit()
    return {"status": "SUCCESS", "responsibility": payload.responsibility, "user_name": target_user.display_name}


@router.post("/{cr_id}/impact-assessment", response_model=dict)
async def create_impact_assessment(
    cr_id: uuid.UUID,
    payload: ImpactAssessmentCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    existing_ia = await db.scalar(select(ImpactAssessment).where(ImpactAssessment.cr_id == cr_id))
    if existing_ia:
        for k, v in payload.model_dump().items():
            setattr(existing_ia, k, v)
        existing_ia.assessed_by_user_id = actor.id
    else:
        new_ia = ImpactAssessment(
            cr_id=cr_id,
            assessed_by_user_id=actor.id,
            **payload.model_dump(),
        )
        db.add(new_ia)

    if payload.proposed_delivery_date:
        cr.pm_proposed_deadline = payload.proposed_delivery_date

    await db.commit()
    return {"status": "SUCCESS", "message": "Impact assessment recorded successfully"}


@router.post("/{cr_id}/negotiate-deadline", response_model=dict)
async def request_deadline_negotiation(
    cr_id: uuid.UUID,
    payload: DeadlineNegotiateRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    cr.pm_proposed_deadline = payload.proposed_deadline
    cr.status = "DEADLINE_REVIEW"

    neg = DeadlineNegotiation(
        cr_id=cr_id,
        requested_by_user_id=actor.id,
        requested_deadline=cr.requested_deadline,
        proposed_deadline=payload.proposed_deadline,
        current_approved_deadline=cr.approved_deadline,
        revision_reason=payload.revision_reason,
        status="PENDING_APPROVAL",
    )
    db.add(neg)

    # Notify BA
    db.add(NotificationEvent(
        recipient_id=cr.ba_user_id,
        title=f"Deadline Revision Requested for {cr.reference_number}",
        message=f"{actor.display_name} proposed revised delivery date of {payload.proposed_deadline}. Reason: {payload.revision_reason}",
        entity_type="deadline_negotiation",
        entity_id=neg.id,
    ))

    await db.commit()
    return {"status": "PENDING_APPROVAL", "proposed_deadline": str(payload.proposed_deadline)}


@router.post("/{cr_id}/respond-deadline", response_model=dict)
async def respond_deadline_negotiation(
    cr_id: uuid.UUID,
    payload: DeadlineNegotiateApprove,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    neg = await db.scalar(
        select(DeadlineNegotiation)
        .where(DeadlineNegotiation.cr_id == cr_id, DeadlineNegotiation.status == "PENDING_APPROVAL")
        .order_by(DeadlineNegotiation.created_at.desc())
    )
    if not neg:
        raise HTTPException(status_code=404, detail="No pending deadline negotiation found")

    neg.status = payload.action
    neg.response_notes = payload.response_notes
    neg.responded_by_user_id = actor.id
    neg.responded_at = datetime.now(UTC)

    if payload.action == "ACCEPTED":
        cr.approved_deadline = neg.proposed_deadline
        cr.status = "SCOPE_APPROVED"
    elif payload.action == "REJECTED":
        cr.status = "IMPACT_ASSESSMENT"

    await db.commit()
    return {"status": payload.action, "approved_deadline": str(cr.approved_deadline)}


@router.post("/{cr_id}/scope-changes", response_model=dict)
async def propose_scope_change(
    cr_id: uuid.UUID,
    payload: ScopeChangeCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    next_version = cr.current_scope_version + 1
    sc = ScopeChangeProposal(
        cr_id=cr_id,
        version=next_version,
        title=payload.title,
        description=payload.description,
        source="BUSINESS_REQUEST",
        additional_effort_hours=payload.additional_effort_hours,
        proposed_by_user_id=actor.id,
        status="PENDING_REVIEW",
    )
    db.add(sc)
    await db.commit()
    return {"status": "PENDING_REVIEW", "version": next_version}



@router.post("/{cr_id}/pl-accept", response_model=dict)
async def accept_cr_by_pl(
    cr_id: uuid.UUID,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    record = await db.get(ChangeRequest, cr_id)
    if not record:
        raise HTTPException(status_code=404, detail="Change Request not found")

    record.pl_review_status = "ACCEPTED"
    record.pl_user_id = actor.id
    if record.status in ("DRAFT", "BA_REVIEW", "PENDING_PL_REVIEW"):
        record.status = "DEVELOPMENT"

    db.add(CRActivity(
        cr_id=record.id,
        cr_ref=record.reference_number,
        event_type="PL_ACCEPT",
        actor_name=actor.display_name,
        actor_role="Project Lead",
        details="Technical feasibility verified and deadline accepted by Project Lead.",
    ))
    await db.commit()
    return {"status": "SUCCESS", "message": "CR accepted by Project Lead", "cr_id": str(record.id)}


@router.post("/{cr_id}/pl-escalate", response_model=dict)
async def escalate_cr_by_pl(
    cr_id: uuid.UUID,
    payload: PLReviewRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    record = await db.get(ChangeRequest, cr_id)
    if not record:
        raise HTTPException(status_code=404, detail="Change Request not found")

    record.pl_review_status = "ESCALATED"
    record.pl_user_id = actor.id
    record.escalation_reason = payload.reason or "Escalated by Project Lead for SPM review"

    db.add(CRActivity(
        cr_id=record.id,
        cr_ref=record.reference_number,
        event_type="PL_ESCALATE",
        actor_name=actor.display_name,
        actor_role="Project Lead",
        details=f"Escalated to PM/SPM: {payload.reason or 'Effort/deadline conflict'}",
    ))
    await db.commit()
    return {"status": "SUCCESS", "message": "CR escalated by Project Lead", "cr_id": str(record.id)}


@router.post("/tasks/{task_id}/complete", response_model=dict)
async def complete_dev_task(
    task_id: uuid.UUID,
    payload: DevTaskCompleteRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    task = await db.get(DevTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "DEVELOPMENT_COMPLETE"
    task.is_overdue = payload.is_overdue
    task.overdue_reason = payload.overdue_reason

    cr = await db.get(ChangeRequest, task.cr_id)
    cr_ref = cr.reference_number if cr else "CR"

    db.add(CRActivity(
        cr_id=task.cr_id,
        cr_ref=cr_ref,
        event_type="TASK_OVERDUE" if payload.is_overdue else "TASK_COMPLETE",
        actor_name=actor.display_name,
        actor_role="Developer",
        details=f"Task {task.task_number} completed. Overdue: {payload.is_overdue}. Reason: {payload.overdue_reason or 'Completed on schedule'}",
    ))
    await db.commit()
    return {"status": "SUCCESS", "message": "Task completed successfully", "task_id": str(task.id)}


@router.get("/{cr_id}/activities", response_model=list[CRActivityRead])
async def list_cr_activities(
    cr_id: uuid.UUID,
    db: DbSession,
) -> list[CRActivity]:
    query = select(CRActivity).where(CRActivity.cr_id == cr_id).order_by(CRActivity.created_at.desc())
    records = (await db.scalars(query)).all()
    return list(records)



# ============================================================================
# NEW WORKFLOW ENDPOINTS (BA VERIFY, PL REVIEW, MGMT REVIEW, ATTACHMENTS, DISCUSSIONS)
# ============================================================================

@router.post("/{cr_id}/ba-verify", response_model=dict)
async def verify_cr_by_ba(
    cr_id: uuid.UUID,
    payload: BAVerifyPayload,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """BA verifies CR. If issue, reverts with note. If OK, enriches deadline, module, screens, priority, attachments and routes to Project Leads."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    role_title = (actor.role_title or "").upper()
    is_ba = "BUSINESS ANALYST" in role_title or "BA" in role_title
    if not is_ba:
        raise HTTPException(status_code=403, detail="Access Denied: Only Business Analysts (BA) or BA Leads can perform CR verification.")

    if payload.action == "REVERT":
        if not payload.revert_note or not payload.revert_note.strip():
            raise HTTPException(status_code=422, detail="A revert note explaining the issue is required.")
        cr.status = "REVERTED_TO_BA"
        cr.revert_reason = payload.revert_note.strip()
        cr.reverted_by_role = actor.role_title
        cr.reverted_by_user_id = actor.id

        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="BA_REVERT",
            actor_name=actor.display_name,
            actor_role=actor.role_title,
            details=f"BA reverted Change Request with issue remark: {cr.revert_reason}",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "REVERTED", "cr_status": cr.status, "message": "CR reverted with remark"}

    # Action is FORWARD
    if not payload.requested_deadline:
        raise HTTPException(status_code=422, detail="CR requested deadline is required during verification.")
    if not payload.screen_name or not payload.screen_name.strip():
        raise HTTPException(status_code=422, detail="Impacted Screen / Functionality name is required.")

    cr.requested_deadline = payload.requested_deadline
    if payload.priority:
        cr.priority = payload.priority
    if payload.remarks:
        cr.review_notes = payload.remarks
    cr.screen_name = payload.screen_name.strip()
    cr.screen_type = payload.screen_type or "EXISTING"

    # Link module(s)
    if payload.impacted_module_ids:
        await db.execute(delete(CRImpactedModule).where(CRImpactedModule.cr_id == cr.id))
        for mod_id in payload.impacted_module_ids:
            db.add(CRImpactedModule(cr_id=cr.id, module_id=mod_id))

        first_mod_id = payload.impacted_module_ids[0]
        existing_scr = await db.scalar(
            select(ModuleScreen).where(
                ModuleScreen.module_id == first_mod_id,
                ModuleScreen.name.ilike(cr.screen_name),
            ).limit(1)
        )
        if not existing_scr:
            scr_code = cr.screen_name.upper().replace(" ", "_")[:64]
            db.add(ModuleScreen(
                module_id=first_mod_id,
                code=scr_code,
                name=cr.screen_name,
                description="Auto-registered during BA CR Verification.",
                screen_type=cr.screen_type,
                is_active=True,
            ))

    # Assign Project Lead(s)
    assigned_pl_names = []
    if payload.assigned_pl_ids:
        for pl_id in payload.assigned_pl_ids:
            pl_user = await db.get(User, pl_id)
            if pl_user:
                assigned_pl_names.append(pl_user.display_name)
                if not cr.pl_user_id:
                    cr.pl_user_id = pl_user.id
                db.add(CRStakeholder(
                    cr_id=cr.id,
                    user_id=pl_user.id,
                    responsibility="PROJECT_LEAD",
                    is_primary=True if pl_user.id == cr.pl_user_id else False,
                    assignment_reason="Assigned Project Lead for technical review and estimation",
                ))

    cr.status = "PENDING_PL_REVIEW"
    cr.pl_review_status = "PENDING"
    cr.revert_reason = None

    pls_str = ", ".join(assigned_pl_names) if assigned_pl_names else "Project Leads"
    db.add(CRActivity(
        cr_id=cr.id,
        cr_ref=cr.reference_number,
        event_type="BA_VERIFY_AND_FORWARD",
        actor_name=actor.display_name,
        actor_role=actor.role_title,
        details=(
            f"BA verified and enriched CR (Target Deadline: {cr.requested_deadline}, Screen: {cr.screen_name} [{cr.screen_type}], Priority: {cr.priority}). "
            f"Forwarded to Project Lead(s): {pls_str}."
        ),
    ))
    await db.commit()
    return {"status": "SUCCESS", "action": "FORWARDED", "cr_status": cr.status, "message": "CR verified and routed to Project Lead(s)"}


@router.post("/{cr_id}/attachments/upload", response_model=CRAttachmentRead)
async def upload_cr_attachment(
    cr_id: uuid.UUID,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
    file: UploadFile = File(...),
    note: str = Form(""),
) -> CRAttachment:
    """Direct file upload (PNG/JPG wireframe, PDF, docx, notes) saved to backend storage."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    upload_dir = os.path.join("uploads", "cr_attachments")
    os.makedirs(upload_dir, exist_ok=True)
    clean_name = os.path.basename(file.filename or "attachment")
    unique_name = f"{uuid.uuid4().hex[:8]}_{clean_name}"
    disk_path = os.path.join(upload_dir, unique_name)

    content = await file.read()
    with open(disk_path, "wb") as f:
        f.write(content)

    url_path = f"/uploads/cr_attachments/{unique_name}"
    attachment = CRAttachment(
        cr_id=cr.id,
        uploader_id=actor.id,
        uploader_name=actor.display_name,
        file_type="UPLOAD",
        original_name=clean_name,
        file_url=url_path,
        file_size_bytes=len(content),
        file_format=file.content_type or "application/octet-stream",
        note=note or "",
    )
    db.add(attachment)
    db.add(CRActivity(
        cr_id=cr.id,
        cr_ref=cr.reference_number,
        event_type="ATTACHMENT_UPLOAD",
        actor_name=actor.display_name,
        actor_role=actor.role_title,
        details=f"Uploaded file attachment: '{clean_name}' ({len(content)} bytes). Note: {note or 'None'}",
    ))
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.post("/{cr_id}/attachments/link", response_model=CRAttachmentRead)
async def link_cr_attachment(
    cr_id: uuid.UUID,
    payload: CRAttachmentLinkPayload,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> CRAttachment:
    """Link external attachment URL (Figma, Google Drive, Zoho docs)."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    attachment = CRAttachment(
        cr_id=cr.id,
        uploader_id=actor.id,
        uploader_name=actor.display_name,
        file_type="EXTERNAL_LINK",
        original_name=payload.original_name,
        file_url=payload.file_url,
        file_format=payload.file_format or "EXTERNAL_LINK",
        note=payload.note or "",
    )
    db.add(attachment)
    db.add(CRActivity(
        cr_id=cr.id,
        cr_ref=cr.reference_number,
        event_type="ATTACHMENT_LINK",
        actor_name=actor.display_name,
        actor_role=actor.role_title,
        details=f"Linked external attachment: '{payload.original_name}' -> {payload.file_url}. Note: {payload.note or 'None'}",
    ))
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.get("/{cr_id}/attachments", response_model=list[CRAttachmentRead])
async def list_cr_attachments(
    cr_id: uuid.UUID,
    db: DbSession,
) -> list[CRAttachment]:
    items = (await db.scalars(
        select(CRAttachment).where(CRAttachment.cr_id == cr_id).order_by(CRAttachment.created_at.desc())
    )).all()
    return list(items)


@router.delete("/{cr_id}/attachments/{attachment_id}", response_model=dict)
async def delete_cr_attachment(
    cr_id: uuid.UUID,
    attachment_id: uuid.UUID,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    att = await db.get(CRAttachment, attachment_id)
    if not att or att.cr_id != cr_id:
        raise HTTPException(status_code=404, detail="Attachment not found")
    cr = await db.get(ChangeRequest, cr_id)
    cr_ref = cr.reference_number if cr else ""
    att_name = att.original_name
    await db.delete(att)
    db.add(CRActivity(
        cr_id=cr_id,
        cr_ref=cr_ref,
        event_type="ATTACHMENT_DELETE",
        actor_name=actor.display_name,
        actor_role=actor.role_title,
        details=f"Removed attachment: '{att_name}'.",
    ))
    await db.commit()
    return {"status": "SUCCESS", "message": f"Attachment '{att_name}' removed"}


@router.post("/{cr_id}/pl-review", response_model=dict)
async def pl_review_cr(
    cr_id: uuid.UUID,
    payload: PLReviewActionPayload,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """Project Lead reviews CR: can revert to BA (deadline/functional issue), pass to SPM/PM, or approve directly."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    role_title = (actor.role_title or "").upper()
    is_pl = (
        "PROJECT LEAD" in role_title
        or "LEAD" in role_title
        or "PROJECT MANAGER" in role_title
        or "ADMIN" in role_title
    )
    if not is_pl:
        raise HTTPException(status_code=403, detail="Access Denied: Only Project Leads or Project Managers can perform PL review.")

    cr.pl_user_id = actor.id

    if payload.action == "REVERT_TO_BA":
        cr.status = "REVERTED_TO_BA"
        cr.pl_review_status = "REVERTED"
        cr.revert_reason = payload.remarks
        cr.reverted_by_role = "Project Lead"
        cr.reverted_by_user_id = actor.id
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="PL_REVERT",
            actor_name=actor.display_name,
            actor_role="Project Lead",
            details=f"Project Lead reverted CR to BA (Deadline/Technical mismatch): {payload.remarks}",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "REVERTED_TO_BA", "cr_status": cr.status}

    elif payload.action == "PASS_TO_MANAGEMENT":
        cr.status = "PENDING_MANAGEMENT_REVIEW"
        cr.pl_review_status = "PASSED_TO_MANAGEMENT"
        cr.review_notes = payload.remarks
        if payload.target_pm_id:
            cr.primary_pm_id = payload.target_pm_id
        if payload.target_spm_id:
            cr.spm_user_id = payload.target_spm_id
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="PL_PASS_TO_MANAGEMENT",
            actor_name=actor.display_name,
            actor_role="Project Lead",
            details=f"Project Lead forwarded CR to Senior Project Manager / Project Manager for review & approval: {payload.remarks}",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "PASS_TO_MANAGEMENT", "cr_status": cr.status}

    elif payload.action == "APPROVE":
        cr.status = "APPROVED_BY_PL"
        cr.pl_review_status = "ACCEPTED"
        cr.review_notes = payload.remarks
        if payload.target_pm_id:
            cr.primary_pm_id = payload.target_pm_id
        if payload.target_spm_id:
            cr.spm_user_id = payload.target_spm_id
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="PL_APPROVE",
            actor_name=actor.display_name,
            actor_role="Project Lead",
            details=f"Project Lead approved CR: {payload.remarks}. Assigned to PM/SPM for development delegation.",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "APPROVED", "cr_status": cr.status}


@router.post("/{cr_id}/management-review", response_model=dict)
async def management_review_cr(
    cr_id: uuid.UUID,
    payload: ManagementReviewActionPayload,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """SPM / PM reviews CR: can approve or send changes requested back to Project Lead."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    role_title = (actor.role_title or "").upper()
    is_mgmt = (
        "SENIOR PROJECT MANAGER" in role_title
        or "PROJECT MANAGER" in role_title
        or "SPM" in role_title
        or "PM" in role_title
        or "ADMIN" in role_title
    )
    if not is_mgmt:
        raise HTTPException(status_code=403, detail="Access Denied: Only Senior Project Managers (SPM) or Project Managers (PM) can perform Management Review.")

    if "SENIOR" in role_title or "SPM" in role_title:
        cr.spm_user_id = actor.id
    else:
        cr.primary_pm_id = actor.id

    if payload.action == "REQUEST_CHANGES":
        cr.status = "CHANGES_REQUESTED_BY_MANAGEMENT"
        cr.management_review_status = "CHANGES_REQUESTED"
        cr.review_notes = payload.remarks
        cr.reverted_by_role = actor.role_title
        cr.reverted_by_user_id = actor.id
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="MANAGEMENT_REQUEST_CHANGES",
            actor_name=actor.display_name,
            actor_role=actor.role_title,
            details=f"Management ({actor.role_title} {actor.display_name}) requested changes: {payload.remarks}. Routed back to Project Lead.",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "CHANGES_REQUESTED", "cr_status": cr.status}

    elif payload.action == "APPROVE":
        cr.status = "APPROVED_BY_MANAGEMENT"
        cr.management_review_status = "APPROVED"
        cr.review_notes = payload.remarks
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="MANAGEMENT_APPROVE",
            actor_name=actor.display_name,
            actor_role=actor.role_title,
            details=f"Management ({actor.role_title} {actor.display_name}) approved Change Request: {payload.remarks}. Ready for developer assignment.",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "APPROVED", "cr_status": cr.status}


@router.post("/{cr_id}/pl-handle-management-changes", response_model=dict)
async def pl_handle_management_changes(
    cr_id: uuid.UUID,
    payload: PLHandleManagementChangesPayload,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """Project Lead resolves management changes: can solve & resubmit to SPM/PM, or revert to BA if unresolvable."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    role_title = (actor.role_title or "").upper()
    is_pl = (
        "PROJECT LEAD" in role_title
        or "LEAD" in role_title
        or "PROJECT MANAGER" in role_title
        or "ADMIN" in role_title
    )
    if not is_pl:
        raise HTTPException(status_code=403, detail="Access Denied: Only Project Leads can resolve management changes.")

    if payload.action == "RESOLVED":
        cr.status = "PENDING_MANAGEMENT_REVIEW"
        cr.management_review_status = "PENDING"
        cr.review_notes = payload.remarks
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="PL_RESOLVED_MANAGEMENT_CHANGES",
            actor_name=actor.display_name,
            actor_role="Project Lead",
            details=f"Project Lead resolved management issues: {payload.remarks}. Resubmitted to SPM/PM.",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "RESOLVED", "cr_status": cr.status}

    elif payload.action == "REVERT_TO_BA":
        cr.status = "REVERTED_TO_BA"
        cr.revert_reason = f"PL could not resolve management changes: {payload.remarks}"
        cr.reverted_by_role = "Project Lead"
        cr.reverted_by_user_id = actor.id
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="PL_REVERT_TO_BA",
            actor_name=actor.display_name,
            actor_role="Project Lead",
            details=f"Project Lead could not resolve management changes and reverted CR to BA: {payload.remarks}.",
        ))
        await db.commit()
        return {"status": "SUCCESS", "action": "REVERTED_TO_BA", "cr_status": cr.status}


@router.post("/{cr_id}/assign-developers", response_model=dict)
async def assign_cr_developers(
    cr_id: uuid.UUID,
    payload: AssignDevelopersPayload,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """Management assigns developers: either the whole CR to developer(s), or modules with screens to different developers."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    role_title = (actor.role_title or "").upper()
    is_authorized = (
        "SENIOR PROJECT MANAGER" in role_title
        or "PROJECT MANAGER" in role_title
        or "PROJECT LEAD" in role_title
        or "ADMIN" in role_title
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Access Denied: Only Project Managers, SPMs, or Project Leads can assign developers.")

    created_tasks = []
    first_mod = await db.scalar(
        select(CRImpactedModule.module_id).where(CRImpactedModule.cr_id == cr.id).limit(1)
    )
    if not first_mod:
        mod_rec = await db.scalar(select(ProjectModule).where(ProjectModule.project_id == cr.project_id).limit(1))
        first_mod = mod_rec.id if mod_rec else None

    if payload.mode == "WHOLE_CR":
        if not payload.developer_ids:
            raise HTTPException(status_code=422, detail="At least one developer must be selected for whole CR assignment.")
        dev_names = []
        for dev_id in payload.developer_ids:
            dev_user = await db.get(User, dev_id)
            if dev_user:
                dev_names.append(dev_user.display_name)
                task_num = f"TASK-{cr.reference_number}-{uuid.uuid4().hex[:4].upper()}"
                t = DevTask(
                    cr_id=cr.id,
                    module_id=first_mod,
                    task_number=task_num,
                    title=f"Implementation: {cr.title}",
                    description=cr.description,
                    priority=cr.priority,
                    status="TODO",
                    assigned_developer_id=dev_id,
                    screen_name=cr.screen_name,
                    due_date=cr.requested_deadline,
                )
                db.add(t)
                created_tasks.append(task_num)
                db.add(CRStakeholder(
                    cr_id=cr.id,
                    user_id=dev_id,
                    responsibility="DEVELOPER",
                    is_primary=True,
                    assignment_reason="Assigned developer for entire Change Request implementation",
                ))
        cr.status = "DEVELOPMENT"
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="DEV_ASSIGNMENT_WHOLE",
            actor_name=actor.display_name,
            actor_role=actor.role_title,
            details=f"Assigned entire CR to developer(s): {', '.join(dev_names)}. Tasks generated: {', '.join(created_tasks)}. Status advanced to DEVELOPMENT.",
        ))

    elif payload.mode == "MODULAR_SCREENS":
        if not payload.modular_assignments:
            raise HTTPException(status_code=422, detail="At least one module/screen assignment is required.")
        assignment_details = []
        for item in payload.modular_assignments:
            dev_user = await db.get(User, item.developer_id)
            mod_item = await db.get(ProjectModule, item.module_id)
            mod_code = mod_item.code if mod_item else "MOD"
            dev_name = dev_user.display_name if dev_user else "Dev"
            task_num = f"TASK-{cr.reference_number}-{mod_code}-{uuid.uuid4().hex[:3].upper()}"
            t = DevTask(
                cr_id=cr.id,
                module_id=item.module_id,
                task_number=task_num,
                title=item.title or f"{cr.reference_number} - {item.screen_name}",
                description=f"Implement functionality for screen '{item.screen_name}' within module '{mod_code}'.",
                priority=cr.priority,
                status="TODO",
                assigned_developer_id=item.developer_id,
                screen_name=item.screen_name,
                estimated_hours=item.estimated_hours or 0.0,
                due_date=cr.requested_deadline,
            )
            db.add(t)
            created_tasks.append(task_num)
            db.add(CRStakeholder(
                cr_id=cr.id,
                user_id=item.developer_id,
                responsibility="DEVELOPER",
                is_primary=False,
                assignment_reason=f"Assigned developer for {item.screen_name} ({mod_code})",
            ))
            assignment_details.append(f"{item.screen_name} -> {dev_name}")

        cr.status = "DEVELOPMENT"
        db.add(CRActivity(
            cr_id=cr.id,
            cr_ref=cr.reference_number,
            event_type="DEV_ASSIGNMENT_MODULAR",
            actor_name=actor.display_name,
            actor_role=actor.role_title,
            details=f"Delegated {len(payload.modular_assignments)} modular task(s) to developers: {'; '.join(assignment_details)}. Status advanced to DEVELOPMENT.",
        ))

    await db.commit()
    return {"status": "SUCCESS", "mode": payload.mode, "created_tasks": created_tasks, "cr_status": cr.status}


@router.post("/{cr_id}/discussions", response_model=CRDiscussionRead)
async def create_cr_discussion(
    cr_id: uuid.UUID,
    payload: CRDiscussionCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> CRDiscussion:
    """Developer raises concern in Discussion with priority. Initially routed to Project Manager."""
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change Request not found")

    disc = CRDiscussion(
        cr_id=cr.id,
        task_id=payload.task_id,
        developer_id=actor.id,
        developer_name=actor.display_name,
        title=payload.title,
        concern_text=payload.concern_text,
        priority=payload.priority,
        current_level="PM",
        status="OPEN",
        assigned_role="Project Manager",
        assigned_user_id=cr.primary_pm_id,
    )
    db.add(disc)
    await db.flush()

    initial_msg = CRDiscussionMessage(
        discussion_id=disc.id,
        sender_id=actor.id,
        sender_name=actor.display_name,
        sender_role=actor.role_title or "Developer",
        action="CREATED",
        message=payload.concern_text,
    )
    db.add(initial_msg)

    db.add(CRActivity(
        cr_id=cr.id,
        cr_ref=cr.reference_number,
        event_type="DEV_CONCERN_RAISED",
        actor_name=actor.display_name,
        actor_role=actor.role_title or "Developer",
        details=f"Developer raised discussion concern: [{payload.priority}] '{payload.title}'. Routed to Project Manager.",
    ))
    await db.commit()
    await db.refresh(disc)
    disc.messages = [initial_msg]
    return disc


@router.post("/discussions/{discussion_id}/escalate", response_model=CRDiscussionRead)
async def escalate_cr_discussion(
    discussion_id: uuid.UUID,
    payload: CRDiscussionEscalate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> CRDiscussion:
    """Escalates concern along chain: PM -> SPM -> PL -> BA if unresolved."""
    disc = await db.get(CRDiscussion, discussion_id)
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion concern not found")

    cr = await db.get(ChangeRequest, disc.cr_id)
    cr_ref = cr.reference_number if cr else "CR"

    old_level = disc.current_level
    if old_level == "PM":
        disc.current_level = "SPM"
        disc.assigned_role = "Senior Project Manager"
        disc.assigned_user_id = cr.spm_user_id if cr else None
        target_name = "Senior Project Manager"
    elif old_level == "SPM":
        disc.current_level = "PL"
        disc.assigned_role = "Project Lead"
        disc.assigned_user_id = cr.pl_user_id if cr else None
        target_name = "Project Lead"
    elif old_level == "PL":
        disc.current_level = "BA"
        disc.assigned_role = "Business Analyst"
        disc.assigned_user_id = cr.ba_user_id if cr else None
        target_name = "Business Analyst"
    else:
        raise HTTPException(status_code=400, detail="Concern is already at highest escalation level (BA) and cannot be escalated further.")

    msg = CRDiscussionMessage(
        discussion_id=disc.id,
        sender_id=actor.id,
        sender_name=actor.display_name,
        sender_role=actor.role_title or "Handler",
        action=f"ESCALATED_TO_{disc.current_level}",
        message=payload.escalation_remark,
    )
    db.add(msg)

    db.add(CRActivity(
        cr_id=disc.cr_id,
        cr_ref=cr_ref,
        event_type="DEV_CONCERN_ESCALATED",
        actor_name=actor.display_name,
        actor_role=actor.role_title or "Handler",
        details=f"Discussion concern '{disc.title}' escalated from {old_level} to {target_name} ({disc.current_level}): {payload.escalation_remark}",
    ))
    await db.commit()
    await db.refresh(disc)
    msgs = (await db.scalars(
        select(CRDiscussionMessage).where(CRDiscussionMessage.discussion_id == disc.id).order_by(CRDiscussionMessage.created_at.asc())
    )).all()
    disc.messages = list(msgs)
    return disc


@router.post("/discussions/{discussion_id}/resolve", response_model=CRDiscussionRead)
async def resolve_cr_discussion(
    discussion_id: uuid.UUID,
    payload: CRDiscussionResolve,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> CRDiscussion:
    """Resolves discussion concern at current level with resolution note."""
    disc = await db.get(CRDiscussion, discussion_id)
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion concern not found")

    cr = await db.get(ChangeRequest, disc.cr_id)
    cr_ref = cr.reference_number if cr else "CR"

    disc.status = "RESOLVED"
    disc.resolution_notes = payload.resolution_notes
    disc.resolved_by_id = actor.id
    disc.resolved_at = datetime.now(UTC)

    msg = CRDiscussionMessage(
        discussion_id=disc.id,
        sender_id=actor.id,
        sender_name=actor.display_name,
        sender_role=actor.role_title or "Resolver",
        action="RESOLVED",
        message=f"Resolved: {payload.resolution_notes}",
    )
    db.add(msg)

    db.add(CRActivity(
        cr_id=disc.cr_id,
        cr_ref=cr_ref,
        event_type="DEV_CONCERN_RESOLVED",
        actor_name=actor.display_name,
        actor_role=actor.role_title or "Resolver",
        details=f"Discussion concern '{disc.title}' resolved at level {disc.current_level} by {actor.role_title} {actor.display_name}: {payload.resolution_notes}",
    ))
    await db.commit()
    await db.refresh(disc)
    msgs = (await db.scalars(
        select(CRDiscussionMessage).where(CRDiscussionMessage.discussion_id == disc.id).order_by(CRDiscussionMessage.created_at.asc())
    )).all()
    disc.messages = list(msgs)
    return disc


@router.post("/discussions/{discussion_id}/comment", response_model=CRDiscussionMessageRead)
async def comment_cr_discussion(
    discussion_id: uuid.UUID,
    payload: CRDiscussionComment,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> CRDiscussionMessage:
    """Adds a comment message to a discussion thread."""
    disc = await db.get(CRDiscussion, discussion_id)
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion concern not found")

    msg = CRDiscussionMessage(
        discussion_id=disc.id,
        sender_id=actor.id,
        sender_name=actor.display_name,
        sender_role=actor.role_title or "User",
        action="COMMENT",
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


@router.get("/{cr_id}/discussions", response_model=list[CRDiscussionRead])
async def list_cr_discussions(
    cr_id: uuid.UUID,
    db: DbSession,
) -> list[CRDiscussion]:
    """Lists all discussion concerns and their message threads for a CR."""
    discs = (await db.scalars(
        select(CRDiscussion).where(CRDiscussion.cr_id == cr_id).order_by(CRDiscussion.created_at.desc())
    )).all()
    result = []
    for d in discs:
        msgs = (await db.scalars(
            select(CRDiscussionMessage).where(CRDiscussionMessage.discussion_id == d.id).order_by(CRDiscussionMessage.created_at.asc())
        )).all()
        d.messages = list(msgs)
        result.append(d)
    return result
