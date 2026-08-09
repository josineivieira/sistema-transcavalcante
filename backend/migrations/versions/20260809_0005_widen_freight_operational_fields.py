"""widen freight operational fields

Revision ID: 20260809_0005
Revises: 20260807_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20260809_0005"
down_revision = "20260807_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("freights", "operational_status", type_=sa.String(255), existing_type=sa.String(80))
    op.alter_column("freights", "container_number", type_=sa.String(120), existing_type=sa.String(20))


def downgrade() -> None:
    op.alter_column("freights", "container_number", type_=sa.String(20), existing_type=sa.String(120))
    op.alter_column("freights", "operational_status", type_=sa.String(80), existing_type=sa.String(255))
