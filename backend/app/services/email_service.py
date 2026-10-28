import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CRActivity,
    ChangeRequest,
    Defect,
    DefectStatusHistory,
    EmailMessage,
    EmailSendJob,
    EmailThread,
    NotificationEvent,
    SRNDocument,
    SRNItem,
    User,
)


class EmailServiceError(Exception):
    pass


async def send_srn_email(
    db: AsyncSession,
    srn_id: uuid.UUID | str,
    actor_id: uuid.UUID | str,
    thread_option: str = "AUTO",  # AUTO, MASTER_THREAD, NEW_THREAD
    selected_thread_id: uuid.UUID | str | None = None,
    idempotency_key: str | None = None,
) -> dict:
    if isinstance(srn_id, str):
        srn_id = uuid.UUID(srn_id)
    if isinstance(actor_id, str):
        actor_id = uuid.UUID(actor_id)
    if isinstance(selected_thread_id, str):
        selected_thread_id = uuid.UUID(selected_thread_id)

    srn = await db.get(SRNDocument, srn_id)
    if not srn:
        raise EmailServiceError("SRN document not found")

    if srn.status == "SENT":
        return {"status": "ALREADY_SENT", "srn_number": srn.srn_number, "sent_at": str(srn.sent_at)}

    if not idempotency_key:
        idempotency_key = f"srn_send_{srn.id}_{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"

    # Check for existing completed job
    existing_job = await db.scalar(
        select(EmailSendJob).where(EmailSendJob.idempotency_key == idempotency_key)
    )
    if existing_job and existing_job.status == "SENT":
        return {"status": "ALREADY_SENT", "idempotency_key": idempotency_key}

    # Retrieve all SRN items
    items = (await db.scalars(select(SRNItem).where(SRNItem.srn_id == srn_id))).all()

    # Determine thread to reply to
    target_thread = None
    if selected_thread_id:
        target_thread = await db.get(EmailThread, selected_thread_id)

    if not target_thread and srn.email_thread_id:
        target_thread = await db.get(EmailThread, srn.email_thread_id)

    if not target_thread:
        # Find threads associated with items' CRs
        cr_ids = {it.cr_id for it in items}
        thread_candidates = (
            await db.scalars(select(EmailThread).where(EmailThread.cr_id.in_(cr_ids)))
        ).all()
        if thread_candidates:
            target_thread = thread_candidates[0]

    now = datetime.now(UTC)
    provider_msg_id = f"<srn.{srn.srn_number.lower()}.{uuid.uuid4().hex[:8]}@company.com>"

    subject = srn.email_subject
    in_reply_to = None
    references_hdr = None

    if target_thread and thread_option != "NEW_THREAD":
        in_reply_to = target_thread.latest_message_id or target_thread.root_message_id
        refs = [target_thread.root_message_id]
        if target_thread.reference_headers:
            refs.extend(target_thread.reference_headers.split())
        if in_reply_to not in refs:
            refs.append(in_reply_to)
        references_hdr = " ".join(refs)
        if not subject.lower().startswith("re:"):
            subject = f"Re: {target_thread.original_subject} [{srn.srn_number}]"

        # Update thread latest message ID
        target_thread.latest_message_id = provider_msg_id
        target_thread.last_sync_at = now
    else:
        if not subject:
            subject = f"Release Note: {srn.srn_number} - {srn.title}"

    # Create email send job record
    job = existing_job or EmailSendJob(
        srn_id=srn.id,
        thread_id=target_thread.id if target_thread else None,
        idempotency_key=idempotency_key,
        status="IN_FLIGHT",
        attempt_count=1,
    )
    if not existing_job:
        db.add(job)
    await db.flush()

    # Create Outbound Email Message
    email_msg = EmailMessage(
        thread_id=target_thread.id if target_thread else None,
        srn_id=srn.id,
        message_direction="OUTBOUND",
        sender="releases@company.com",
        recipients_to=srn.email_recipients_to or "uat-distribution@company.com",
        recipients_cc=srn.email_recipients_cc or "",
        subject=subject,
        body_html=srn.rendered_email_body or f"<p>{srn.change_summary}</p>",
        provider_message_id=provider_msg_id,
        in_reply_to=in_reply_to,
        references_header=references_hdr,
        status="SENT",
        sent_at=now,
    )
    db.add(email_msg)

    # Provider confirmation simulated acceptance
    job.status = "SENT"
    job.provider_response = json.dumps({
        "status": "ACCEPTED",
        "message_id": provider_msg_id,
        "accepted_recipients": srn.email_recipients_to.split(",") if srn.email_recipients_to else ["uat-team@company.com"],
        "timestamp": now.isoformat(),
    })

    # Update SRN
    srn.status = "SENT"
    srn.provider_message_id = provider_msg_id
    srn.sent_at = now
    srn.email_subject = subject
    if target_thread:
        srn.email_thread_id = target_thread.id

    actor = await db.get(User, actor_id)
    actor_name = actor.display_name if actor else "Release Team"

    # Update associated defects and unlock CRs for UAT (SOP 4.3 Gate)
    unlocked_crs = set()
    for it in items:
        if it.defect_id:
            defect = await db.get(Defect, it.defect_id)
            if defect and defect.status in ("READY_FOR_UAT_DEPLOYMENT", "FIXED", "SIT_PASSED"):
                prev = defect.status
                defect.status = "SRN_SENT"
                defect.srn_sent_at = now
                defect.current_srn_id = srn.id
                db.add(DefectStatusHistory(
                    defect_id=defect.id,
                    previous_status=prev,
                    new_status="SRN_SENT",
                    actor_id=actor_id,
                    reason=f"Included in {srn.srn_number} and release email successfully accepted by provider",
                ))
        if it.cr_id and it.cr_id not in unlocked_crs:
            unlocked_crs.add(it.cr_id)
            cr = await db.get(ChangeRequest, it.cr_id)
            if cr:
                cr.is_uat_unlocked = True
                cr.srn_sent_at = now
                if cr.status in ("SIT", "READY_FOR_UAT", "SRN_PENDING", "SIT_PASSED", "DEVELOPMENT"):
                    cr.status = "UAT"
                db.add(CRActivity(
                    cr_id=cr.id,
                    cr_ref=cr.reference_number,
                    event_type="SRN_DISPATCH",
                    actor_name=actor_name,
                    actor_role="Release Coordinator",
                    details=f"SRN {srn.srn_number} email dispatched to {srn.email_recipients_to}. UAT Track unlocked for defect logging (SOP 4.3).",
                ))

    # Notify PM and UAT Lead
    db.add(NotificationEvent(
        recipient_id=actor_id,
        title=f"SRN Sent: {srn.srn_number}",
        message=f"Release note {srn.srn_number} was successfully dispatched via email to {srn.email_recipients_to}. Work items are now pending UAT deployment confirmation.",
        entity_type="srn_document",
        entity_id=srn.id,
    ))

    await db.commit()

    return {
        "status": "SENT",
        "srn_number": srn.srn_number,
        "provider_message_id": provider_msg_id,
        "in_reply_to": in_reply_to,
        "thread_subject": subject,
        "sent_at": now.isoformat(),
        "items_count": len(items),
    }
