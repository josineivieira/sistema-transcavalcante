import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Closing(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "closings"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    number: Mapped[str] = mapped_column(String(50))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="preparing")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    discounts: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    additions: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    net_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)


class ClosingItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "closing_items"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    closing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("closings.id"))
    freight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("freights.id"))
