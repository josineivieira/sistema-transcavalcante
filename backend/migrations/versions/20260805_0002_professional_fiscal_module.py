"""professional fiscal module fields

Revision ID: 20260805_0002
Revises: 20260804_0001
"""
from alembic import op
import sqlalchemy as sa

revision = "20260805_0002"
down_revision = "20260804_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fiscal_documents", sa.Column("access_key", sa.String(60), nullable=True))
    op.add_column("fiscal_documents", sa.Column("request_xml", sa.Text(), nullable=True))
    op.add_column("fiscal_documents", sa.Column("authorized_xml", sa.Text(), nullable=True))
    op.add_column("fiscal_documents", sa.Column("pdf_url", sa.String(500), nullable=True))
    op.add_column("fiscal_documents", sa.Column("rejection_code", sa.String(50), nullable=True))
    op.add_column("fiscal_documents", sa.Column("rejection_message", sa.Text(), nullable=True))
    op.add_column("fiscal_documents", sa.Column("cancel_protocol", sa.String(120), nullable=True))
    op.create_index("ix_fiscal_documents_access_key", "fiscal_documents", ["access_key"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_fiscal_documents_access_key", table_name="fiscal_documents")
    op.drop_column("fiscal_documents", "cancel_protocol")
    op.drop_column("fiscal_documents", "rejection_message")
    op.drop_column("fiscal_documents", "rejection_code")
    op.drop_column("fiscal_documents", "pdf_url")
    op.drop_column("fiscal_documents", "authorized_xml")
    op.drop_column("fiscal_documents", "request_xml")
    op.drop_column("fiscal_documents", "access_key")
