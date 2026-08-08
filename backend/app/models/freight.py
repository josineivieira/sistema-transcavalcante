import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Boolean, Date, ForeignKey, Integer, JSON, Numeric, String
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
    operational_status: Mapped[str] = mapped_column(String(80), default="draft")
    fiscal_status: Mapped[str] = mapped_column(String(30), default="pending")
    approved_for_billing: Mapped[bool] = mapped_column(Boolean, default=False)
    external_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sender_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sender_document: Mapped[str | None] = mapped_column(String(30), nullable=True)
    recipient_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recipient_document: Mapped[str | None] = mapped_column(String(30), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tractor_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    trailer_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class FreightTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "freight_tasks"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    freight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("freights.id"))
    external_id: Mapped[str] = mapped_column(String(120))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(50), default="ENCERRADO")
    send_to_customer: Mapped[str] = mapped_column(String(5), default="N")
    start_date: Mapped[str] = mapped_column(String(50), default="")
    end_date: Mapped[str] = mapped_column(String(50), default="")
    completion_percent: Mapped[int] = mapped_column(Integer, default=0)
    internal_use: Mapped[str] = mapped_column(String(5), default="N")
    time_label: Mapped[str] = mapped_column(String(50), default="")
    user_name: Mapped[str] = mapped_column(String(255), default="")
