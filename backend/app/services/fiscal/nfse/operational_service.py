from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.v1.operational_data import DEFAULT_COMPANY_KEY, _find_user, _get_or_create_snapshot
from app.core.customer_document import normalize_document
from app.core.config import settings
from app.models.nfse import NfseCertificate, NfseEmission, NfseSequence
from app.models.operational_data import OperationalSnapshot
from app.services.fiscal.certificates.a1 import CertificateError, decrypt_a1
from app.services.fiscal.nfse.national_client import NationalClient, NationalError, endpoint
from app.services.fiscal.nfse.xml_builder import DpsError, build_dps, build_cancel, dps_identifier, sign_xml


class OperationalNfseService:
    def __init__(self, db: Session, email: str, module="fiscalDocuments", edit=False):
        self.db = db
        self.snapshot = _get_or_create_snapshot(db)
        user = _find_user(self.snapshot.data, email)
        permission = (user or {}).get("permissions", {}).get(module, "none")
        if not user or user.get("status") != "Ativo" or (user.get("role") != "Administrador" and permission not in ({"edit"} if edit else {"view", "edit"})):
            raise HTTPException(403, "Sem permissão para esta operação fiscal.")
        self.issuer = deepcopy(self.snapshot.data.get("issuerSettings") or {})
        self.cnpj = normalize_document(str(self.issuer.get("document", "")))

    def certificate(self):
        row = self.db.query(NfseCertificate).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj).first()
        if not row: raise CertificateError("Instale o certificado A1 nas configurações fiscais antes de transmitir.")
        return row

    def client(self):
        return NationalClient(decrypt_a1(self.certificate()), endpoint(self.issuer.get("nfseEndpoint")))

    def note(self, note_id):
        try: key = UUID(str(note_id).removeprefix("nfse:"))
        except ValueError: raise HTTPException(404, "Documento não encontrado.") from None
        row = self.db.query(NfseEmission).filter_by(id=key, company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj).first()
        if not row: raise HTTPException(404, "Documento não encontrado.")
        return row

    def context(self, closing_id, customer_id, competence, description):
        if not settings.enable_nfse: raise DpsError("A emissão de NFS-e está desabilitada no backend.")
        if self.issuer.get("nfseProvider") != "NFS-e Nacional": raise DpsError("Selecione NFS-e Nacional e salve as configurações antes de transmitir.")
        if self.issuer.get("nfseEnvironment") not in {"Homologacao", "Homologação"}: raise DpsError("Este fluxo permite apenas emissão em homologação.")
        closing = next((item for item in self.snapshot.data.get("closings", []) if str(item.get("id")) == closing_id), None)
        if not closing: raise DpsError("Fechamento não encontrado.")
        if closing.get("status") != "Aprovado": raise DpsError("O fechamento deve estar aprovado antes de transmitir.")
        candidates = [item for item in self.snapshot.data.get("customers", []) if item.get("name") == closing.get("customer") and (not customer_id or str(item.get("id")) == customer_id)]
        if len(candidates) != 1: raise DpsError("Selecione um tomador único e compatível com o fechamento.")
        amount = Decimal(str(closing.get("subtotal", closing.get("netTotal", "0"))))
        if not competence: raise DpsError("Informe a data de competência do serviço.")
        series = str(self.issuer.get("nfseSeries") or "1")
        if not series.isdigit() or not 0 <= int(series) <= 89999: raise DpsError("Série DPS deve ser numérica, de 0 até 89999.")
        return closing, candidates[0], amount, series, str(description).strip()

    def substitution(self, payload):
        if not payload.substitute_note_id: return None
        original = self.note(payload.substitute_note_id)
        if original.status != "authorized" or not original.access_key: raise DpsError("A nota a substituir deve estar autorizada neste emissor e ambiente.")
        if original.closing_id == payload.closing_id: raise DpsError("Use outro fechamento aprovado para a substituição, preservando o histórico do original.")
        if payload.substitution_code not in {"01", "02", "03", "04", "05", "99"} or not 15 <= len(payload.substitution_reason.strip()) <= 255: raise DpsError("Informe o motivo e uma justificativa de substituição entre 15 e 255 caracteres.")
        pending = self.db.query(NfseEmission).filter(NfseEmission.substituted_access_key == original.access_key, NfseEmission.status.in_(["authorized", "unknown", "processing"]), NfseEmission.closing_id != payload.closing_id).first()
        if pending: raise DpsError("Já existe uma substituição em andamento ou autorizada para essa nota. Consulte-a primeiro.")
        return {"key": original.access_key, "code": payload.substitution_code, "reason": payload.substitution_reason.strip()}

    def preflight(self, payload):
        closing, customer, amount, series, description = self.context(payload.closing_id, payload.customer_id, payload.competence.isoformat(), payload.description)
        credentials = decrypt_a1(self.certificate())
        endpoint(self.issuer.get("nfseEndpoint"))
        root = build_dps(self.issuer, customer, amount, description, series, 1, payload.competence.isoformat(), substitution=self.substitution(payload))
        sign_xml(root, credentials[0], credentials[1])
        return {"valid": True, "environment": "homologation", "provider": "nfse_nacional", "message": "Certificado e XML validados localmente. A autorização depende da resposta oficial."}

    def reserve(self, payload):
        # The snapshot row is the shared lock for first-sequence creation and numbering.
        self.snapshot = self.db.query(OperationalSnapshot).filter_by(id=self.snapshot.id).with_for_update().one()
        self.db.refresh(self.snapshot)
        self.issuer = deepcopy(self.snapshot.data.get("issuerSettings") or {})
        if normalize_document(str(self.issuer.get("document", ""))) != self.cnpj: raise DpsError("As configurações do emissor mudaram. Recarregue a tela.")
        existing = self.db.query(NfseEmission).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj, closing_id=payload.closing_id, environment="homologation").with_for_update().first()
        if existing and existing.status in {"authorized", "cancelled", "substituted", "unknown", "processing", "cancelling"}:
            self.db.commit(); return existing, False
        closing, customer, amount, series, description = self.context(payload.closing_id, payload.customer_id, payload.competence.isoformat(), payload.description)
        credentials = decrypt_a1(self.certificate())
        endpoint(self.issuer.get("nfseEndpoint"))
        if existing:
            number, series = existing.dps_number, existing.series
            note = existing
        else:
            raw_initial = str(self.issuer.get("nextDpsNumber") or "1")
            if not raw_initial.isdigit() or not 1 <= int(raw_initial) < 10**15: raise DpsError("A próxima DPS deve ter entre 1 e 15 dígitos e ser maior que zero.")
            sequence = self.db.query(NfseSequence).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj, environment="homologation", series=series).with_for_update().first()
            if not sequence:
                sequence = NfseSequence(company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj, environment="homologation", series=series, next_number=int(raw_initial)); self.db.add(sequence)
            number = max(sequence.next_number, int(raw_initial))
            if number >= 10**15: raise DpsError("Numeração DPS esgotada para esta série.")
            sequence.next_number = number + 1
            note = NfseEmission(company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj, closing_id=payload.closing_id, closing_number=str(closing["number"]), customer_name=customer["name"], environment="homologation", series=series, dps_number=number, dps_id=dps_identifier(self.issuer, series, number), amount=str(amount))
            self.db.add(note)
        substitution = self.substitution(payload)
        note.substituted_access_key = substitution["key"] if substitution else None
        root = build_dps(self.issuer, customer, amount, description, series, number, payload.competence.isoformat(), substitution=substitution)
        note.request_xml = sign_xml(root, credentials[0], credentials[1]); note.description = description; note.amount = str(amount)
        note.status = "processing"; note.response = {}; note.attempts = (note.attempts or 0) + 1
        self.db.commit(); self.db.refresh(note)
        return note, True

    def save_result(self, note, result):
        note.status = result.status; note.number = result.number; note.access_key = result.access_key; note.protocol = result.protocol
        note.authorized_xml = result.authorized_xml; note.response = result.raw_response
        if note.substituted_access_key:
            original = self.db.query(NfseEmission).filter_by(company_key=DEFAULT_COMPANY_KEY, issuer_document=self.cnpj, access_key=note.substituted_access_key).filter(NfseEmission.id != note.id).first()
            if original: original.status = "substituted"
        # Homologation must not turn a real operational closing into a production-issued invoice.
        snapshot = self.db.query(OperationalSnapshot).filter_by(id=self.snapshot.id).with_for_update().one()
        self.db.refresh(snapshot)
        data = deepcopy(snapshot.data)
        for closing in data.get("closings", []):
            if str(closing.get("id")) == note.closing_id:
                closing["nfseHomologationStatus"] = "Autorizado" if note.status == "authorized" else note.status
                closing["nfseHomologationId"] = str(note.id)
        snapshot.data = data
        self.db.commit(); self.db.refresh(note)

    def issue(self, payload):
        note, transmit = self.reserve(payload)
        if not transmit: return note
        try: self.save_result(note, self.client().issue_signed(note.request_xml, note.dps_id))
        except NationalError as exc:
            note.status = "unknown" if exc.uncertain else "rejected"
            note.response = {"message": str(exc), **exc.details}; self.db.commit(); self.db.refresh(note)
        except CertificateError:
            note.status = "rejected"; note.response = {"message": "Certificado indisponível. Confira as configurações e tente novamente."}; self.db.commit()
        return note

    def consult(self, note):
        if note.status in {"cancelled", "substituted"}: return note
        if note.status in {"processing", "cancelling"}:
            updated = note.updated_at.replace(tzinfo=timezone.utc) if note.updated_at.tzinfo is None else note.updated_at
            if (datetime.now(timezone.utc) - updated).total_seconds() < 90: return note
        client = self.client()
        try:
            result = client.consult(note.access_key, note.dps_id) if note.access_key else client.consult_dps(note.dps_id)
            if result:
                self.save_result(note, result)
                if note.access_key:
                    try:
                        events = client.events(note.access_key)
                        if client.has_cancel_event(events, note.access_key):
                            note.status = "cancelled"; note.events = [*note.events, {"type": "consult", "response": events}]; self.db.commit()
                    except NationalError: pass
            elif note.status in {"unknown", "processing"}:
                # The same DPS identifier is reused on the next explicit attempt.
                updated = note.updated_at.replace(tzinfo=timezone.utc) if note.updated_at.tzinfo is None else note.updated_at
                if (datetime.now(timezone.utc) - updated).total_seconds() < 90: return note
                note.status = "not_found"; note.response = {"message": "DPS não localizada. Uma nova tentativa usará a mesma série e número."}; self.db.commit()
        except NationalError as exc:
            note.response = {**(note.response or {}), "consultationMessage": str(exc)}; self.db.commit()
        self.db.refresh(note); return note

    def cancel(self, note, reason, code):
        note = self.db.query(NfseEmission).filter_by(id=note.id).with_for_update().one()
        self.db.refresh(note)
        if note.status != "authorized" or not note.access_key: raise DpsError("Somente uma NFS-e autorizada pode ser cancelada.")
        credentials = decrypt_a1(self.certificate())
        signed = sign_xml(build_cancel(self.cnpj, note.access_key, reason, code), credentials[0], credentials[1])
        note.status = "cancelling"; self.db.commit()
        try:
            response = NationalClient(credentials, self.issuer.get("nfseEndpoint")).cancel_signed(note.access_key, signed)
            note.status = "cancelled"; note.events = [*(note.events or []), {"type": "cancel", "requestXml": signed, "response": response}]
        except NationalError as exc:
            note.status = "cancelling" if exc.uncertain else "authorized"
            note.response = {**(note.response or {}), "cancellationMessage": str(exc)}
        self.db.commit(); self.db.refresh(note); return note


def public_note(note):
    labels = {"prepared": "Preparado", "processing": "Em processamento", "authorized": "Autorizado", "rejected": "Rejeitado", "unknown": "Aguardando consulta", "not_found": "DPS não localizada", "cancelled": "Cancelado", "substituted": "Substituído", "cancelling": "Cancelamento em consulta"}
    details = note.response or {}
    return {"id": "nfse:" + str(note.id), "type": "NFS-e", "source": "national", "number": note.number or ("DPS " + str(note.dps_number)), "dpsNumber": str(note.dps_number), "dpsId": note.dps_id, "series": note.series, "customer": note.customer_name, "date": note.created_at.date().isoformat(), "value": float(note.amount), "environment": "Homologacao", "status": labels.get(note.status, note.status), "statusCode": note.status, "protocol": note.protocol or "", "accessKey": note.access_key or "", "closing": note.closing_number, "description": note.description, "message": details.get("cancellationMessage") or details.get("consultationMessage") or details.get("message") or "", "hasXml": bool(note.authorized_xml), "attempts": note.attempts}
