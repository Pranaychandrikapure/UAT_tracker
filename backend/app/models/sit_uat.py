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


class SITCycle(Base, TimestampMixin):
    __tablename__ = "sit_cycles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    module_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("project_modules.id", ondelete="SET NULL"), index=True)
    cycle_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="IN_PROGRESS", index=True)  # IN_PROGRESS, PASSED, FAILED
    lead_approver_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    signed_off_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str] = mapped_column(Text, default="")


class SITExecution(Base, TimestampMixin):
    __tablename__ = "sit_executions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    sit_cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sit_cycles.id", ondelete="CASCADE"), index=True)
    dev_task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("dev_tasks.id", ondelete="SET NULL"), index=True)
    test_case_title: Mapped[str] = mapped_column(String(240))
    test_steps: Mapped[str] = mapped_column(Text, default="")
    expected_result: Mapped[str] = mapped_column(Text, default="")
    actual_result: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[str] = mapped_column(String(32), default="NOT_RUN", index=True)  # PASS, FAIL, BLOCKED, NOT_RUN
    executed_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    evidence_notes: Mapped[str] = mapped_column(Text, default="")
    defect_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UATCycle(Base, TimestampMixin):
    __tablename__ = "uat_cycles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    release_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    cycle_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="NOT_STARTED", index=True)  # NOT_STARTED, IN_PROGRESS, PASSED, FAILED
    lead_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    signoff_notes: Mapped[str] = mapped_column(Text, default="")
    signed_off_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UATTestExecution(Base, TimestampMixin):
    __tablename__ = "uat_test_executions"
    __table_args__ = (
        Index("ix_uat_test_executions_cr_status", "cr_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    uat_cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("uat_cycles.id", ondelete="CASCADE"), index=True)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    defect_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    test_name: Mapped[str] = mapped_column(String(240))
    steps: Mapped[str] = mapped_column(Text, default="")
    expected_result: Mapped[str] = mapped_column(Text, default="")
    actual_result: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="NOT_RUN", index=True)  # NOT_RUN, PASS, FAIL, BLOCKED
    tester_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    evidence_url: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
