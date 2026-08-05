from uuid import UUID
from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    trade_name: str | None = None
    cnpj: str
    email: str | None = None
    phone: str | None = None


class CompanyRead(CompanyCreate):
    id: UUID
