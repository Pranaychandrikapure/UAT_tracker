import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WorkItemType(str, enum.Enum):
    CR = "CR"
    CRS = "CRS"


class WorkItem(Base):
    __tablename__ = "work_items"
    __table_args__ = (
        Index("ix_work_items_status_updated_at", "status", "updated_at"),
        Index("ix_work_items_type_parent_id", "item_type", "parent_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    item_type: Mapped[WorkItemType] = mapped_column(Enum(WorkItemType, name="work_item_type"))
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("work_items.id", ondelete="RESTRICT"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text, default="")
    project: Mapped[str] = mapped_column(String(160), default="Unassigned Project", index=True)
    developer: Mapped[str] = mapped_column(String(160), default="Unassigned", index=True)
    assigned_at: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(64), default="Assigned", index=True)
    priority: Mapped[str] = mapped_column(String(32), default="Normal", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    parent: Mapped["WorkItem | None"] = relationship(
        remote_side="WorkItem.id", back_populates="children"
    )
    children: Mapped[list["WorkItem"]] = relationship(back_populates="parent")

