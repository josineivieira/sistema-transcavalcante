from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class FiscalIssueRequest(BaseModel):
    fiscal_type: str
    company_id: UUID
    closing_id: UUID
    customer_id: UUID
    fiscal_data: dict = Field(default_factory=dict)

    @field_validator("fiscal_type")
    @classmethod
    def validate_fiscal_type(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in {"nfse", "cte"}:
            raise ValueError("Tipo fiscal deve ser nfse ou cte")
        return normalized


class FiscalDocumentRead(BaseModel):
    id: UUID
    fiscal_type: str
    environment: str
    provider: str
    status: str
    number: str | None = None
    series: str | None = None
    reference: str | None = None
    protocol: str | None = None
    access_key: str | None = None
    pdf_url: str | None = None
    rejection_code: str | None = None
    rejection_message: str | None = None


class FiscalCancelRequest(BaseModel):
    justification: str = Field(min_length=15, max_length=255)
