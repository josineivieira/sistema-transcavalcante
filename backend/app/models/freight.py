import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Freight(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "freights"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    internal_number: Mapped[str] = mapped_column(String(50))
    process_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    container_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    service_type: Mapped[str] = mapped_column(String(100))
    execution_date: Mapped[date] = mapped_column(Date)
    origin_city: Mapped[str] = mapped_column(String(120))
    origin_state: Mapped[str] = mapped_column(String(2))
    destination_city: Mapped[str] = mapped_column(String(120))
    destination_state: Mapped[str] = mapped_column(String(2))
    total_value: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    operational_status: Mapped[str] = mapped_column(String(30), default="draft")
    fiscal_status: Mapped[str] = mapped_column(String(30), default="pending")
    approved_for_billing: Mapped[bool] = mapped_column(Boolean, default=False)
