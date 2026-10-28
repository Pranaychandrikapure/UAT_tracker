import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.work_item import WorkItemType


class WorkItemCreate(BaseModel):
    key: str = Field(min_length=2, max_length=32, pattern=r"^[A-Z0-9-]+$")
    item_type: WorkItemType
    parent_id: uuid.UUID | None = None
    title: str = Field(min_length=3, max_length=240)
    description: str = Field(default="", max_length=20_000)
    project: str = Field(default="Unassigned Project", min_length=2, max_length=160)
    developer: str = Field(default="Unassigned", min_length=2, max_length=160)
    assigned_at: date = Field(default_factory=date.today)
    due_date: date | None = None
    priority: str = Field(default="Normal", min_length=2, max_length=32)

    @model_validator(mode="after")
    def validate_parent(self) -> "WorkItemCreate":
        if self.item_type == WorkItemType.CRS and self.parent_id is None:
            raise ValueError("A CRS must reference its parent CR")
        if self.item_type == WorkItemType.CR and self.parent_id is not None:
            raise ValueError("A CR cannot have a parent work item")
        return self


class WorkItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    item_type: WorkItemType
    parent_id: uuid.UUID | None
    title: str
    description: str
    project: str
    developer: str
    assigned_at: date
    due_date: date | None
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime


class WorkItemList(BaseModel):
    items: list[WorkItemRead]
    total: int
    limit: int
    offset: int


class DashboardSummary(BaseModel):
    total: int
    in_development: int
    ready_for_uat: int
    uat_approved: int

