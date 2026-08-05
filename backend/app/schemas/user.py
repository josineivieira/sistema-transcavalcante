from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    company_id: UUID | None = None
    email: EmailStr
    full_name: str
    password: str
    role: str = "company_admin"


class UserRead(BaseModel):
    id: UUID
    company_id: UUID | None = None
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
