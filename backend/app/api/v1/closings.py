from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import enforce_company_access, is_general_admin, require_roles
from app.database.session import get_db
from app.models.closing import Closing, ClosingItem
from app.models.freight import Freight
from app.models.user import User
from app.schemas.closing import ClosingCreate

router = APIRouter()


@router.get("")
def list_closings(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing", "viewer")),
):
    query = db.query(Closing)
    if not is_general_admin(user):
        query = query.filter(Closing.company_id == user.company_id)
    return query.order_by(Closing.created_at.desc()).all()


@router.post("")
def create_closing(
    payload: ClosingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    enforce_company_access(user, payload.company_id)
    freights = db.query(Freight).filter(
        Freight.company_id == payload.company_id,
        Freight.id.in_(payload.freight_ids),
    ).all()
    if not freights:
        raise HTTPException(status_code=400, detail="Nenhum frete selecionado")
    if len(freights) != len(set(payload.freight_ids)):
        raise HTTPException(status_code=400, detail="Existe frete inexistente ou de outra empresa")

    for freight in freights:
        if freight.customer_id != payload.customer_id:
            raise HTTPException(status_code=400, detail="Todos os fretes devem pertencer ao mesmo cliente")
        if not freight.approved_for_billing:
            raise HTTPException(status_code=400, detail="Existe frete sem aprovação para faturamento")
        if freight.total_value <= 0:
            raise HTTPException(status_code=400, detail="Existe frete com valor inválido")

    subtotal = sum(Decimal(f.total_value) for f in freights)
    closing = Closing(
        company_id=payload.company_id,
        customer_id=payload.customer_id,
        number=f"FEC-{db.query(Closing).filter(Closing.company_id == payload.company_id).count() + 1:06d}",
        period_start=payload.period_start,
        period_end=payload.period_end,
        subtotal=subtotal,
        discounts=Decimal("0.00"),
        additions=Decimal("0.00"),
        net_total=subtotal,
    )
    db.add(closing)
    db.flush()

    for freight in freights:
        db.add(ClosingItem(company_id=payload.company_id, closing_id=closing.id, freight_id=freight.id))
        freight.operational_status = "included_in_closing"

    db.commit()
    db.refresh(closing)
    return closing


@router.post("/{closing_id}/approve")
def approve_closing(
    closing_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    closing = db.get(Closing, closing_id)
    if not closing:
        raise HTTPException(status_code=404, detail="Fechamento não encontrado")

    enforce_company_access(user, closing.company_id)
    closing.status = "approved"
    db.commit()
    db.refresh(closing)
    return closing
