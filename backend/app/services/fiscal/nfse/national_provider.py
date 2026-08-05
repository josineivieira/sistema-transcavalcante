from app.core.config import settings
from app.services.fiscal.common.exceptions import FiscalIntegrationError
from app.services.fiscal.contracts import FiscalEmissionInput, FiscalEmissionResult


class NationalNfseProvider:
    """Adapter do Emissor Público Nacional de NFS-e.

    A estrutura está pronta para autenticação mTLS, DPS/XML e consulta de eventos.
    A emissão permanece bloqueada até URL, certificado A1 e gerador DPS oficial
    serem configurados, evitando emissão fiscal incompleta ou inválida.
    """

    name = "nfse_nacional"

    def validate(self, data: FiscalEmissionInput) -> list[str]:
        errors: list[str] = []
        required = {
            "nfse_base_url": settings.nfse_base_url,
            "fiscal_certificate_path": settings.fiscal_certificate_path,
            "fiscal_certificate_password": settings.fiscal_certificate_password,
        }
        for field, value in required.items():
            if not value:
                errors.append(f"Configuração obrigatória ausente: {field}")
        if not data.payload.get("service_code"):
            errors.append("Código do serviço da NFS-e não informado")
        if not data.payload.get("service_description"):
            errors.append("Discriminação do serviço da NFS-e não informada")
        return errors

    def issue(self, data: FiscalEmissionInput) -> FiscalEmissionResult:
        errors = self.validate(data)
        if errors:
            raise FiscalIntegrationError(" | ".join(errors))
        raise FiscalIntegrationError(
            "Conector NFS-e Nacional configurado, mas o gerador DPS/XSD oficial ainda precisa ser parametrizado com os dados fiscais da empresa e do município."
        )

    def cancel(self, access_key: str, justification: str) -> FiscalEmissionResult:
        raise FiscalIntegrationError("Cancelamento NFS-e real depende do evento e regras do município emissor")

    def status(self, access_key: str) -> FiscalEmissionResult:
        raise FiscalIntegrationError("Consulta NFS-e real ainda não configurada")
