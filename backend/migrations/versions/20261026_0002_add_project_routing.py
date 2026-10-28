"""Add Zoho project and developer assignment fields.

Revision ID: 20261026_0002
Revises: 20261023_0001
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261026_0002"
down_revision: str | None = "20261023_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("work_items", sa.Column("project", sa.String(length=160), nullable=False, server_default="Unassigned Project"))
    op.add_column("work_items", sa.Column("developer", sa.String(length=160), nullable=False, server_default="Unassigned"))
    op.create_index("ix_work_items_project", "work_items", ["project"])
    op.create_index("ix_work_items_developer", "work_items", ["developer"])


def downgrade() -> None:
    op.drop_index("ix_work_items_developer", table_name="work_items")
    op.drop_index("ix_work_items_project", table_name="work_items")
    op.drop_column("work_items", "developer")
    op.drop_column("work_items", "project")
