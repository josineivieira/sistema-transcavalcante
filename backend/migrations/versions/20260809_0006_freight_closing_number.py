"""add freight closing number

Revision ID: 20260809_0006
Revises: 20260809_0005
"""
from alembic import op

revision = "20260809_0006"
down_revision = "20260809_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE freights ADD COLUMN IF NOT EXISTS closing_number VARCHAR(80)")
    op.execute(
        """
        UPDATE freights
        SET closing_number = payload->>'closing'
        WHERE closing_number IS NULL
          AND payload IS NOT NULL
          AND payload ? 'closing'
          AND COALESCE(payload->>'closing', '') <> ''
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_freights_company_closing_number ON freights (company_id, closing_number)")


def downgrade() -> None:
    op.drop_index("ix_freights_company_closing_number", table_name="freights")
    op.drop_column("freights", "closing_number")
