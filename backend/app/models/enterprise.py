import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    employee_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(180))
    role_title: Mapped[str | None] = mapped_column(String(100), default="Employee")
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(300))
    google_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    auth_provider: Mapped[str | None] = mapped_column(String(50), default="LOCAL")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class Department(Base, TimestampMixin):
    __tablename__ = "departments"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(180), unique=True)


class Team(Base, TimestampMixin):
    __tablename__ = "teams"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id", ondelete="RESTRICT"))
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(180))
    lead_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class TeamMember(Base, TimestampMixin):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(140))


class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(300), default="")


class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", index=True)
    change_requests: Mapped[list["ChangeRequest"]] = relationship(back_populates="project")


class ProjectMember(Base, TimestampMixin):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_member"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ProjectModule(Base, TimestampMixin):
    __tablename__ = "project_modules"
    __table_args__ = (UniqueConstraint("project_id", "code", name="uq_project_module_code"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    screens: Mapped[list["ModuleScreen"]] = relationship("ModuleScreen", backref="module", cascade="all, delete-orphan", lazy="selectin")


class ModuleScreen(Base, TimestampMixin):
    __tablename__ = "module_screens"
    __table_args__ = (UniqueConstraint("module_id", "name", name="uq_module_screen_name"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_modules.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(64), default="")
    name: Mapped[str] = mapped_column(String(180), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    screen_type: Mapped[str] = mapped_column(String(32), default="EXISTING")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserRoleAssignment(Base, TimestampMixin):
    __tablename__ = "user_role_assignments"
    __table_args__ = (UniqueConstraint("user_id", "role_id", "project_id", "team_id", name="uq_user_role_scope"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[date] = mapped_column(Date, default=date.today)
    effective_to: Mapped[date | None] = mapped_column(Date)


class ChangeRequest(Base, TimestampMixin):
    __tablename__ = "change_requests"
    __table_args__ = (
        CheckConstraint("source IN ('INTERNAL','ZOHO')", name="ck_cr_source"),
        Index("ix_change_requests_project_status", "project_id", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reference_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), index=True)
    source: Mapped[str] = mapped_column(String(16), default="INTERNAL")
    external_record_id: Mapped[str | None] = mapped_column(String(120), index=True)
    external_owner_name: Mapped[str | None] = mapped_column(String(180))
    ba_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    primary_pm_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text)
    business_justification: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(32), default="NORMAL", index=True)
    status: Mapped[str] = mapped_column(String(64), default="DRAFT", index=True)
    requested_deadline: Mapped[date | None] = mapped_column(Date, index=True)
    pm_proposed_deadline: Mapped[date | None] = mapped_column(Date)
    approved_deadline: Mapped[date | None] = mapped_column(Date, index=True)
    dev_target_date: Mapped[date | None] = mapped_column(Date)
    sit_target_date: Mapped[date | None] = mapped_column(Date)
    uat_target_date: Mapped[date | None] = mapped_column(Date)
    prod_target_date: Mapped[date | None] = mapped_column(Date)

    # Separate lifecycle milestone completion timestamps
    dev_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sit_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    srn_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uat_deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uat_signed_off_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    business_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    prod_deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    source_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_scope_version: Mapped[int] = mapped_column(default=1)

    hold_reason: Mapped[str | None] = mapped_column(Text)
    hold_until_date: Mapped[date | None] = mapped_column(Date)
    hold_status: Mapped[str | None] = mapped_column(String(40))

    # SOP 2.0 Tracking & Security Gates
    screen_name: Mapped[str | None] = mapped_column(String(240))
    screen_type: Mapped[str | None] = mapped_column(String(32), default="EXISTING")
    is_uat_unlocked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    pl_review_status: Mapped[str | None] = mapped_column(String(32), default="PENDING")
    pl_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    spm_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    escalation_reason: Mapped[str | None] = mapped_column(Text)
    assigned_ba_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    revert_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reverted_by_role: Mapped[str | None] = mapped_column(String(80), nullable=True)
    reverted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    management_review_status: Mapped[str | None] = mapped_column(String(32), default="PENDING")

    project: Mapped[Project] = relationship(back_populates="change_requests")


class CRStakeholder(Base, TimestampMixin):
    __tablename__ = "cr_stakeholders"
    __table_args__ = (UniqueConstraint("cr_id", "user_id", "responsibility", "effective_from", name="uq_cr_stakeholder_assignment"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    responsibility: Mapped[str] = mapped_column(String(80), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    assignment_reason: Mapped[str] = mapped_column(Text, default="")


class CRStatusHistory(Base):
    __tablename__ = "cr_status_history"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    previous_status: Mapped[str | None] = mapped_column(String(64))
    new_status: Mapped[str] = mapped_column(String(64), index=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    change_payload: Mapped[str] = mapped_column(Text, default="{}")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    __table_args__ = (UniqueConstraint("deduplication_key", name="uq_outbox_deduplication_key"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(120), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(80))
    aggregate_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    payload: Mapped[str] = mapped_column(Text)
    deduplication_key: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(24), default="PENDING", index=True)
    attempt_count: Mapped[int] = mapped_column(default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CRActivity(Base, TimestampMixin):
    __tablename__ = "cr_activities"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    cr_ref: Mapped[str] = mapped_column(String(40), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    actor_name: Mapped[str] = mapped_column(String(180))
    actor_role: Mapped[str] = mapped_column(String(80))
    details: Mapped[str] = mapped_column(Text)


class CRAttachment(Base, TimestampMixin):
    __tablename__ = "cr_attachments"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    uploader_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    uploader_name: Mapped[str] = mapped_column(String(180), default="")
    file_type: Mapped[str] = mapped_column(String(32), default="UPLOAD")  # UPLOAD, EXTERNAL_LINK
    original_name: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(Text)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    file_format: Mapped[str | None] = mapped_column(String(80), nullable=True)  # image/png, application/pdf, etc.
    note: Mapped[str] = mapped_column(Text, default="")


class CRDiscussion(Base, TimestampMixin):
    __tablename__ = "cr_discussions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cr_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("change_requests.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("dev_tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    developer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    developer_name: Mapped[str] = mapped_column(String(180))
    title: Mapped[str] = mapped_column(String(255))
    concern_text: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(32), default="NORMAL", index=True)  # NORMAL, HIGH, CRITICAL, URGENT
    current_level: Mapped[str] = mapped_column(String(32), default="PM", index=True)  # PM, SPM, PL, BA
    status: Mapped[str] = mapped_column(String(32), default="OPEN", index=True)  # OPEN, RESOLVED, CLOSED
    assigned_role: Mapped[str] = mapped_column(String(64), default="Project Manager")
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CRDiscussionMessage(Base, TimestampMixin):
    __tablename__ = "cr_discussion_messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    discussion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cr_discussions.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    sender_name: Mapped[str] = mapped_column(String(180))
    sender_role: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(64), default="COMMENT")  # CREATED, COMMENT, ESCALATE, RESOLVE
    message: Mapped[str] = mapped_column(Text)

