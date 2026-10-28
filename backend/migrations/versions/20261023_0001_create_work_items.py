"""Create the initial work item model.

Revision ID: 20261023_0001
Revises:
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261023_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    work_item_type = sa.Enum("CR", "CRS", name="work_item_type")
    op.create_table(
        "work_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=32), nullable=False),
        sa.Column("item_type", work_item_type, nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="Assigned"),
        sa.Column("priority", sa.String(length=32), nullable=False, server_default="Normal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["parent_id"], ["work_items.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_work_items_key", "work_items", ["key"])
    op.create_index("ix_work_items_priority", "work_items", ["priority"])
    op.create_index("ix_work_items_status", "work_items", ["status"])
    op.create_index("ix_work_items_status_updated_at", "work_items", ["status", "updated_at"])
    op.create_index("ix_work_items_type_parent_id", "work_items", ["item_type", "parent_id"])


def downgrade() -> None:
    op.drop_table("work_items")
    sa.Enum(name="work_item_type").drop(op.get_bind())

