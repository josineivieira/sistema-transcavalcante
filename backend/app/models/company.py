from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Company(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255))
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
