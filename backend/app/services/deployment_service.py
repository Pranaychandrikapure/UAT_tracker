import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ChangeRequest,
    Defect,
    DefectStatusHistory,
    Deployment,
    NotificationEvent,
    Release,
    ReleaseItem,
    SRNItem,
)


class DeploymentServiceError(Exception):
    pass


async def confirm_uat_deployment(
    db: AsyncSession,
    deployment_id: uuid.UUID | str,
    actor_id: uuid.UUID | str,
    evidence: str = "",
    build_identifier: str = "",
) -> dict:
    if isinstance(deployment_id, str):
        deployment_id = uuid.UUID(deployment_id)
    if isinstance(actor_id, str):
        actor_id = uuid.UUID(actor_id)

    deployment = await db.get(Deployment, deployment_id)
    if not deployment:
        raise DeploymentServiceError("Deployment record not found")

    release = await db.get(Release, deployment.release_id)
    if not release:
        raise DeploymentServiceError("Associated release not found")

    now = datetime.now(UTC)

    # Update deployment record
    deployment.status = "CONFIRMED"
    deployment.completion_time = now
    if evidence:
        deployment.confirmation_evidence = evidence
    if build_identifier:
        deployment.build_identifier = build_identifier

    # Update release status
    release.status = "DEPLOYED"

    # Find all release items (both direct release items and through SRN items)
    rel_items = (
        await db.scalars(select(ReleaseItem).where(ReleaseItem.release_id == release.id))
    ).all()

    affected_cr_ids = set()
    affected_defects = []

    for item in rel_items:
        affected_cr_ids.add(item.cr_id)
        if item.defect_id:
            defect = await db.get(Defect, item.defect_id)
            if defect and defect.status in ("SRN_SENT", "READY_FOR_UAT_DEPLOYMENT"):
                prev = defect.status
                defect.status = "UAT_DEPLOYED"
                defect.uat_deployed_at = now
                defect.current_release_id = release.id
                db.add(DefectStatusHistory(
                    defect_id=defect.id,
                    previous_status=prev,
                    new_status="UAT_DEPLOYED",
                    actor_id=actor_id,
                    reason=f"Confirmed deployment of {release.version} ({deployment.build_identifier or 'build'}). Ready for UAT retest.",
                    release_id=release.id,
                    deployment_id=deployment.id,
                ))
                # Automatically advance to READY_FOR_RETEST for tester clarity
                defect.status = "READY_FOR_RETEST"
                db.add(DefectStatusHistory(
                    defect_id=defect.id,
                    previous_status="UAT_DEPLOYED",
                    new_status="READY_FOR_RETEST",
                    actor_id=actor_id,
                    reason="Handoff to UAT testers for verification",
                    release_id=release.id,
                    deployment_id=deployment.id,
                ))
                affected_defects.append(defect)

                # Notify assigned tester or reporter
                tester_to_notify = defect.reporter_user_id or actor_id
                db.add(NotificationEvent(
                    recipient_id=tester_to_notify,
                    title=f"Bug Ready for Retest: {defect.bug_number}",
                    message=f"{defect.bug_number} has been deployed to {deployment.environment} in build {deployment.build_identifier or release.version}. You can begin retesting.",
                    entity_type="defect",
                    entity_id=defect.id,
                ))

    # Also update Change Requests milestone timestamp
    for cr_id in affected_cr_ids:
        cr = await db.get(ChangeRequest, cr_id)
        if cr:
            cr.uat_deployed_at = now
            if cr.status in ("UAT_READY", "SIT"):
                cr.status = "UAT"

    await db.commit()

    return {
        "status": "CONFIRMED",
        "release_version": release.version,
        "environment": deployment.environment,
        "completed_at": now.isoformat(),
        "defects_deployed_count": len(affected_defects),
        "defects": [d.bug_number for d in affected_defects],
    }
