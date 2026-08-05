from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class OperationalSnapshot(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "operational_snapshots"

    company_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    data: Mapped[dict] = mapped_column(JSONB)
