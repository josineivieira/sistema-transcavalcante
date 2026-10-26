from pathlib import Path

from cryptography.hazmat.primitives.serialization import pkcs12

from app.core.config import settings
from app.services.fiscal.certificates.a1 import CertificateError, certificate_cnpj, load_a1
from app.services.fiscal.common.exceptions import FiscalIntegrationError
from app.services.fiscal.contracts import FiscalEmissionInput, FiscalEmissionResult
from app.services.fiscal.nfse.national_client import NationalClient, NationalError
from app.services.fiscal.nfse.xml_builder import DpsError, build_dps, build_cancel, sign_xml, validate_data


class NationalNfseProvider:
    """National integration for the legacy UUID API; operational UI uses the encrypted-keystore service."""
    name = "nfse_nacional"

    def credentials(self):
        if settings.fiscal_environment != "homologation": raise CertificateError("Este conector está habilitado somente em homologação.")
        if not settings.fiscal_certificate_path: raise CertificateError("Configure o certificado A1 no backend.")
        try:
            raw = Path(settings.fiscal_certificate_path).read_bytes()
            _, cert, _ = pkcs12.load_key_and_certificates(raw, settings.fiscal_certificate_password.encode() if settings.fiscal_certificate_password else None)
            if cert is None: raise ValueError()
            return load_a1(raw, settings.fiscal_certificate_password, certificate_cnpj(cert))
        except (OSError, ValueError): raise CertificateError("Não foi possível abrir o certificado A1 configurado.") from None

    def validate(self, data: FiscalEmissionInput) -> list[str]:
        issuer = data.payload.get("issuer") or {}
        customer = data.payload.get("customer") or {}
        errors = validate_data(issuer, customer, data.amount, str(data.payload.get("service_description") or ""))
        for key in ["series", "dps_number", "competence"]:
            if not data.payload.get(key): errors.append(f"Campo fiscal obrigatório: {key}")
        try:
            credentials = self.credentials()
            if issuer.get("document") and certificate_cnpj(credentials[1]) != str(issuer["document"]).replace(".", "").replace("/", "").replace("-", ""): errors.append("CNPJ do certificado diferente do prestador.")
            NationalClient(credentials, settings.nfse_base_url)
        except (CertificateError, NationalError) as exc: errors.append(str(exc))
        return errors

    def issue(self, data: FiscalEmissionInput) -> FiscalEmissionResult:
        errors = self.validate(data)
        if errors: raise FiscalIntegrationError(" | ".join(errors))
        payload = data.payload
        try:
            credentials = self.credentials()
            root = build_dps(payload["issuer"], payload["customer"], data.amount, payload["service_description"], payload["series"], payload["dps_number"], payload["competence"])
            xml = sign_xml(root, credentials[0], credentials[1])
            result = NationalClient(credentials, settings.nfse_base_url).issue_signed(xml, root[0].get("Id"))
            result.request_xml = xml
            return result
        except (CertificateError, DpsError, NationalError) as exc: raise FiscalIntegrationError(str(exc)) from None

    def cancel(self, access_key: str, justification: str) -> FiscalEmissionResult:
        try:
            credentials = self.credentials()
            xml = sign_xml(build_cancel(certificate_cnpj(credentials[1]), access_key, justification), credentials[0], credentials[1])
            response = NationalClient(credentials, settings.nfse_base_url).cancel_signed(access_key, xml)
            return FiscalEmissionResult(status="cancelled", provider=self.name, access_key=access_key, request_xml=xml, raw_response=response)
        except (CertificateError, DpsError, NationalError) as exc: raise FiscalIntegrationError(str(exc)) from None

    def status(self, access_key: str) -> FiscalEmissionResult:
        try: return NationalClient(self.credentials(), settings.nfse_base_url).consult(access_key)
        except (CertificateError, NationalError) as exc: raise FiscalIntegrationError(str(exc)) from None
