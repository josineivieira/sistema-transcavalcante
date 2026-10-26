import base64
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json

import httpx
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID, ObjectIdentifier
from fastapi.testclient import TestClient
from lxml import etree
from signxml import XMLVerifier, SignatureConfiguration, SignatureMethod, DigestAlgorithm
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.v1.operational_data import _require_operational_auth, DEFAULT_COMPANY_KEY
from app.core.config import settings
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.operational_data import OperationalSnapshot
from app.models.nfse import NfseCertificate, NfseEmission, NfseSequence
from app.services.fiscal.certificates.a1 import CertificateError, cipher, load_a1
from app.services.fiscal.nfse import operational_service
from app.services.fiscal.nfse.national_client import NationalClient, NationalError, encode_xml, parse_authorized, decode_xml, endpoint
from app.services.fiscal.nfse.xml_builder import NS, NationalSigner, build_dps, build_cancel, node, sign_xml, validate_xml

CNPJ = "11222333000181"
KEY = "13026032" + "2" + CNPJ + "0" * 27

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw): return "JSON"


@pytest.fixture
def a1():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "CERTIFICADO DE TESTE")])
    now = datetime.now(timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(days=1)).not_valid_after(now + timedelta(days=30))
        .add_extension(x509.SubjectAlternativeName([x509.OtherName(ObjectIdentifier("2.16.76.1.3.3"), b"\x0c\x0e" + CNPJ.encode())]), critical=False)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CLIENT_AUTH]), critical=False)
        .add_extension(x509.KeyUsage(True, True, True, False, False, False, False, None, None), critical=True).sign(key, hashes.SHA256()))
    raw = pkcs12.serialize_key_and_certificates(b"teste", key, cert, None, serialization.BestAvailableEncryption(b"test-password"))
    return key, cert, raw


@pytest.fixture
def issuer():
    return {"document": CNPJ, "legalName": "EMISSOR TESTE", "cityCode": "1302603", "nfseDataConfirmed": "Sim", "nfseProvider": "NFS-e Nacional", "nfseEnvironment": "Homologacao", "nationalServiceCode": "160201", "municipalServiceCode": "100", "nfseSeries": "1", "nextDpsNumber": "1", "simplesNacional": "Sim"}


@pytest.fixture
def customer():
    return {"id": "customer-1", "name": "TOMADOR TESTE", "document": "52998224725", "cityCode": "1302603", "zipCode": "69000000", "street": "RUA DE TESTE", "number": "1", "district": "CENTRO"}


def authorized_response(dps_xml, a1):
    key, cert, _ = a1
    root = etree.Element(f"{{{NS}}}NFSe", nsmap={None: NS}, versao="1.01")
    info = node(root, "infNFSe"); info.set("Id", "NFS" + KEY)
    for label, value in [("xLocEmi", "MANAUS"), ("xLocPrestacao", "MANAUS"), ("nNFSe", "123"), ("xTribNac", "SERVICO TESTE"), ("verAplic", "TESTE_1"), ("ambGer", "2"), ("tpEmis", "1"), ("cStat", "100"), ("dhProc", "2026-10-25T10:00:00-04:00"), ("nDFSe", "1")]: node(info, label, value)
    emit = node(info, "emit"); node(emit, "CNPJ", CNPJ); node(emit, "xNome", "EMISSOR TESTE")
    end = node(emit, "enderNac")
    for label, value in [("xLgr", "RUA"), ("nro", "1"), ("xBairro", "CENTRO"), ("cMun", "1302603"), ("UF", "AM"), ("CEP", "69000000")]: node(end, label, value)
    values = node(info, "valores"); node(values, "vLiq", "100.00")
    info.append(etree.fromstring(dps_xml.encode()))
    signer = NationalSigner(signature_algorithm="rsa-sha1", digest_algorithm="sha1", c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315")
    signed = signer.sign(root, key=key, cert=cert.public_bytes(serialization.Encoding.PEM), reference_uri="#NFS" + KEY, id_attribute="Id")
    validate_xml(signed, "NFSe_v1.01.xsd")
    return {"chaveAcesso": KEY, "nfseXmlGZipB64": encode_xml(etree.tostring(signed).decode())}


def cancellation_response(signed_request, a1):
    key, cert, _ = a1
    root = etree.Element(f"{{{NS}}}evento", nsmap={None: NS}, versao="1.01")
    info = node(root, "infEvento"); info.set("Id", "EVT" + KEY + "101101001")
    for label, value in [("verAplic", "TESTE_1"), ("ambGer", "2"), ("nSeqEvento", "1"), ("dhProc", "2026-10-25T10:00:00-04:00"), ("nDFSe", "1")]: node(info, label, value)
    info.append(etree.fromstring(signed_request.encode()))
    signer = NationalSigner(signature_algorithm="rsa-sha1", digest_algorithm="sha1", c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315")
    signed = signer.sign(root, key=key, cert=cert.public_bytes(serialization.Encoding.PEM), reference_uri="#" + info.get("Id"), id_attribute="Id")
    validate_xml(signed, "evento_v1.01.xsd")
    return {"eventoXmlGZipB64": encode_xml(etree.tostring(signed).decode())}


@pytest.fixture
def integration(monkeypatch, a1, issuer, customer):
    monkeypatch.setattr(settings, "encryption_key", "test-only-encryption-key-32-characters-or-more")
    monkeypatch.setattr(settings, "nfse_signature_algorithm", "rsa-sha1")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine, tables=[OperationalSnapshot.__table__, NfseCertificate.__table__, NfseSequence.__table__, NfseEmission.__table__])
    db = Session(engine)
    snapshot = OperationalSnapshot(company_key=DEFAULT_COMPANY_KEY, data={"issuerSettings": issuer, "customers": [customer], "closings": [{"id": "closing-1", "number": "FEC01", "customer": customer["name"], "subtotal": 100, "netTotal": 100, "status": "Aprovado"}], "users": [{"id": "u1", "email": "test@example.local", "name": "TESTE", "role": "Administrador", "status": "Ativo", "permissions": {}}]})
    db.add(snapshot); db.commit()
    f = cipher()
    db.add(NfseCertificate(company_key=DEFAULT_COMPANY_KEY, issuer_document=CNPJ, encrypted_pfx=f.encrypt(a1[2]), encrypted_password=f.encrypt(b"test-password"), details={"cnpj": CNPJ})); db.commit()
    calls = []
    mode = {"value": "authorize"}
    def transport(request):
        calls.append(request)
        if mode["value"] == "timeout": raise httpx.ReadTimeout("simulated timeout", request=request)
        if request.url.path.endswith("/eventos"):
            if request.method == "POST":
                body = json.loads(request.content)
                _, signed_request = decode_xml(body["pedidoRegistroEventoXmlGZipB64"])
                return httpx.Response(200, json=cancellation_response(signed_request, a1))
            return httpx.Response(200, json={"eventos": []})
        if request.method == "POST" and request.url.path.endswith("/nfse"):
            if mode["value"] == "reject": return httpx.Response(400, json={"erros": [{"Codigo": "E_TEST", "Descricao": "Rejeicao de teste"}]})
            body = json.loads(request.content)
            _, xml = decode_xml(body["dpsXmlGZipB64"])
            return httpx.Response(201, json=authorized_response(xml, a1))
        if "/dps/" in request.url.path: return httpx.Response(404, json={"message": "not found"})
        return httpx.Response(200, json={})
    monkeypatch.setattr(operational_service, "NationalClient", lambda credentials, base_url=None: NationalClient(credentials, base_url, transport=httpx.MockTransport(transport)))
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[_require_operational_auth] = lambda: "test@example.local"
    client = TestClient(app)
    payload = {"closing_id": "closing-1", "customer_id": "customer-1", "competence": "2026-10-25", "description": "Servico municipal de teste em homologacao"}
    yield client, db, snapshot, payload, calls, mode
    app.dependency_overrides.clear(); db.close(); engine.dispose()


def test_a1_validates_password_and_cnpj(a1):
    assert load_a1(a1[2], "test-password", CNPJ)[1].serial_number == a1[1].serial_number
    with pytest.raises(CertificateError): load_a1(a1[2], "wrong", CNPJ)
    with pytest.raises(CertificateError): load_a1(a1[2], "test-password", "99999999999999")


def test_encryption_requires_non_default_key(monkeypatch):
    monkeypatch.setattr(settings, "encryption_key", "change-me-encryption")
    with pytest.raises(CertificateError): cipher()


def test_signed_dps_is_valid_and_verifiable(a1, issuer, customer):
    xml = sign_xml(build_dps(issuer, customer, 100, "Servico municipal de teste", 1, 1, "2026-10-25"), a1[0], a1[1])
    result = XMLVerifier().verify(xml.encode(), x509_cert=a1[1], expect_config=SignatureConfiguration(signature_methods=frozenset({SignatureMethod.RSA_SHA1}), digest_algorithms=frozenset({DigestAlgorithm.SHA1})))
    assert result.signed_xml.tag == f"{{{NS}}}infDPS"
    assert result.signed_xml.findtext(f"{{{NS}}}tpAmb") == "2"


def test_cancel_xml_validates(a1):
    signed = sign_xml(build_cancel(CNPJ, KEY, "Cancelamento solicitado para teste de homologacao"), a1[0], a1[1])
    validate_xml(etree.fromstring(signed.encode()), "pedRegEvento_v1.01.xsd")


@pytest.mark.parametrize("url", ["http://localhost", "https://sefin.nfse.gov.br/SefinNacional", "https://sefin.producaorestrita.nfse.gov.br.evil.test/SefinNacional", "https://user:secret@sefin.producaorestrita.nfse.gov.br/SefinNacional", "https://sefin.producaorestrita.nfse.gov.br:444/SefinNacional"])
def test_only_official_homologation_endpoint_is_allowed(url):
    with pytest.raises(NationalError): endpoint(url)


def test_validate_does_not_transmit_or_reserve_number(integration):
    client, db, _, payload, calls, _ = integration
    response = client.post("/api/v1/operational-nfse/validate", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["valid"] is True
    assert calls == [] and db.query(NfseEmission).count() == 0 and db.query(NfseSequence).count() == 0


def test_real_flow_uses_signed_xml_and_official_response(integration):
    client, db, snapshot, payload, calls, _ = integration
    response = client.post("/api/v1/operational-nfse/issue", json=payload)
    assert response.status_code == 200, response.text
    note = response.json()["document"]
    assert note["statusCode"] == "authorized", note
    assert note["number"] == "123" and note["accessKey"] == KEY
    assert db.query(NfseEmission).one().authorized_xml
    assert len(calls) == 1
    again = client.post("/api/v1/operational-nfse/issue", json=payload)
    assert again.json()["document"]["id"] == note["id"] and len(calls) == 1
    db.refresh(snapshot)
    assert snapshot.data["closings"][0]["status"] == "Aprovado"
    assert snapshot.data["closings"][0]["nfseHomologationStatus"] == "Autorizado"


def test_rejection_does_not_authorize_and_retry_reuses_dps(integration):
    client, db, _, payload, calls, mode = integration
    mode["value"] = "reject"
    first = client.post("/api/v1/operational-nfse/issue", json=payload).json()["document"]
    assert first["statusCode"] == "rejected"
    mode["value"] = "authorize"
    second = client.post("/api/v1/operational-nfse/issue", json=payload).json()["document"]
    assert second["statusCode"] == "authorized"
    assert first["dpsId"] == second["dpsId"] and db.query(NfseSequence).one().next_number == 2


def test_unknown_response_does_not_retransmit(integration):
    client, db, _, payload, calls, mode = integration
    mode["value"] = "timeout"
    first = client.post("/api/v1/operational-nfse/issue", json=payload).json()["document"]
    assert first["statusCode"] == "unknown"
    client.post("/api/v1/operational-nfse/issue", json=payload)
    assert len(calls) == 1 and db.query(NfseEmission).count() == 1


def test_certificate_upload_is_encrypted_and_not_exported(integration, a1):
    client, db, _, _, _, _ = integration
    response = client.post("/api/v1/operational-nfse/certificate", files={"file": ("teste.pfx", a1[2], "application/x-pkcs12")}, data={"password": "test-password"})
    assert response.status_code == 200, response.text
    row = db.query(NfseCertificate).one()
    assert bytes(row.encrypted_pfx) != a1[2]
    assert b"test-password" not in bytes(row.encrypted_password)
    assert "encrypted" not in response.text and "test-password" not in response.text


def test_read_only_user_cannot_install_or_issue(integration):
    client, db, snapshot, payload, calls, _ = integration
    data = deepcopy(snapshot.data); data["users"][0].update(role="Operador", permissions={"fiscalDocuments": "view", "settings": "view"}); snapshot.data = data; db.commit()
    assert client.post("/api/v1/operational-nfse/issue", json=payload).status_code == 403
    assert client.get("/api/v1/operational-nfse").status_code == 200
    assert client.delete("/api/v1/operational-nfse/certificate").status_code == 403
    assert not calls


def test_cancel_requires_confirmed_official_event(integration):
    client, db, _, payload, calls, _ = integration
    note = client.post("/api/v1/operational-nfse/issue", json=payload).json()["document"]
    response = client.post("/api/v1/operational-nfse/" + note["id"].removeprefix("nfse:") + "/cancel", json={"justification": "Cancelamento para teste de homologacao", "reason_code": "1"})
    assert response.status_code == 200, response.text
    assert response.json()["document"]["statusCode"] == "cancelled", response.text
    assert db.query(NfseEmission).one().events
    assert len(calls) == 2


def test_xml_download_is_the_official_response(integration):
    client, db, _, payload, _, _ = integration
    note = client.post("/api/v1/operational-nfse/issue", json=payload).json()["document"]
    response = client.get("/api/v1/operational-nfse/" + note["id"].removeprefix("nfse:") + "/xml")
    assert response.status_code == 200
    assert response.content.decode() == db.query(NfseEmission).one().authorized_xml
    assert response.headers["cache-control"] == "no-store"


def test_unsigned_dps_and_wrong_response_are_not_authorization(issuer, customer):
    root = build_dps(issuer, customer, 100, "Servico de teste", 1, 1, "2026-10-25")
    with pytest.raises(NationalError): parse_authorized({"chaveAcesso": KEY, "nfseXmlGZipB64": encode_xml(etree.tostring(root).decode())})


def test_a1_rejected_before_any_transmission(integration):
    client, db, _, payload, calls, _ = integration
    db.query(NfseCertificate).delete(); db.commit()
    response = client.post("/api/v1/operational-nfse/issue", json=payload)
    assert response.status_code == 422
    assert not calls and db.query(NfseSequence).count() == 0


def test_new_number_is_reserved_for_a_different_closing(integration):
    client, db, snapshot, payload, _, _ = integration
    first = client.post("/api/v1/operational-nfse/issue", json=payload).json()["document"]
    db.refresh(snapshot); data = deepcopy(snapshot.data)
    data["closings"].append({**data["closings"][0], "id": "closing-2", "number": "FEC02"}); snapshot.data = data; db.commit()
    second = client.post("/api/v1/operational-nfse/issue", json={**payload, "closing_id": "closing-2"}).json()["document"]
    assert first["dpsNumber"] == "1" and second["dpsNumber"] == "2"
    assert first["dpsId"] != second["dpsId"]


def test_snapshot_cannot_escalate_fiscal_permissions(integration):
    client, db, snapshot, payload, calls, _ = integration
    data = deepcopy(snapshot.data)
    data["users"][0].update(role="Operador", permissions={"fiscalDocuments": "view", "settings": "view"})
    snapshot.data = data; db.commit()
    attack = deepcopy(data)
    attack["users"][0]["role"] = "Administrador"
    attack["issuerSettings"]["nfseEnvironment"] = "Producao"
    assert client.put("/api/v1/operational-data", json={"data": attack}).status_code == 200
    db.refresh(snapshot)
    assert snapshot.data["users"][0]["role"] == "Operador"
    assert snapshot.data["issuerSettings"]["nfseEnvironment"] == "Homologacao"
    assert client.post("/api/v1/operational-nfse/issue", json=payload).status_code == 403
    assert not calls


def test_substitution_dps_has_official_reference(issuer, customer, a1):
    root = build_dps(issuer, customer, 100, "Servico de teste", 1, 2, "2026-10-25", substitution={"key": KEY, "code": "99", "reason": "Correcao de dados para homologacao"})
    signed = sign_xml(root, a1[0], a1[1])
    assert KEY in signed
