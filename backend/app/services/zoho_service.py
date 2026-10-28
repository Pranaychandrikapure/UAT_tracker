import json
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    ChangeRequest,
    CRActivity,
    CRStakeholder,
    NotificationEvent,
    OutboxEvent,
    Project,
    ProjectMember,
    ScopeChangeProposal,
    User,
)


class ZohoSyncError(Exception):
    pass


async def ingest_zoho_change_request(
    db: AsyncSession,
    external_record_id: str,
    title: str,
    description: str,
    project_code: str,
    external_owner_name: str,
    priority: str = "NORMAL",
    requested_deadline: date | None = None,
    business_justification: str = "",
    actor_id: uuid.UUID | None = None,
) -> dict:
    now = datetime.now(UTC)

    # Resolve project
    project = await db.scalar(select(Project).where(Project.code == project_code))
    if not project:
        # Fallback to first active project
        project = await db.scalar(select(Project).limit(1))
    if not project:
        raise ZohoSyncError("No project found to associate Zoho CR")

    # Find mapped BA user for this project
    ba_user = await db.scalar(
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(
            ProjectMember.project_id == project.id,
            or_(
                User.role_title.ilike("%Business Analyst%"),
                User.role_title.ilike("%BA%"),
            ),
            User.is_active.is_(True),
        )
        .limit(1)
    )
    if not ba_user:
        # Fallback to any active Business Analyst or BA Lead
        ba_user = await db.scalar(
            select(User)
            .where(
                or_(
                    User.role_title.ilike("%Business Analyst%"),
                    User.role_title.ilike("%BA Lead%"),
                    User.role_title.ilike("%BA%"),
                ),
                User.is_active.is_(True),
            )
            .limit(1)
        )
    if not ba_user:
        ba_user = await db.scalar(select(User).where(User.is_active.is_(True)).limit(1))
    if not ba_user:
        raise ZohoSyncError("No BA user available")

    # Check for existing CR with this Zoho external record ID
    existing_cr = await db.scalar(
        select(ChangeRequest).where(ChangeRequest.external_record_id == external_record_id)
    )

    if existing_cr:
        # Check if already scope approved or in progress
        scope_locked_statuses = {
            "SCOPE_APPROVED", "DEVELOPMENT", "CODE_REVIEW", "SIT",
            "UAT_READY", "UAT", "UAT_SIGNED_OFF", "BUSINESS_ACCEPTANCE", "PRODUCTION_RELEASE", "CLOSED"
        }

        if existing_cr.status in scope_locked_statuses:
            # DO NOT overwrite approved scope! Generate a pending change-review request.
            proposal = ScopeChangeProposal(
                cr_id=existing_cr.id,
                version=existing_cr.current_scope_version + 1,
                title=f"Zoho Scope Update: {title}",
                description=f"Zoho external update received while CR is in status {existing_cr.status}.\n\nNew Description:\n{description}",
                source="ZOHO_UPDATE",
                additional_effort_hours=0.0,
                proposed_by_user_id=ba_user.id,
                status="PENDING_REVIEW",
            )
            db.add(proposal)
            await db.flush()

            # Notify Primary PM or BA
            notify_user_id = existing_cr.primary_pm_id or ba_user.id
            db.add(NotificationEvent(
                recipient_id=notify_user_id,
                title=f"Scope Change Proposed: {existing_cr.reference_number}",
                message=f"External Zoho update received for {existing_cr.reference_number} while in {existing_cr.status}. Approved scope preserved; pending scope proposal created for review.",
                entity_type="scope_change_proposal",
                entity_id=proposal.id,
            ))

            db.add(AuditLog(
                actor_id=actor_id or ba_user.id,
                entity_type="change_request",
                entity_id=existing_cr.id,
                action="ZOHO_SCOPE_CHANGE_PRESERVED",
                change_payload=json.dumps({"external_record_id": external_record_id, "proposal_id": str(proposal.id)}),
            ))
            await db.commit()

            return {
                "action": "SCOPE_CHANGE_PROPOSED",
                "cr_id": str(existing_cr.id),
                "reference_number": existing_cr.reference_number,
                "proposal_id": str(proposal.id),
                "message": "Existing approved scope was preserved. A pending Scope Change Proposal has been generated.",
            }
        else:
            # Safe to update in pre-approval stages
            existing_cr.title = title
            existing_cr.description = description
            existing_cr.external_owner_name = external_owner_name
            if requested_deadline:
                existing_cr.requested_deadline = requested_deadline
            existing_cr.source_modified_at = now
            await db.commit()

            return {
                "action": "UPDATED",
                "cr_id": str(existing_cr.id),
                "reference_number": existing_cr.reference_number,
                "message": "CR updated from Zoho before scope approval.",
            }

    # Brand new CR from Zoho
    reference_number = f"CR-ZH-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    new_cr = ChangeRequest(
        reference_number=reference_number,
        project_id=project.id,
        source="ZOHO",
        external_record_id=external_record_id,
        external_owner_name=external_owner_name,
        ba_user_id=ba_user.id,
        assigned_ba_id=ba_user.id,
        primary_pm_id=None,
        title=title,
        description=description,
        business_justification=business_justification or "Imported via Zoho Change Request Integration",
        priority=priority,
        status="PENDING_BA_VERIFICATION",
        requested_deadline=requested_deadline or (date.today() + (now.date() - date.today()) + date.resolution * 14),
        source_created_at=now,
        source_modified_at=now,
        current_scope_version=1,
    )
    db.add(new_cr)
    await db.flush()

    actor_user = await db.get(User, actor_id) if actor_id else None
    actor_name = actor_user.display_name if actor_user else (external_owner_name or "Zoho Sync")
    actor_role = actor_user.role_title if actor_user else "Integration"

    db.add_all([
        CRStakeholder(
            cr_id=new_cr.id,
            user_id=ba_user.id,
            responsibility="BUSINESS_ANALYST",
            is_primary=True,
            assignment_reason="Assigned mapped Project BA for functional verification and technical detailing",
        ),
        CRActivity(
            cr_id=new_cr.id,
            cr_ref=reference_number,
            event_type="ZOHO_FETCH",
            actor_name=actor_name,
            actor_role=actor_role,
            details=f"Change Request '{title}' fetched from Zoho and assigned to {ba_user.display_name} ({ba_user.role_title}) for verification.",
        ),
        AuditLog(
            actor_id=actor_id or ba_user.id,
            entity_type="change_request",
            entity_id=new_cr.id,
            action="ZOHO_INGEST",
            change_payload=json.dumps({"external_record_id": external_record_id, "reference_number": reference_number, "assigned_ba": ba_user.display_name}),
        ),
        OutboxEvent(
            event_type="cr.imported_from_zoho",
            aggregate_type="change_request",
            aggregate_id=new_cr.id,
            payload=json.dumps({"cr_id": str(new_cr.id), "reference_number": reference_number, "external_record_id": external_record_id}),
            deduplication_key=f"cr.zoho_imported:{external_record_id}",
        ),
        NotificationEvent(
            recipient_id=ba_user.id,
            title=f"New Zoho CR Ingested: {reference_number}",
            message=f"Change Request '{title}' was imported from Zoho and assigned to you for verification.",
            entity_type="change_request",
            entity_id=new_cr.id,
        ),
    ])
    await db.commit()

    return {
        "action": "CREATED",
        "cr_id": str(new_cr.id),
        "reference_number": new_cr.reference_number,
        "message": f"New Zoho CR successfully ingested and assigned to {ba_user.display_name} (BA).",
    }
