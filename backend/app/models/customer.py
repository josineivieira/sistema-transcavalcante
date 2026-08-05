import uuid
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Customer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "customers"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    person_type: Mapped[str] = mapped_column(String(20))
    document: Mapped[str] = mapped_column(String(18))
    name: Mapped[str] = mapped_column(String(255))
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_fiscal: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
