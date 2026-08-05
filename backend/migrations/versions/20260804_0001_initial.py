"""initial schema"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260804_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trade_name", sa.String(255), nullable=True),
        sa.Column("cnpj", sa.String(18), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("person_type", sa.String(20), nullable=False),
        sa.Column("document", sa.String(18), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trade_name", sa.String(255), nullable=True),
        sa.Column("email_fiscal", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_customers_company_document", "customers", ["company_id", "document"], unique=True)
    op.create_table(
        "freights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("internal_number", sa.String(50), nullable=False),
        sa.Column("process_number", sa.String(100), nullable=True),
        sa.Column("container_number", sa.String(20), nullable=True),
        sa.Column("service_type", sa.String(100), nullable=False),
        sa.Column("execution_date", sa.Date(), nullable=False),
        sa.Column("origin_city", sa.String(120), nullable=False),
        sa.Column("origin_state", sa.String(2), nullable=False),
        sa.Column("destination_city", sa.String(120), nullable=False),
        sa.Column("destination_state", sa.String(2), nullable=False),
        sa.Column("total_value", sa.Numeric(14, 2), nullable=False),
        sa.Column("operational_status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("fiscal_status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("approved_for_billing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_freights_company_internal_number", "freights", ["company_id", "internal_number"], unique=True)
    op.create_table(
        "closings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("number", sa.String(50), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="preparing"),
        sa.Column("subtotal", sa.Numeric(14, 2), nullable=False),
        sa.Column("discounts", sa.Numeric(14, 2), nullable=False),
        sa.Column("additions", sa.Numeric(14, 2), nullable=False),
        sa.Column("net_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_closings_company_number", "closings", ["company_id", "number"], unique=True)
    op.create_table(
        "closing_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("closing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("closings.id"), nullable=False),
        sa.Column("freight_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("freights.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_closing_items_unique", "closing_items", ["closing_id", "freight_id"], unique=True)
    op.create_table(
        "fiscal_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("closing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("closings.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("fiscal_type", sa.String(20), nullable=False),
        sa.Column("environment", sa.String(20), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("number", sa.String(50), nullable=True),
        sa.Column("series", sa.String(10), nullable=True),
        sa.Column("reference", sa.String(120), nullable=True),
        sa.Column("protocol", sa.String(120), nullable=True),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column("raw_response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fiscal_documents_idempotency", "fiscal_documents", ["company_id", "idempotency_key"], unique=True)
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(120), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("before_data", sa.JSON(), nullable=True),
        sa.Column("after_data", sa.JSON(), nullable=True),
        sa.Column("correlation_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_index("ix_fiscal_documents_idempotency", table_name="fiscal_documents")
    op.drop_table("fiscal_documents")
    op.drop_index("ix_closing_items_unique", table_name="closing_items")
    op.drop_table("closing_items")
    op.drop_index("ix_closings_company_number", table_name="closings")
    op.drop_table("closings")
    op.drop_index("ix_freights_company_internal_number", table_name="freights")
    op.drop_table("freights")
    op.drop_index("ix_customers_company_document", table_name="customers")
    op.drop_table("customers")
    op.drop_table("users")
    op.drop_table("companies")
