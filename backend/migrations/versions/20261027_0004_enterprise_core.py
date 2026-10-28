"""Add enterprise identity, RBAC, project, CR, audit, and outbox foundation.

Revision ID: 20261027_0004
Revises: 20261026_0003
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261027_0004"
down_revision: str | None = "20261026_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("employee_code", sa.String(64), nullable=False, unique=True), sa.Column("email", sa.String(320), nullable=False, unique=True), sa.Column("display_name", sa.String(180), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), *timestamps())
    op.create_index("ix_users_employee_code", "users", ["employee_code"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_is_active", "users", ["is_active"])

    op.create_table("departments", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("code", sa.String(64), nullable=False, unique=True), sa.Column("name", sa.String(180), nullable=False, unique=True), *timestamps())
    op.create_table("roles", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("code", sa.String(80), nullable=False, unique=True), sa.Column("name", sa.String(140), nullable=False))
    op.create_index("ix_roles_code", "roles", ["code"])
    op.create_table("permissions", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("code", sa.String(120), nullable=False, unique=True), sa.Column("description", sa.String(300), nullable=False, server_default=""))
    op.create_index("ix_permissions_code", "permissions", ["code"])
    op.create_table("role_permissions", sa.Column("role_id", sa.Uuid(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True), sa.Column("permission_id", sa.Uuid(), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True))

    op.create_table("teams", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("department_id", sa.Uuid(), sa.ForeignKey("departments.id", ondelete="RESTRICT")), sa.Column("code", sa.String(64), nullable=False, unique=True), sa.Column("name", sa.String(180), nullable=False), sa.Column("lead_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")), *timestamps())
    op.create_table("team_members", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False), sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), *timestamps(), sa.UniqueConstraint("team_id", "user_id", name="uq_team_member"))
    op.create_index("ix_team_members_team_id", "team_members", ["team_id"])
    op.create_index("ix_team_members_user_id", "team_members", ["user_id"])

    op.create_table("projects", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("code", sa.String(64), nullable=False, unique=True), sa.Column("name", sa.String(180), nullable=False), sa.Column("status", sa.String(32), nullable=False, server_default="ACTIVE"), *timestamps())
    op.create_index("ix_projects_code", "projects", ["code"])
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_table("project_members", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False), sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), *timestamps(), sa.UniqueConstraint("project_id", "user_id", name="uq_project_member"))
    op.create_index("ix_project_members_project_id", "project_members", ["project_id"])
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])
    op.create_table("project_modules", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False), sa.Column("code", sa.String(64), nullable=False), sa.Column("name", sa.String(180), nullable=False), sa.Column("description", sa.Text(), nullable=False, server_default=""), *timestamps(), sa.UniqueConstraint("project_id", "code", name="uq_project_module_code"))
    op.create_index("ix_project_modules_project_id", "project_modules", ["project_id"])

    op.create_table("user_role_assignments", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("role_id", sa.Uuid(), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False), sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE")), sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="CASCADE")), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("effective_from", sa.Date(), nullable=False, server_default=sa.func.current_date()), sa.Column("effective_to", sa.Date()), *timestamps(), sa.UniqueConstraint("user_id", "role_id", "project_id", "team_id", name="uq_user_role_scope"))
    op.create_index("ix_user_role_assignments_user_id", "user_role_assignments", ["user_id"])
    op.create_index("ix_user_role_assignments_role_id", "user_role_assignments", ["role_id"])
    op.create_index("ix_user_role_assignments_project_id", "user_role_assignments", ["project_id"])
    op.create_index("ix_user_role_assignments_team_id", "user_role_assignments", ["team_id"])

    op.create_table("change_requests", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("reference_number", sa.String(40), nullable=False, unique=True), sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False), sa.Column("source", sa.String(16), nullable=False, server_default="INTERNAL"), sa.Column("external_owner_name", sa.String(180)), sa.Column("ba_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("primary_pm_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT")), sa.Column("title", sa.String(240), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("business_justification", sa.Text(), nullable=False, server_default=""), sa.Column("priority", sa.String(32), nullable=False, server_default="NORMAL"), sa.Column("status", sa.String(64), nullable=False, server_default="DRAFT"), sa.Column("requested_deadline", sa.Date()), sa.Column("approved_deadline", sa.Date()), sa.Column("current_scope_version", sa.Integer(), nullable=False, server_default="1"), *timestamps(), sa.CheckConstraint("source IN ('INTERNAL','ZOHO')", name="ck_cr_source"))
    for column in ("reference_number", "project_id", "ba_user_id", "primary_pm_id", "priority", "status", "requested_deadline", "approved_deadline"):
        op.create_index(f"ix_change_requests_{column}", "change_requests", [column])
    op.create_index("ix_change_requests_project_status", "change_requests", ["project_id", "status"])

    op.create_table("cr_stakeholders", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False), sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("responsibility", sa.String(80), nullable=False), sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), sa.Column("effective_to", sa.DateTime(timezone=True)), sa.Column("assignment_reason", sa.Text(), nullable=False, server_default=""), *timestamps(), sa.UniqueConstraint("cr_id", "user_id", "responsibility", "effective_from", name="uq_cr_stakeholder_assignment"))
    op.create_index("ix_cr_stakeholders_cr_id", "cr_stakeholders", ["cr_id"])
    op.create_index("ix_cr_stakeholders_user_id", "cr_stakeholders", ["user_id"])
    op.create_index("ix_cr_stakeholders_responsibility", "cr_stakeholders", ["responsibility"])
    op.create_index("uq_active_primary_pm_per_cr", "cr_stakeholders", ["cr_id"], unique=True, postgresql_where=sa.text("responsibility = 'PRIMARY_PM' AND is_primary = true AND effective_to IS NULL"))

    op.create_table("cr_status_history", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False), sa.Column("previous_status", sa.String(64)), sa.Column("new_status", sa.String(64), nullable=False), sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("reason", sa.Text(), nullable=False, server_default=""), sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_cr_status_history_cr_id", "cr_status_history", ["cr_id"])
    op.create_index("ix_cr_status_history_actor_id", "cr_status_history", ["actor_id"])
    op.create_index("ix_cr_status_history_new_status", "cr_status_history", ["new_status"])
    op.create_index("ix_cr_status_history_changed_at", "cr_status_history", ["changed_at"])

    op.create_table("audit_logs", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("entity_type", sa.String(80), nullable=False), sa.Column("entity_id", sa.Uuid(), nullable=False), sa.Column("action", sa.String(80), nullable=False), sa.Column("change_payload", sa.Text(), nullable=False, server_default="{}"), sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    for column in ("actor_id", "entity_type", "entity_id", "action", "occurred_at"):
        op.create_index(f"ix_audit_logs_{column}", "audit_logs", [column])
    op.create_table("outbox_events", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("event_type", sa.String(120), nullable=False), sa.Column("aggregate_type", sa.String(80), nullable=False), sa.Column("aggregate_id", sa.Uuid(), nullable=False), sa.Column("payload", sa.Text(), nullable=False), sa.Column("deduplication_key", sa.String(200), nullable=False), sa.Column("status", sa.String(24), nullable=False, server_default="PENDING"), sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"), sa.Column("available_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), sa.Column("processed_at", sa.DateTime(timezone=True)), sa.UniqueConstraint("deduplication_key", name="uq_outbox_deduplication_key"))
    for column in ("event_type", "aggregate_id", "status", "available_at"):
        op.create_index(f"ix_outbox_events_{column}", "outbox_events", [column])


def downgrade() -> None:
    for table in ("outbox_events", "audit_logs", "cr_status_history", "cr_stakeholders", "change_requests", "user_role_assignments", "project_modules", "project_members", "projects", "team_members", "teams", "role_permissions", "permissions", "roles", "departments", "users"):
        op.drop_table(table)
