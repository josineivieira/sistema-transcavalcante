from uuid import UUID
from pydantic import BaseModel


class CustomerCreate(BaseModel):
    company_id: UUID
    person_type: str
    document: str
    name: str
    trade_name: str | None = None
    email_fiscal: str | None = None


class CustomerRead(CustomerCreate):
    id: UUID
    status: str
