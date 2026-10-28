import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
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


class Defect(Base, TimestampMixin):
    __tablename__ = "defects"
    __table_args__ = (
        Index("ix_defects_cr_status", "cr_id", "status"),
        Index("ix_defects_developer_status", "assigned_developer_id", "status"),
        Index("ix_defects_severity_priority", "severity", "priority"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    bug_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    module_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("project_modules.id", ondelete="SET NULL"), index=True)
    dev_task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("dev_tasks.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text)
    reproduction_steps: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(32), default="MAJOR", index=True)  # BLOCKER, CRITICAL, MAJOR, MINOR
    priority: Mapped[str] = mapped_column(String(32), default="NORMAL", index=True)  # URGENT, HIGH, NORMAL, LOW
    status: Mapped[str] = mapped_column(String(40), default="OPEN", index=True)
    # Lifecycle: OPEN -> ASSIGNED -> IN_PROGRESS -> FIXED -> SIT_IN_PROGRESS -> SIT_PASSED -> READY_FOR_UAT_DEPLOYMENT -> SRN_SENT -> UAT_DEPLOYED -> READY_FOR_RETEST -> VERIFIED -> CLOSED (or REOPENED)

    assigned_developer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    reported_by_team: Mapped[str] = mapped_column(String(32), default="UAT")  # UAT, DEV, QA, BUSINESS
    environment: Mapped[str] = mapped_column(String(64), default="UAT")
    current_release_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    current_srn_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)

    # Distinct timestamps representing actual real-world transitions
    sit_passed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    srn_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uat_deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_notes: Mapped[str] = mapped_column(Text, default="")
    evidence_url: Mapped[str | None] = mapped_column(Text, default="")
    developer_feedback: Mapped[str | None] = mapped_column(Text, default="")
    developer_feedback_attachment: Mapped[str | None] = mapped_column(Text, default="")


class DefectResolutionAttempt(Base, TimestampMixin):
    __tablename__ = "defect_resolution_attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    defect_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("defects.id", ondelete="CASCADE"), index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    developer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    resolution_notes: Mapped[str] = mapped_column(Text)
    code_reference: Mapped[str] = mapped_column(String(255), default="")
    sit_result: Mapped[str] = mapped_column(String(32), default="PASSED")  # PASSED, FAILED
    sit_notes: Mapped[str] = mapped_column(Text, default="")


class DefectStatusHistory(Base):
    __tablename__ = "defect_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    defect_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("defects.id", ondelete="CASCADE"), index=True)
    previous_status: Mapped[str | None] = mapped_column(String(40))
    new_status: Mapped[str] = mapped_column(String(40), index=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    release_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    deployment_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
