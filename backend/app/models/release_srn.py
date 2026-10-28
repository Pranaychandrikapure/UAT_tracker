import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enterprise import TimestampMixin


class Release(Base, TimestampMixin):
    __tablename__ = "releases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    release_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    version: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(240))
    environment: Mapped[str] = mapped_column(String(32), default="UAT")  # UAT, PROD
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    release_owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    planned_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default="PLANNED", index=True)  # PLANNED, IN_PROGRESS, DEPLOYED, FAILED, CANCELLED
    release_notes: Mapped[str] = mapped_column(Text, default="")


class ReleaseItem(Base, TimestampMixin):
    __tablename__ = "release_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    release_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("releases.id", ondelete="CASCADE"), index=True)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    defect_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("defects.id", ondelete="SET NULL"), index=True)
    dev_task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("dev_tasks.id", ondelete="SET NULL"), index=True)
    item_type: Mapped[str] = mapped_column(String(32), default="CR_CHANGE")  # CR_CHANGE, BUG_FIX
    notes: Mapped[str] = mapped_column(Text, default="")


class Deployment(Base, TimestampMixin):
    __tablename__ = "deployments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    release_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("releases.id", ondelete="CASCADE"), index=True)
    environment: Mapped[str] = mapped_column(String(32), default="UAT")
    deployment_owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)  # PENDING, IN_PROGRESS, CONFIRMED, FAILED
    build_identifier: Mapped[str] = mapped_column(String(120), default="")
    confirmation_evidence: Mapped[str] = mapped_column(Text, default="")
    failure_reason: Mapped[str] = mapped_column(Text, default="")
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completion_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EmailThread(Base, TimestampMixin):
    __tablename__ = "email_threads"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("change_requests.id", ondelete="SET NULL"), index=True)
    provider: Mapped[str] = mapped_column(String(64), default="INTERNAL_SMTP")  # INTERNAL_SMTP, GRAPH, GMAIL
    mailbox: Mapped[str] = mapped_column(String(320))
    provider_thread_id: Mapped[str] = mapped_column(String(255), index=True)
    original_subject: Mapped[str] = mapped_column(String(500))
    root_message_id: Mapped[str] = mapped_column(String(255), index=True)
    latest_message_id: Mapped[str] = mapped_column(String(255))
    reference_headers: Mapped[str] = mapped_column(Text, default="")
    last_sync_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmailMessage(Base, TimestampMixin):
    __tablename__ = "email_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("email_threads.id", ondelete="CASCADE"), index=True, nullable=True)
    srn_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    message_direction: Mapped[str] = mapped_column(String(32), default="OUTBOUND")  # OUTBOUND, INBOUND
    sender: Mapped[str] = mapped_column(String(320))
    recipients_to: Mapped[str] = mapped_column(Text)
    recipients_cc: Mapped[str] = mapped_column(Text, default="")
    subject: Mapped[str] = mapped_column(String(500))
    body_html: Mapped[str] = mapped_column(Text)
    provider_message_id: Mapped[str | None] = mapped_column(String(255), index=True)
    in_reply_to: Mapped[str | None] = mapped_column(String(255))
    references_header: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)  # PENDING, SENT, FAILED
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_details: Mapped[str] = mapped_column(Text, default="")


class EmailSendJob(Base, TimestampMixin):
    __tablename__ = "email_send_jobs"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_email_send_jobs_idempotency"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    srn_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    thread_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("email_threads.id", ondelete="SET NULL"))
    idempotency_key: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)  # PENDING, IN_FLIGHT, SENT, FAILED, RETRY_PENDING
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider_response: Mapped[str] = mapped_column(Text, default="")
    error_log: Mapped[str] = mapped_column(Text, default="")


class SRNDocument(Base, TimestampMixin):
    __tablename__ = "srn_documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    srn_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    release_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("releases.id", ondelete="SET NULL"), index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    target_environment: Mapped[str] = mapped_column(String(32), default="UAT")
    release_version: Mapped[str] = mapped_column(String(64), default="")
    change_summary: Mapped[str] = mapped_column(Text, default="")
    module_changes: Mapped[str] = mapped_column(Text, default="")
    technical_notes: Mapped[str] = mapped_column(Text, default="")
    sit_summary: Mapped[str] = mapped_column(Text, default="")
    known_limitations: Mapped[str] = mapped_column(Text, default="")
    deployment_instructions: Mapped[str] = mapped_column(Text, default="")
    rollback_notes: Mapped[str] = mapped_column(Text, default="")
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", index=True)  # DRAFT, PENDING_SEND, SENT, FAILED
    email_thread_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("email_threads.id", ondelete="SET NULL"), index=True)
    email_subject: Mapped[str] = mapped_column(String(500), default="")
    email_recipients_to: Mapped[str] = mapped_column(Text, default="")
    email_recipients_cc: Mapped[str] = mapped_column(Text, default="")
    rendered_email_body: Mapped[str] = mapped_column(Text, default="")
    provider_message_id: Mapped[str | None] = mapped_column(String(255))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # SOP 2.0 Multi-stage Sign-off and Gatekeeping
    reviewer_pm_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pm_review_remarks: Mapped[str | None] = mapped_column(Text)
    approver_spm_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    spm_approval_remarks: Mapped[str | None] = mapped_column(Text)
    ba_gatekeeper_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    ba_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ba_hold_reason: Mapped[str | None] = mapped_column(Text)
    ba_hold_until: Mapped[date | None] = mapped_column(Date)
    approval_stage: Mapped[str] = mapped_column(String(40), default="DRAFT")  # DRAFT, PM_REVIEWED, SPM_APPROVED, BA_GATEKEEP_PASSED, BA_HELD, SENT

    # Phase 5.2 Production Deployment Package Artifacts
    production_srn: Mapped[str | None] = mapped_column(Text)
    deployment_checklist: Mapped[str | None] = mapped_column(Text)
    rfc_document: Mapped[str | None] = mapped_column(Text)


class SRNItem(Base, TimestampMixin):
    __tablename__ = "srn_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    srn_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("srn_documents.id", ondelete="CASCADE"), index=True)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    defect_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("defects.id", ondelete="SET NULL"), index=True)
    dev_task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("dev_tasks.id", ondelete="SET NULL"), index=True)
    item_type: Mapped[str] = mapped_column(String(32), default="CR_CHANGE")  # CR_CHANGE, BUG_FIX
    status: Mapped[str] = mapped_column(String(32), default="READY")
    fix_summary: Mapped[str] = mapped_column(Text, default="")
