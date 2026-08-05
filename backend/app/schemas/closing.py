from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class ClosingCreate(BaseModel):
    company_id: UUID
    customer_id: UUID
    period_start: date
    period_end: date
    freight_ids: list[UUID]


class ClosingRead(BaseModel):
    id: UUID
    company_id: UUID
    customer_id: UUID
    number: str
    period_start: date
    period_end: date
    status: str
    subtotal: Decimal
    discounts: Decimal
    additions: Decimal
    net_total: Decimal
