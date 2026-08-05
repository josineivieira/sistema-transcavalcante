from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import enforce_company_access, is_general_admin, require_roles
from app.database.session import get_db
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate

router = APIRouter()


@router.get("")
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing", "operations", "viewer")),
):
    query = db.query(Customer)
    if not is_general_admin(user):
        query = query.filter(Customer.company_id == user.company_id)
    return query.order_by(Customer.name.asc()).all()


@router.post("")
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    enforce_company_access(user, payload.company_id)
    exists = db.query(Customer).filter(Customer.company_id == payload.company_id, Customer.document == payload.document).first()
    if exists:
        raise HTTPException(status_code=400, detail="Cliente já cadastrado para a empresa")

    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer
