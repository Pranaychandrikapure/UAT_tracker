"""Add CR assignment and due dates.

Revision ID: 20261026_0003
Revises: 20261026_0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261026_0003"
down_revision: str | None = "20261026_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("work_items", sa.Column("assigned_at", sa.Date(), nullable=False, server_default=sa.func.current_date()))
    op.add_column("work_items", sa.Column("due_date", sa.Date(), nullable=True))
    op.create_index("ix_work_items_assigned_at", "work_items", ["assigned_at"])
    op.create_index("ix_work_items_due_date", "work_items", ["due_date"])


def downgrade() -> None:
    op.drop_index("ix_work_items_due_date", table_name="work_items")
    op.drop_index("ix_work_items_assigned_at", table_name="work_items")
    op.drop_column("work_items", "due_date")
    op.drop_column("work_items", "assigned_at")
