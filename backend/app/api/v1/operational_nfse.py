from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.operational_data import DEFAULT_COMPANY_KEY, _require_operational_auth
from app.database.session import get_db
from app.models.nfse import NfseCertificate, NfseEmission
from app.services.fiscal.certificates.a1 import CertificateError, cipher, decrypt_a1, load_a1, metadata
from app.services.fiscal.nfse.national_client import DEFAULT_BASE, NationalError, endpoint
from app.services.fiscal.nfse.operational_service import OperationalNfseService, public_note
from app.services.fiscal.nfse.xml_builder import DpsError

router = APIRouter()


class IssueRequest(BaseModel):
    closing_id: str = Field(min_length=1, max_length=120)
    customer_id: str = Field(min_length=1, max_length=120)
    competence: date
    substitute_note_id: str | None = None
    substitution_code: str = "99"
    substitution_reason: str = Field(default="", max_length=255)
    description: str = Field(min_length=1, max_length=2000)


class CancelRequest(BaseModel):
    justification: str = Field(min_length=15, max_length=255)
    reason_code: str = "1"


def translate_error(error):
    raise HTTPException(422, str(error)) from None


@router.get("/readiness")
def readiness(email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email)
    errors = []
    certificate = None
    try:
        cipher()
        record = service.certificate()
        _, cert, _ = decrypt_a1(record)
        certificate = metadata(cert)
    except CertificateError as exc: errors.append(str(exc))
    try: base = endpoint(service.issuer.get("nfseEndpoint"))
    except NationalError as exc: errors.append(str(exc)); base = DEFAULT_BASE
    if service.issuer.get("nfseProvider") != "NFS-e Nacional": errors.append("Selecione NFS-e Nacional nas configurações.")
    if service.issuer.get("nfseEnvironment") not in {"Homologacao", "Homologação"}: errors.append("Selecione o ambiente de homologação.")
    if service.issuer.get("nfseDataConfirmed") != "Sim": errors.append("Confira e confirme os dados fiscais nas configurações.")
    return {"ready": not errors, "errors": errors, "certificate": certificate, "provider": "nfse_nacional", "environment": "homologation", "endpoint": base, "schema": "1.01 / pacote oficial 20261020"}


@router.get("/certificate")
def certificate_info(email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, module="settings")
    row = db.query(NfseCertificate).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=service.cnpj).first()
    return {"installed": bool(row), "details": row.details if row else None}


@router.post("/certificate")
async def install_certificate(file: UploadFile = File(...), password: str = Form(...), email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, module="settings", edit=True)
    raw = await file.read(2 * 1024 * 1024 + 1)
    await file.close()
    if not raw or len(raw) > 2 * 1024 * 1024: raise HTTPException(422, "O certificado deve ter no máximo 2 MB.")
    try:
        f = cipher()
        _, cert, _ = load_a1(raw, password, service.cnpj)
        details = {**metadata(cert), "filename": str(file.filename or "certificado.pfx")[:128]}
        row = db.query(NfseCertificate).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=service.cnpj).first()
        if not row:
            row = NfseCertificate(company_key=DEFAULT_COMPANY_KEY, issuer_document=service.cnpj); db.add(row)
        row.encrypted_pfx = f.encrypt(raw); row.encrypted_password = f.encrypt(password.encode()); row.details = details
        db.commit()
        return {"installed": True, "details": details}
    except CertificateError as exc: translate_error(exc)


@router.delete("/certificate", status_code=204)
def remove_certificate(email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, module="settings", edit=True)
    db.query(NfseCertificate).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=service.cnpj).delete()
    db.commit()
    return Response(status_code=204)


@router.post("/connection-test")
def test_connection(email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, module="settings", edit=True)
    try:
        params = service.client().municipal_parameters(str(service.issuer.get("cityCode", "")))
        return {"connected": True, "environment": "homologation", "municipality": service.issuer.get("cityCode"), "parameters": params}
    except (CertificateError, NationalError) as exc: translate_error(exc)


@router.post("/validate")
def validate(payload: IssueRequest, email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, edit=True)
    try: return service.preflight(payload)
    except (CertificateError, DpsError, NationalError) as exc: translate_error(exc)


@router.post("/issue")
def issue(payload: IssueRequest, email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, edit=True)
    try: return {"document": public_note(service.issue(payload))}
    except (CertificateError, DpsError, NationalError) as exc:
        db.rollback(); translate_error(exc)


@router.get("")
def list_notes(email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email)
    rows = db.query(NfseEmission).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=service.cnpj).order_by(NfseEmission.created_at.desc()).all()
    return {"items": [public_note(item) for item in rows]}


@router.post("/{note_id}/consult")
def consult(note_id: str, email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, edit=True)
    try: return {"document": public_note(service.consult(service.note(note_id)))}
    except (CertificateError, DpsError, NationalError) as exc: translate_error(exc)


@router.post("/{note_id}/cancel")
def cancel(note_id: str, payload: CancelRequest, email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email, edit=True)
    try: return {"document": public_note(service.cancel(service.note(note_id), payload.justification, payload.reason_code))}
    except (CertificateError, DpsError, NationalError) as exc: translate_error(exc)


@router.get("/{note_id}/xml")
def download_xml(note_id: str, request: bool = False, email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email)
    note = service.note(note_id)
    xml = note.request_xml if request else note.authorized_xml
    if not xml: raise HTTPException(404, "XML ainda não disponível.")
    return Response(xml, media_type="application/xml", headers={"Content-Disposition": f'attachment; filename="nfse-{note.id}-{"dps" if request else "autorizada"}.xml"', "Cache-Control": "no-store"})


@router.get("/{note_id}/pdf")
def download_pdf(note_id: str, email: str = Depends(_require_operational_auth), db: Session = Depends(get_db)):
    service = OperationalNfseService(db, email)
    note = service.note(note_id)
    if not note.access_key or note.status not in {"authorized", "cancelled", "substituted"}: raise HTTPException(409, "A nota precisa estar autorizada para consultar o DANFSe.")
    try:
        if not note.pdf:
            note.pdf = service.client().danfse(note.access_key); db.commit()
        return Response(bytes(note.pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="danfse-{note.id}.pdf"', "Cache-Control": "no-store"})
    except (CertificateError, NationalError) as exc: translate_error(exc)
