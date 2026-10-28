"""Add complete enterprise CR workflow, modules, dev tasks, SIT, defects, releases, deployments, email threads, SRN, and UAT tables.

Revision ID: 20261027_0005
Revises: 20261027_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261027_0005"
down_revision: str | None = "20261027_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    # 1. Update users
    op.add_column("users", sa.Column("role_title", sa.String(100), server_default="Employee", nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(300), nullable=True))

    # 2. Update change_requests
    op.add_column("change_requests", sa.Column("external_record_id", sa.String(120), nullable=True))
    op.create_index("ix_change_requests_external_record_id", "change_requests", ["external_record_id"])
    op.add_column("change_requests", sa.Column("pm_proposed_deadline", sa.Date(), nullable=True))
    op.add_column("change_requests", sa.Column("dev_target_date", sa.Date(), nullable=True))
    op.add_column("change_requests", sa.Column("sit_target_date", sa.Date(), nullable=True))
    op.add_column("change_requests", sa.Column("uat_target_date", sa.Date(), nullable=True))
    op.add_column("change_requests", sa.Column("prod_target_date", sa.Date(), nullable=True))

    op.add_column("change_requests", sa.Column("dev_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("sit_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("srn_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("uat_deployed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("uat_signed_off_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("business_accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("prod_deployed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("change_requests", sa.Column("source_modified_at", sa.DateTime(timezone=True), nullable=True))

    # 3. Impact Assessment
    op.create_table(
        "impact_assessments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("assessed_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("dev_complexity", sa.String(32), server_default="MEDIUM", nullable=False),
        sa.Column("functional_changes", sa.Text(), server_default="", nullable=False),
        sa.Column("db_changes", sa.Text(), server_default="", nullable=False),
        sa.Column("api_changes", sa.Text(), server_default="", nullable=False),
        sa.Column("frontend_changes", sa.Text(), server_default="", nullable=False),
        sa.Column("third_party_integrations", sa.Text(), server_default="", nullable=False),
        sa.Column("dependency_risks", sa.Text(), server_default="", nullable=False),
        sa.Column("developers_required", sa.Integer(), server_default="1", nullable=False),
        sa.Column("est_dev_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("est_sit_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("est_uat_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("est_bugfix_buffer_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("proposed_delivery_date", sa.Date(), nullable=True),
        sa.Column("release_prep_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("technical_explanation", sa.Text(), server_default="", nullable=False),
        sa.Column("assessed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_impact_assessments_cr_id", "impact_assessments", ["cr_id"])
    op.create_index("ix_impact_assessments_assessed_by", "impact_assessments", ["assessed_by_user_id"])

    # 4. Deadline Negotiation
    op.create_table(
        "deadline_negotiations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("requested_deadline", sa.Date(), nullable=True),
        sa.Column("proposed_deadline", sa.Date(), nullable=False),
        sa.Column("current_approved_deadline", sa.Date(), nullable=True),
        sa.Column("revision_reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), server_default="PENDING_APPROVAL", nullable=False),
        sa.Column("response_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("responded_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_deadline_negotiations_cr_id", "deadline_negotiations", ["cr_id"])
    op.create_index("ix_deadline_negotiations_status", "deadline_negotiations", ["status"])

    # 5. Scope Change Proposals
    op.create_table(
        "scope_change_proposals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", sa.String(32), server_default="BUSINESS_REQUEST", nullable=False),
        sa.Column("additional_effort_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("proposed_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(32), server_default="PENDING_REVIEW", nullable=False),
        sa.Column("approved_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_scope_change_proposals_cr_id", "scope_change_proposals", ["cr_id"])

    # 6. CR Impacted Modules
    op.create_table(
        "cr_impacted_modules",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_id", sa.Uuid(), sa.ForeignKey("project_modules.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("scope_description", sa.Text(), server_default="", nullable=False),
        sa.Column("lead_dev_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_cr_impacted_modules_cr_id", "cr_impacted_modules", ["cr_id"])
    op.create_index("ix_cr_impacted_modules_module_id", "cr_impacted_modules", ["module_id"])

    # 7. Dev Tasks
    op.create_table(
        "dev_tasks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_id", sa.Uuid(), sa.ForeignKey("project_modules.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("task_number", sa.String(40), nullable=False, unique=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("priority", sa.String(32), server_default="NORMAL", nullable=False),
        sa.Column("status", sa.String(40), server_default="TODO", nullable=False),
        sa.Column("assigned_developer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reviewer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("estimated_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("actual_hours", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("blockers", sa.Text(), server_default="", nullable=False),
        sa.Column("technical_evidence", sa.Text(), server_default="", nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_dev_tasks_task_number", "dev_tasks", ["task_number"])
    op.create_index("ix_dev_tasks_cr_status", "dev_tasks", ["cr_id", "status"])
    op.create_index("ix_dev_tasks_developer_status", "dev_tasks", ["assigned_developer_id", "status"])

    # 8. Task Work Logs
    op.create_table(
        "task_work_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("task_id", sa.Uuid(), sa.ForeignKey("dev_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("hours_spent", sa.Float(), nullable=False),
        sa.Column("log_date", sa.Date(), server_default=sa.func.current_date(), nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_task_work_logs_task_id", "task_work_logs", ["task_id"])

    # 9. SIT Cycles
    op.create_table(
        "sit_cycles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_id", sa.Uuid(), sa.ForeignKey("project_modules.id", ondelete="SET NULL"), nullable=True),
        sa.Column("cycle_number", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(32), server_default="IN_PROGRESS", nullable=False),
        sa.Column("lead_approver_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("signed_off_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_sit_cycles_cr_id", "sit_cycles", ["cr_id"])

    # 10. SIT Executions
    op.create_table(
        "sit_executions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("sit_cycle_id", sa.Uuid(), sa.ForeignKey("sit_cycles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dev_task_id", sa.Uuid(), sa.ForeignKey("dev_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("test_case_title", sa.String(240), nullable=False),
        sa.Column("test_steps", sa.Text(), server_default="", nullable=False),
        sa.Column("expected_result", sa.Text(), server_default="", nullable=False),
        sa.Column("actual_result", sa.Text(), server_default="", nullable=False),
        sa.Column("result", sa.String(32), server_default="NOT_RUN", nullable=False),
        sa.Column("executed_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("evidence_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("defect_id", sa.Uuid(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_sit_executions_sit_cycle_id", "sit_executions", ["sit_cycle_id"])

    # 11. Defects / Bugs
    op.create_table(
        "defects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("bug_number", sa.String(40), nullable=False, unique=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_id", sa.Uuid(), sa.ForeignKey("project_modules.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dev_task_id", sa.Uuid(), sa.ForeignKey("dev_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reproduction_steps", sa.Text(), server_default="", nullable=False),
        sa.Column("severity", sa.String(32), server_default="MAJOR", nullable=False),
        sa.Column("priority", sa.String(32), server_default="NORMAL", nullable=False),
        sa.Column("status", sa.String(40), server_default="OPEN", nullable=False),
        sa.Column("assigned_developer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reporter_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reported_by_team", sa.String(32), server_default="UAT", nullable=False),
        sa.Column("environment", sa.String(64), server_default="UAT", nullable=False),
        sa.Column("current_release_id", sa.Uuid(), nullable=True),
        sa.Column("current_srn_id", sa.Uuid(), nullable=True),
        sa.Column("sit_passed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("srn_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uat_deployed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_defects_bug_number", "defects", ["bug_number"])
    op.create_index("ix_defects_cr_status", "defects", ["cr_id", "status"])
    op.create_index("ix_defects_developer_status", "defects", ["assigned_developer_id", "status"])

    # 12. Defect Resolution Attempts
    op.create_table(
        "defect_resolution_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("defect_id", sa.Uuid(), sa.ForeignKey("defects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attempt_number", sa.Integer(), server_default="1", nullable=False),
        sa.Column("developer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("resolution_notes", sa.Text(), nullable=False),
        sa.Column("code_reference", sa.String(255), server_default="", nullable=False),
        sa.Column("sit_result", sa.String(32), server_default="PASSED", nullable=False),
        sa.Column("sit_notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_defect_resolution_attempts_defect_id", "defect_resolution_attempts", ["defect_id"])

    # 13. Defect Status History
    op.create_table(
        "defect_status_history",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("defect_id", sa.Uuid(), sa.ForeignKey("defects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_status", sa.String(40), nullable=True),
        sa.Column("new_status", sa.String(40), nullable=False),
        sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reason", sa.Text(), server_default="", nullable=False),
        sa.Column("release_id", sa.Uuid(), nullable=True),
        sa.Column("deployment_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_defect_status_history_defect_id", "defect_status_history", ["defect_id"])

    # 14. Releases
    op.create_table(
        "releases",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("release_number", sa.String(64), nullable=False, unique=True),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("environment", sa.String(32), server_default="UAT", nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("release_owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("planned_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(32), server_default="PLANNED", nullable=False),
        sa.Column("release_notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_releases_release_number", "releases", ["release_number"])
    op.create_index("ix_releases_version", "releases", ["version"])

    # 15. Release Items
    op.create_table(
        "release_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("release_id", sa.Uuid(), sa.ForeignKey("releases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("defect_id", sa.Uuid(), sa.ForeignKey("defects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dev_task_id", sa.Uuid(), sa.ForeignKey("dev_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_type", sa.String(32), server_default="CR_CHANGE", nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_release_items_release_id", "release_items", ["release_id"])

    # 16. Deployments
    op.create_table(
        "deployments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("release_id", sa.Uuid(), sa.ForeignKey("releases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("environment", sa.String(32), server_default="UAT", nullable=False),
        sa.Column("deployment_owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(32), server_default="PENDING", nullable=False),
        sa.Column("build_identifier", sa.String(120), server_default="", nullable=False),
        sa.Column("confirmation_evidence", sa.Text(), server_default="", nullable=False),
        sa.Column("failure_reason", sa.Text(), server_default="", nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_time", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_deployments_release_id", "deployments", ["release_id"])

    # 17. Email Threads
    op.create_table(
        "email_threads",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider", sa.String(64), server_default="INTERNAL_SMTP", nullable=False),
        sa.Column("mailbox", sa.String(320), nullable=False),
        sa.Column("provider_thread_id", sa.String(255), nullable=False),
        sa.Column("original_subject", sa.String(500), nullable=False),
        sa.Column("root_message_id", sa.String(255), nullable=False),
        sa.Column("latest_message_id", sa.String(255), nullable=False),
        sa.Column("reference_headers", sa.Text(), server_default="", nullable=False),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_email_threads_cr_id", "email_threads", ["cr_id"])
    op.create_index("ix_email_threads_provider_thread_id", "email_threads", ["provider_thread_id"])

    # 18. Email Messages
    op.create_table(
        "email_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("thread_id", sa.Uuid(), sa.ForeignKey("email_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("srn_id", sa.Uuid(), nullable=True),
        sa.Column("message_direction", sa.String(32), server_default="OUTBOUND", nullable=False),
        sa.Column("sender", sa.String(320), nullable=False),
        sa.Column("recipients_to", sa.Text(), nullable=False),
        sa.Column("recipients_cc", sa.Text(), server_default="", nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column("in_reply_to", sa.String(255), nullable=True),
        sa.Column("references_header", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), server_default="PENDING", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_details", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_email_messages_thread_id", "email_messages", ["thread_id"])

    # 19. Email Send Jobs
    op.create_table(
        "email_send_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("srn_id", sa.Uuid(), nullable=False),
        sa.Column("thread_id", sa.Uuid(), sa.ForeignKey("email_threads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("idempotency_key", sa.String(200), nullable=False, unique=True),
        sa.Column("status", sa.String(32), server_default="PENDING", nullable=False),
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="3", nullable=False),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_response", sa.Text(), server_default="", nullable=False),
        sa.Column("error_log", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_email_send_jobs_srn_id", "email_send_jobs", ["srn_id"])

    # 20. SRN Documents
    op.create_table(
        "srn_documents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("srn_number", sa.String(64), nullable=False, unique=True),
        sa.Column("release_id", sa.Uuid(), sa.ForeignKey("releases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("target_environment", sa.String(32), server_default="UAT", nullable=False),
        sa.Column("release_version", sa.String(64), server_default="", nullable=False),
        sa.Column("change_summary", sa.Text(), server_default="", nullable=False),
        sa.Column("module_changes", sa.Text(), server_default="", nullable=False),
        sa.Column("technical_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("sit_summary", sa.Text(), server_default="", nullable=False),
        sa.Column("known_limitations", sa.Text(), server_default="", nullable=False),
        sa.Column("deployment_instructions", sa.Text(), server_default="", nullable=False),
        sa.Column("rollback_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(32), server_default="DRAFT", nullable=False),
        sa.Column("email_thread_id", sa.Uuid(), sa.ForeignKey("email_threads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("email_subject", sa.String(500), server_default="", nullable=False),
        sa.Column("email_recipients_to", sa.Text(), server_default="", nullable=False),
        sa.Column("email_recipients_cc", sa.Text(), server_default="", nullable=False),
        sa.Column("rendered_email_body", sa.Text(), server_default="", nullable=False),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_srn_documents_srn_number", "srn_documents", ["srn_number"])

    # 21. SRN Items
    op.create_table(
        "srn_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("srn_id", sa.Uuid(), sa.ForeignKey("srn_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("defect_id", sa.Uuid(), sa.ForeignKey("defects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dev_task_id", sa.Uuid(), sa.ForeignKey("dev_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_type", sa.String(32), server_default="CR_CHANGE", nullable=False),
        sa.Column("status", sa.String(32), server_default="READY", nullable=False),
        sa.Column("fix_summary", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_srn_items_srn_id", "srn_items", ["srn_id"])

    # 22. UAT Cycles
    op.create_table(
        "uat_cycles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("release_id", sa.Uuid(), nullable=True),
        sa.Column("cycle_number", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(32), server_default="NOT_STARTED", nullable=False),
        sa.Column("lead_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("signoff_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("signed_off_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_uat_cycles_cr_id", "uat_cycles", ["cr_id"])

    # 23. UAT Test Executions
    op.create_table(
        "uat_test_executions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("uat_cycle_id", sa.Uuid(), sa.ForeignKey("uat_cycles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("defect_id", sa.Uuid(), nullable=True),
        sa.Column("test_name", sa.String(240), nullable=False),
        sa.Column("steps", sa.Text(), server_default="", nullable=False),
        sa.Column("expected_result", sa.Text(), server_default="", nullable=False),
        sa.Column("actual_result", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(32), server_default="NOT_RUN", nullable=False),
        sa.Column("tester_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("evidence_url", sa.Text(), server_default="", nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_uat_test_executions_uat_cycle_id", "uat_test_executions", ["uat_cycle_id"])
    op.create_index("ix_uat_test_executions_cr_status", "uat_test_executions", ["cr_id", "status"])

    # 24. Notification Events
    op.create_table(
        "notification_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recipient_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notification_events_recipient", "notification_events", ["recipient_id"])
    op.create_index("ix_notification_events_is_read", "notification_events", ["is_read"])

    # 25. KRA Records
    op.create_table(
        "kra_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reporting_period", sa.String(64), nullable=False),
        sa.Column("cr_id", sa.Uuid(), sa.ForeignKey("change_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("role_played", sa.String(64), nullable=False),
        sa.Column("tasks_completed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("defects_fixed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sit_executions_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("uat_tests_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("delivery_variance_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("delays_business_reason", sa.Text(), server_default="", nullable=False),
        sa.Column("complexity_weight", sa.Float(), server_default="1.0", nullable=False),
        sa.Column("comments", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_kra_records_user_id", "kra_records", ["user_id"])
    op.create_index("ix_kra_records_reporting_period", "kra_records", ["reporting_period"])


def downgrade() -> None:
    for table in (
        "kra_records",
        "notification_events",
        "uat_test_executions",
        "uat_cycles",
        "srn_items",
        "srn_documents",
        "email_send_jobs",
        "email_messages",
        "email_threads",
        "deployments",
        "release_items",
        "releases",
        "defect_status_history",
        "defect_resolution_attempts",
        "defects",
        "sit_executions",
        "sit_cycles",
        "task_work_logs",
        "dev_tasks",
        "cr_impacted_modules",
        "scope_change_proposals",
        "deadline_negotiations",
        "impact_assessments",
    ):
        op.drop_table(table)

    op.drop_column("change_requests", "source_modified_at")
    op.drop_column("change_requests", "source_created_at")
    op.drop_column("change_requests", "closed_at")
    op.drop_column("change_requests", "prod_deployed_at")
    op.drop_column("change_requests", "business_accepted_at")
    op.drop_column("change_requests", "uat_signed_off_at")
    op.drop_column("change_requests", "uat_deployed_at")
    op.drop_column("change_requests", "srn_sent_at")
    op.drop_column("change_requests", "sit_completed_at")
    op.drop_column("change_requests", "dev_completed_at")
    op.drop_column("change_requests", "prod_target_date")
    op.drop_column("change_requests", "uat_target_date")
    op.drop_column("change_requests", "sit_target_date")
    op.drop_column("change_requests", "dev_target_date")
    op.drop_column("change_requests", "pm_proposed_deadline")
    op.drop_index("ix_change_requests_external_record_id", "change_requests")
    op.drop_column("change_requests", "external_record_id")

    op.drop_column("users", "avatar_url")
    op.drop_column("users", "role_title")
