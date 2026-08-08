"""freight operational persistence"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260807_0004"
down_revision = "20260805_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("freights", "operational_status", type_=sa.String(80), existing_type=sa.String(30))
    op.add_column("freights", sa.Column("external_id", sa.String(120), nullable=True))
    op.add_column("freights", sa.Column("customer_name", sa.String(255), nullable=True))
    op.add_column("freights", sa.Column("sender_name", sa.String(255), nullable=True))
    op.add_column("freights", sa.Column("sender_document", sa.String(30), nullable=True))
    op.add_column("freights", sa.Column("recipient_name", sa.String(255), nullable=True))
    op.add_column("freights", sa.Column("recipient_document", sa.String(30), nullable=True))
    op.add_column("freights", sa.Column("driver_name", sa.String(255), nullable=True))
    op.add_column("freights", sa.Column("tractor_plate", sa.String(20), nullable=True))
    op.add_column("freights", sa.Column("trailer_plate", sa.String(20), nullable=True))
    op.add_column("freights", sa.Column("payload", sa.JSON(), nullable=True))
    op.create_index("ix_freights_company_external_id", "freights", ["company_id", "external_id"], unique=True)

    op.create_table(
        "freight_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("freight_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("freights.id"), nullable=False),
        sa.Column("external_id", sa.String(120), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(50), nullable=False, server_default="ENCERRADO"),
        sa.Column("send_to_customer", sa.String(5), nullable=False, server_default="N"),
        sa.Column("start_date", sa.String(50), nullable=False, server_default=""),
        sa.Column("end_date", sa.String(50), nullable=False, server_default=""),
        sa.Column("completion_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("internal_use", sa.String(5), nullable=False, server_default="N"),
        sa.Column("time_label", sa.String(50), nullable=False, server_default=""),
        sa.Column("user_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_freight_tasks_freight_external", "freight_tasks", ["freight_id", "external_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_freight_tasks_freight_external", table_name="freight_tasks")
    op.drop_table("freight_tasks")
    op.drop_index("ix_freights_company_external_id", table_name="freights")
    op.drop_column("freights", "payload")
    op.drop_column("freights", "trailer_plate")
    op.drop_column("freights", "tractor_plate")
    op.drop_column("freights", "driver_name")
    op.drop_column("freights", "recipient_document")
    op.drop_column("freights", "recipient_name")
    op.drop_column("freights", "sender_document")
    op.drop_column("freights", "sender_name")
    op.drop_column("freights", "customer_name")
    op.drop_column("freights", "external_id")
    op.alter_column("freights", "operational_status", type_=sa.String(30), existing_type=sa.String(80))
