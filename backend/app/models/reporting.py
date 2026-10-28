import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enterprise import TimestampMixin


class NotificationEvent(Base):
    __tablename__ = "notification_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    recipient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class KRARecord(Base, TimestampMixin):
    __tablename__ = "kra_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reporting_period: Mapped[str] = mapped_column(String(64), index=True)  # e.g. 2026-Q4
    cr_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("change_requests.id", ondelete="SET NULL"), index=True)
    role_played: Mapped[str] = mapped_column(String(64))
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    defects_fixed: Mapped[int] = mapped_column(Integer, default=0)
    sit_executions_count: Mapped[int] = mapped_column(Integer, default=0)
    uat_tests_count: Mapped[int] = mapped_column(Integer, default=0)
    delivery_variance_days: Mapped[int] = mapped_column(Integer, default=0)
    delays_business_reason: Mapped[str] = mapped_column(Text, default="")
    complexity_weight: Mapped[float] = mapped_column(Float, default=1.0)
    comments: Mapped[str] = mapped_column(Text, default="")
