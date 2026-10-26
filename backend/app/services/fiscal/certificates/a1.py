import base64
import hashlib
import os
import re
import secrets
import ssl
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from cryptography import x509
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import ExtendedKeyUsageOID, ObjectIdentifier, NameOID

from app.core.config import settings


class CertificateError(ValueError):
    pass


def cipher() -> Fernet:
    secret = settings.encryption_key
    if len(secret) < 32 or secret.startswith("change-me"):
        raise CertificateError("Configure ENCRYPTION_KEY no backend com um segredo aleatório de pelo menos 32 caracteres.")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(("nfse-a1:" + secret).encode()).digest()))


def certificate_cnpj(cert: x509.Certificate) -> str:
    # Res. ICP-Brasil 211/2024 identifies the holder in Subject serialNumber.
    # Keep legacy otherName support; never infer ownership from the display name.
    identifiers = set()
    for attribute in cert.subject.get_attributes_for_oid(NameOID.SERIAL_NUMBER):
        value = attribute.value.strip().upper()
        if re.fullmatch(r"[A-Z0-9]{12}[0-9]{2}", value):
            identifiers.add(value)
    try:
        entries = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    except x509.ExtensionNotFound:
        entries = []
    for entry in entries:
        if isinstance(entry, x509.OtherName) and entry.type_id == ObjectIdentifier("2.16.76.1.3.3"):
            value = entry.value
            if len(value) < 2 or value[0] not in (4, 12, 19, 22):
                continue
            offset, length = 2, value[1]
            if length & 128:
                count = length & 127
                if count > 2 or len(value) < 2 + count: continue
                length = int.from_bytes(value[2:2 + count], "big"); offset += count
            text = value[offset:offset + length].decode("ascii", errors="ignore").upper()
            if re.fullmatch(r"[A-Z0-9]{12}[0-9]{2}", text): identifiers.add(text)
    if len(identifiers) > 1:
        raise CertificateError("O certificado informa CNPJs divergentes nos campos do titular. Confira o arquivo com a certificadora.")
    if identifiers:
        return identifiers.pop()
    raise CertificateError("Não foi localizado CNPJ no serialNumber do titular nem na extensão ICP-Brasil. Confira se o arquivo é o certificado da empresa (e-CNPJ), e não um e-CPF.")


def load_a1(raw: bytes, password: str, expected_cnpj: str):
    try:
        key, cert, chain = pkcs12.load_key_and_certificates(raw, password.encode() if password else None)
    except (ValueError, TypeError):
        raise CertificateError("Não foi possível abrir o A1. Confira a senha e o arquivo .pfx/.p12.") from None
    if not key or not cert or not isinstance(key, rsa.RSAPrivateKey):
        raise CertificateError("O arquivo deve conter certificado A1 e chave privada RSA.")
    now = datetime.now(timezone.utc)
    if not cert.not_valid_before_utc <= now <= cert.not_valid_after_utc:
        raise CertificateError("O certificado está vencido ou ainda não está válido.")
    owner = certificate_cnpj(cert)
    if owner != expected_cnpj:
        raise CertificateError("O CNPJ do certificado é diferente do CNPJ da empresa emissora salva nas configurações.")
    if key.public_key().public_numbers() != cert.public_key().public_numbers():
        raise CertificateError("A chave privada não corresponde ao certificado.")
    try:
        if ExtendedKeyUsageOID.CLIENT_AUTH not in cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value:
            raise CertificateError("O certificado não permite autenticação de cliente.")
    except x509.ExtensionNotFound: pass
    try:
        if not cert.extensions.get_extension_for_class(x509.KeyUsage).value.digital_signature:
            raise CertificateError("O certificado não permite assinatura digital.")
    except x509.ExtensionNotFound: pass
    return key, cert, list(chain or [])


def metadata(cert: x509.Certificate) -> dict:
    return {"cnpj": certificate_cnpj(cert), "subject": cert.subject.rfc4514_string(), "validFrom": cert.not_valid_before_utc.isoformat(), "validUntil": cert.not_valid_after_utc.isoformat(), "fingerprint": cert.fingerprint(hashes.SHA256()).hex()}


def decrypt_a1(record):
    try:
        f = cipher()
        raw = f.decrypt(bytes(record.encrypted_pfx))
        password = f.decrypt(bytes(record.encrypted_password)).decode()
    except (InvalidToken, UnicodeError):
        raise CertificateError("Não foi possível abrir o certificado salvo. Confira a ENCRYPTION_KEY ou reinstale o A1.") from None
    return load_a1(raw, password, record.issuer_document)


@contextmanager
def mtls_context(key, cert, chain):
    # Only an encrypted temporary private-key file is used; it is removed before the request.
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    with TemporaryDirectory(prefix="nfse-a1-") as folder:
        certificate_path = Path(folder) / "certificate.pem"
        key_path = Path(folder) / "key.pem"
        password = secrets.token_bytes(32)
        certificate_path.write_bytes(b"".join(item.public_bytes(serialization.Encoding.PEM) for item in [cert, *chain]))
        key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.BestAvailableEncryption(password)))
        os.chmod(key_path, 0o600)
        context.load_cert_chain(str(certificate_path), str(key_path), password=password)
    yield context
