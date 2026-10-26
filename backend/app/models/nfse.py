from sqlalchemy import BigInteger, Integer, JSON, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class NfseCertificate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "nfse_certificates"
    company_key: Mapped[str] = mapped_column(String(80))
    issuer_document: Mapped[str] = mapped_column(String(14))
    encrypted_pfx: Mapped[bytes] = mapped_column(LargeBinary)
    encrypted_password: Mapped[bytes] = mapped_column(LargeBinary)
    details: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("company_key", "issuer_document"),)


class NfseSequence(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "nfse_sequences"
    company_key: Mapped[str] = mapped_column(String(80))
    issuer_document: Mapped[str] = mapped_column(String(14))
    environment: Mapped[str] = mapped_column(String(20), default="homologation")
    series: Mapped[str] = mapped_column(String(5))
    next_number: Mapped[int] = mapped_column(BigInteger, default=1)
    __table_args__ = (UniqueConstraint("company_key", "issuer_document", "environment", "series"),)


class NfseEmission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "nfse_emissions"
    company_key: Mapped[str] = mapped_column(String(80))
    issuer_document: Mapped[str] = mapped_column(String(14))
    closing_id: Mapped[str] = mapped_column(String(120))
    closing_number: Mapped[str] = mapped_column(String(120))
    customer_name: Mapped[str] = mapped_column(String(255))
    environment: Mapped[str] = mapped_column(String(20), default="homologation")
    status: Mapped[str] = mapped_column(String(30), default="prepared")
    series: Mapped[str] = mapped_column(String(5))
    dps_number: Mapped[int] = mapped_column(BigInteger)
    dps_id: Mapped[str] = mapped_column(String(45), unique=True)
    amount: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text, default="")
    substituted_access_key: Mapped[str | None] = mapped_column(String(50))
    request_xml: Mapped[str | None] = mapped_column(Text)
    authorized_xml: Mapped[str | None] = mapped_column(Text)
    access_key: Mapped[str | None] = mapped_column(String(50), index=True)
    number: Mapped[str | None] = mapped_column(String(30))
    protocol: Mapped[str | None] = mapped_column(String(120))
    response: Mapped[dict] = mapped_column(JSON, default=dict)
    events: Mapped[list] = mapped_column(JSON, default=list)
    pdf: Mapped[bytes | None] = mapped_column(LargeBinary)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (UniqueConstraint("company_key", "issuer_document", "closing_id", "environment"),)
