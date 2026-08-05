from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import enforce_company_access, is_general_admin, require_roles
from app.database.session import get_db
from app.models.closing import Closing
from app.models.fiscal_document import FiscalDocument
from app.models.user import User
from app.schemas.fiscal import FiscalCancelRequest, FiscalIssueRequest
from app.services.fiscal_service import cancel_document, issue_document, validate_document

router = APIRouter()


@router.get("")
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing", "viewer")),
):
    query = db.query(FiscalDocument)
    if not is_general_admin(user):
        query = query.filter(FiscalDocument.company_id == user.company_id)
    return query.order_by(FiscalDocument.created_at.desc()).all()


def _load_closing(db: Session, payload: FiscalIssueRequest) -> Closing:
    closing = db.get(Closing, payload.closing_id)
    if not closing:
        raise HTTPException(status_code=404, detail="Fechamento não encontrado")
    if closing.company_id != payload.company_id or closing.customer_id != payload.customer_id:
        raise HTTPException(status_code=400, detail="Fechamento incompatível com empresa ou cliente")
    if closing.status != "approved":
        raise HTTPException(status_code=400, detail="Fechamento precisa estar aprovado")
    return closing


@router.post("/validate")
def validate_fiscal_document(
    payload: FiscalIssueRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    enforce_company_access(user, payload.company_id)
    closing = _load_closing(db, payload)
    errors = validate_document(payload, closing)
    return {"valid": not errors, "errors": errors}


@router.post("/issue")
def issue_fiscal_document(
    payload: FiscalIssueRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    enforce_company_access(user, payload.company_id)
    closing = _load_closing(db, payload)
    return issue_document(db=db, payload=payload, closing=closing)


@router.get("/{document_id}")
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing", "viewer")),
):
    document = db.get(FiscalDocument, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal não encontrado")
    enforce_company_access(user, document.company_id)
    return document


@router.post("/{document_id}/cancel")
def cancel_fiscal_document(
    document_id: UUID,
    payload: FiscalCancelRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin", "billing")),
):
    document = db.get(FiscalDocument, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal não encontrado")
    enforce_company_access(user, document.company_id)
    return cancel_document(db, document, payload.justification)
