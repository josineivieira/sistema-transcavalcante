import uuid
from decimal import Decimal
from sqlalchemy import ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class FiscalDocument(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fiscal_documents"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    closing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("closings.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    fiscal_type: Mapped[str] = mapped_column(String(20))
    environment: Mapped[str] = mapped_column(String(20))
    provider: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="draft")
    number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    series: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    protocol: Mapped[str | None] = mapped_column(String(120), nullable=True)
    access_key: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    request_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
    authorized_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rejection_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rejection_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_protocol: Mapped[str | None] = mapped_column(String(120), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
