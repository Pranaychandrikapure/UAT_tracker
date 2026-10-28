import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enterprise import TimestampMixin


class ImpactAssessment(Base, TimestampMixin):
    __tablename__ = "impact_assessments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), unique=True, index=True)
    assessed_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    dev_complexity: Mapped[str] = mapped_column(String(32), default="MEDIUM")  # LOW, MEDIUM, HIGH, COMPLEX
    functional_changes: Mapped[str] = mapped_column(Text, default="")
    db_changes: Mapped[str] = mapped_column(Text, default="")
    api_changes: Mapped[str] = mapped_column(Text, default="")
    frontend_changes: Mapped[str] = mapped_column(Text, default="")
    third_party_integrations: Mapped[str] = mapped_column(Text, default="")
    dependency_risks: Mapped[str] = mapped_column(Text, default="")
    developers_required: Mapped[int] = mapped_column(Integer, default=1)
    est_dev_hours: Mapped[float] = mapped_column(Float, default=0.0)
    est_sit_hours: Mapped[float] = mapped_column(Float, default=0.0)
    est_uat_hours: Mapped[float] = mapped_column(Float, default=0.0)
    est_bugfix_buffer_hours: Mapped[float] = mapped_column(Float, default=0.0)
    proposed_delivery_date: Mapped[date | None] = mapped_column(Date)
    release_prep_notes: Mapped[str] = mapped_column(Text, default="")
    technical_explanation: Mapped[str] = mapped_column(Text, default="")
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeadlineNegotiation(Base, TimestampMixin):
    __tablename__ = "deadline_negotiations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    requested_deadline: Mapped[date | None] = mapped_column(Date)
    proposed_deadline: Mapped[date] = mapped_column(Date)
    current_approved_deadline: Mapped[date | None] = mapped_column(Date)
    revision_reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="PENDING_APPROVAL", index=True)  # PENDING_APPROVAL, ACCEPTED, REJECTED, SCOPE_REDUCED, ESCALATED
    response_notes: Mapped[str] = mapped_column(Text, default="")
    responded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ScopeChangeProposal(Base, TimestampMixin):
    __tablename__ = "scope_change_proposals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(32), default="BUSINESS_REQUEST")  # ZOHO_UPDATE, BUSINESS_REQUEST, UAT_FEEDBACK
    additional_effort_hours: Mapped[float] = mapped_column(Float, default=0.0)
    proposed_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING_REVIEW", index=True)  # PENDING_REVIEW, APPROVED, REJECTED
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CRImpactedModule(Base, TimestampMixin):
    __tablename__ = "cr_impacted_modules"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_modules.id", ondelete="RESTRICT"), index=True)
    scope_description: Mapped[str] = mapped_column(Text, default="")
    lead_dev_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class DevTask(Base, TimestampMixin):
    __tablename__ = "dev_tasks"
    __table_args__ = (
        Index("ix_dev_tasks_cr_status", "cr_id", "status"),
        Index("ix_dev_tasks_developer_status", "assigned_developer_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_modules.id", ondelete="RESTRICT"), index=True)
    task_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(32), default="NORMAL", index=True)
    status: Mapped[str] = mapped_column(String(40), default="TODO", index=True)
    # Statuses: TODO, IN_PROGRESS, BLOCKED, CODE_REVIEW, READY_FOR_SIT, SIT_IN_PROGRESS, SIT_FAILED, SIT_PASSED, DEVELOPMENT_COMPLETE
    assigned_developer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0)
    actual_hours: Mapped[float] = mapped_column(Float, default=0.0)
    start_date: Mapped[date | None] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date, index=True)
    blockers: Mapped[str] = mapped_column(Text, default="")
    technical_evidence: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    screen_name: Mapped[str | None] = mapped_column(String(240))
    is_overdue: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    overdue_reason: Mapped[str | None] = mapped_column(Text)


class TaskWorkLog(Base, TimestampMixin):
    __tablename__ = "task_work_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dev_tasks.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    hours_spent: Mapped[float] = mapped_column(Float)
    log_date: Mapped[date] = mapped_column(Date, default=date.today)
    notes: Mapped[str] = mapped_column(Text, default="")
