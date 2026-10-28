from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import (
    ChangeRequest,
    DeadlineNegotiation,
    Defect,
    Deployment,
    DevTask,
    KRARecord,
    Release,
    ScopeChangeProposal,
    SITCycle,
    SRNDocument,
    UATCycle,
    User,
)

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/management-kpi")
async def get_management_kpi(db: DbSession) -> dict:
    today = date.today()

    total_crs = await db.scalar(select(func.count(ChangeRequest.id)))
    new_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status.in_(("DRAFT", "SUBMITTED", "PENDING_PM_ASSIGNMENT"))))
    under_review_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status.in_(("REQUIREMENT_REVIEW", "IMPACT_ASSESSMENT", "DEADLINE_REVIEW", "CLARIFICATION_REQUIRED"))))
    in_dev_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status.in_(("SCOPE_APPROVED", "DEVELOPMENT", "CODE_REVIEW"))))
    in_sit_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status == "SIT"))
    ready_uat_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status == "UAT_READY"))
    in_uat_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status.in_(("UAT", "UAT_SIGNED_OFF"))))
    completed_crs = await db.scalar(select(func.count(ChangeRequest.id)).where(ChangeRequest.status.in_(("BUSINESS_ACCEPTANCE", "PRODUCTION_RELEASE", "PRODUCTION_VERIFIED", "CLOSED"))))

    # Overdue CRs (approved deadline < today and not completed)
    overdue_crs = await db.scalar(
        select(func.count(ChangeRequest.id)).where(
            ChangeRequest.approved_deadline < today,
            ChangeRequest.status.notin_(("CLOSED", "PRODUCTION_VERIFIED")),
        )
    )

    # Bugs breakdown
    bugs_open = await db.scalar(select(func.count(Defect.id)).where(Defect.status.in_(("OPEN", "ASSIGNED", "IN_PROGRESS"))))
    bugs_fixed = await db.scalar(select(func.count(Defect.id)).where(Defect.status.in_(("FIXED", "SIT_IN_PROGRESS", "SIT_PASSED"))))
    bugs_awaiting_deployment = await db.scalar(select(func.count(Defect.id)).where(Defect.status.in_(("READY_FOR_UAT_DEPLOYMENT", "SRN_SENT"))))
    bugs_awaiting_retest = await db.scalar(select(func.count(Defect.id)).where(Defect.status.in_(("UAT_DEPLOYED", "READY_FOR_RETEST"))))
    bugs_reopened = await db.scalar(select(func.count(Defect.id)).where(Defect.status == "REOPENED"))
    bugs_closed = await db.scalar(select(func.count(Defect.id)).where(Defect.status == "CLOSED"))

    pending_deadline_approvals = await db.scalar(select(func.count(DeadlineNegotiation.id)).where(DeadlineNegotiation.status == "PENDING_APPROVAL"))
    pending_scope_proposals = await db.scalar(select(func.count(ScopeChangeProposal.id)).where(ScopeChangeProposal.status == "PENDING_REVIEW"))
    srn_sent_count = await db.scalar(select(func.count(SRNDocument.id)).where(SRNDocument.status == "SENT"))
    deployments_confirmed = await db.scalar(select(func.count(Deployment.id)).where(Deployment.status == "CONFIRMED"))

    return {
        "total_crs": total_crs or 0,
        "new_crs": new_crs or 0,
        "under_review_crs": under_review_crs or 0,
        "in_dev_crs": in_dev_crs or 0,
        "in_sit_crs": in_sit_crs or 0,
        "ready_uat_crs": ready_uat_crs or 0,
        "in_uat_crs": in_uat_crs or 0,
        "completed_crs": completed_crs or 0,
        "overdue_crs": overdue_crs or 0,
        "bugs_open": bugs_open or 0,
        "bugs_fixed": bugs_fixed or 0,
        "bugs_awaiting_deployment": bugs_awaiting_deployment or 0,
        "bugs_awaiting_retest": bugs_awaiting_retest or 0,
        "bugs_reopened": bugs_reopened or 0,
        "bugs_closed": bugs_closed or 0,
        "pending_deadline_approvals": pending_deadline_approvals or 0,
        "pending_scope_proposals": pending_scope_proposals or 0,
        "srn_sent_count": srn_sent_count or 0,
        "deployments_confirmed": deployments_confirmed or 0,
    }


@router.get("/kra")
async def list_kra_records(db: DbSession) -> list[dict]:
    query = select(KRARecord, User, ChangeRequest).join(User, User.id == KRARecord.user_id).outerjoin(ChangeRequest, ChangeRequest.id == KRARecord.cr_id)
    rows = (await db.execute(query.order_by(KRARecord.reporting_period.desc()))).all()
    results = []
    for k, u, cr in rows:
        results.append({
            "id": str(k.id),
            "employee_name": u.display_name,
            "employee_code": u.employee_code,
            "role_title": u.role_title,
            "reporting_period": k.reporting_period,
            "cr_number": cr.reference_number if cr else None,
            "cr_title": cr.title if cr else None,
            "role_played": k.role_played,
            "tasks_completed": k.tasks_completed,
            "defects_fixed": k.defects_fixed,
            "sit_executions_count": k.sit_executions_count,
            "uat_tests_count": k.uat_tests_count,
            "delivery_variance_days": k.delivery_variance_days,
            "delays_business_reason": k.delays_business_reason,
            "complexity_weight": k.complexity_weight,
            "comments": k.comments,
        })
    return results
