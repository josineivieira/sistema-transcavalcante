"""operational snapshots

Revision ID: 20260805_0003
Revises: 20260805_0002
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260805_0003"
down_revision = "20260805_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operational_snapshots",
        sa.Column("company_key", sa.String(length=80), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_key"),
    )
    op.create_index("ix_operational_snapshots_company_key", "operational_snapshots", ["company_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_operational_snapshots_company_key", table_name="operational_snapshots")
    op.drop_table("operational_snapshots")
