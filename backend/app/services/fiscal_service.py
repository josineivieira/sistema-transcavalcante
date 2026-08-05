from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.closing import Closing
from app.models.fiscal_document import FiscalDocument
from app.schemas.fiscal import FiscalIssueRequest
from app.services.fiscal.common.exceptions import FiscalIntegrationError
from app.services.fiscal.contracts import FiscalEmissionInput
from app.services.fiscal.factory import get_provider


def build_idempotency_key(payload: FiscalIssueRequest) -> str:
    return f"{payload.company_id}:{payload.fiscal_type}:{payload.closing_id}:{settings.fiscal_environment}:v2"


def get_existing_document(db: Session, payload: FiscalIssueRequest) -> FiscalDocument | None:
    return db.query(FiscalDocument).filter(
        FiscalDocument.company_id == payload.company_id,
        FiscalDocument.idempotency_key == build_idempotency_key(payload),
    ).first()


def _emission_input(payload: FiscalIssueRequest, closing: Closing) -> FiscalEmissionInput:
    return FiscalEmissionInput(
        fiscal_type=payload.fiscal_type,
        company_id=str(payload.company_id),
        closing_id=str(payload.closing_id),
        customer_id=str(payload.customer_id),
        amount=Decimal(closing.net_total),
        idempotency_key=build_idempotency_key(payload),
        payload=payload.fiscal_data or {},
    )


def validate_document(payload: FiscalIssueRequest, closing: Closing) -> list[str]:
    if payload.fiscal_type == "nfse" and not settings.enable_nfse:
        return ["Emissão de NFS-e está desabilitada"]
    if payload.fiscal_type == "cte" and not settings.enable_cte:
        return ["Emissão de CT-e está desabilitada"]
    provider = get_provider(payload.fiscal_type)
    return provider.validate(_emission_input(payload, closing))


def issue_document(db: Session, payload: FiscalIssueRequest, closing: Closing) -> FiscalDocument:
    if settings.fiscal_environment == "production" and settings.fiscal_default_provider == "mock" and not settings.allow_mock_in_production:
        raise HTTPException(status_code=400, detail="Provider mock não pode emitir em produção")

    existing = get_existing_document(db, payload)
    if existing:
        return existing

    provider = get_provider(payload.fiscal_type)
    emission_input = _emission_input(payload, closing)
    errors = provider.validate(emission_input)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Dados fiscais incompletos", "errors": errors})

    document = FiscalDocument(
        company_id=payload.company_id,
        closing_id=payload.closing_id,
        customer_id=payload.customer_id,
        fiscal_type=payload.fiscal_type,
        environment=settings.fiscal_environment,
        provider=provider.name,
        status="processing",
        idempotency_key=emission_input.idempotency_key,
        amount=Decimal(closing.net_total),
        raw_payload=emission_input.payload,
    )
    db.add(document)
    closing.status = "processing_issue"
    db.flush()

    try:
        result = provider.issue(emission_input)
        document.status = result.status
        document.number = result.number
        document.series = result.series
        document.access_key = result.access_key
        document.reference = result.reference
        document.protocol = result.protocol
        document.request_xml = result.request_xml
        document.authorized_xml = result.authorized_xml
        document.pdf_url = result.pdf_url
        document.rejection_code = result.rejection_code
        document.rejection_message = result.rejection_message
        document.raw_response = result.raw_response
        closing.status = "issued" if result.status == "authorized" else "processing_issue"
    except FiscalIntegrationError as exc:
        document.status = "integration_error"
        document.rejection_message = str(exc)
        document.raw_response = {"error": str(exc), "provider": provider.name}
        closing.status = "approved"

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = get_existing_document(db, payload)
        if existing:
            return existing
        raise

    db.refresh(document)
    return document


def cancel_document(db: Session, document: FiscalDocument, justification: str) -> FiscalDocument:
    if document.status != "authorized":
        raise HTTPException(status_code=400, detail="Somente documento autorizado pode ser cancelado")
    if not document.access_key:
        raise HTTPException(status_code=400, detail="Documento não possui chave de acesso")
    provider = get_provider(document.fiscal_type)
    try:
        result = provider.cancel(document.access_key, justification)
    except FiscalIntegrationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    document.status = result.status
    document.cancel_protocol = result.protocol
    document.raw_response = {**(document.raw_response or {}), "cancellation": result.raw_response}
    db.commit()
    db.refresh(document)
    return document


# Compatibilidade temporária com imports antigos.
issue_mock_document = issue_document
