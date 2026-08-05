from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import enforce_company_access, is_general_admin, require_roles
from app.database.session import get_db
from app.models.freight import Freight
from app.models.user import User
from app.schemas.freight import FreightCreate

router = APIRouter()


@router.get("")
def list_freights(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing", "operations", "viewer")),
):
    query = db.query(Freight)
    if not is_general_admin(user):
        query = query.filter(Freight.company_id == user.company_id)
    return query.order_by(Freight.execution_date.desc(), Freight.internal_number.desc()).all()


@router.post("")
def create_freight(
    payload: FreightCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "operations")),
):
    enforce_company_access(user, payload.company_id)
    if payload.total_value <= 0:
        raise HTTPException(status_code=400, detail="Valor do frete deve ser maior que zero")

    freight = Freight(**payload.model_dump())
    db.add(freight)
    db.commit()
    db.refresh(freight)
    return freight


@router.post("/{freight_id}/approve")
def approve_freight(
    freight_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    freight = db.get(Freight, freight_id)
    if not freight:
        raise HTTPException(status_code=404, detail="Frete não encontrado")

    enforce_company_access(user, freight.company_id)
    freight.approved_for_billing = True
    freight.operational_status = "approved_for_billing"
    db.commit()
    db.refresh(freight)
    return freight
