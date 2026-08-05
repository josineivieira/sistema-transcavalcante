from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class FreightCreate(BaseModel):
    company_id: UUID
    customer_id: UUID
    internal_number: str
    process_number: str | None = None
    container_number: str | None = None
    service_type: str
    execution_date: date
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str
    total_value: Decimal


class FreightRead(FreightCreate):
    id: UUID
    operational_status: str
    fiscal_status: str
    approved_for_billing: bool
