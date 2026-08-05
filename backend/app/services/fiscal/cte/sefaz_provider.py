from app.core.config import settings
from app.services.fiscal.common.exceptions import FiscalIntegrationError
from app.services.fiscal.contracts import FiscalEmissionInput, FiscalEmissionResult


class SefazCteProvider:
    """Adapter para CT-e 4.00 via autorizador SEFAZ.

    Mantém a fronteira de integração pronta para XML assinado, XSD, autorização,
    consulta e eventos. Bloqueia emissão real enquanto endpoints por UF,
    certificado e dados obrigatórios do modal não estiverem configurados.
    """

    name = "sefaz_cte"

    def validate(self, data: FiscalEmissionInput) -> list[str]:
        errors: list[str] = []
        required_settings = {
            "cte_authorization_url": settings.cte_authorization_url,
            "fiscal_certificate_path": settings.fiscal_certificate_path,
            "fiscal_certificate_password": settings.fiscal_certificate_password,
        }
        for field, value in required_settings.items():
            if not value:
                errors.append(f"Configuração obrigatória ausente: {field}")

        for key, label in {
            "origin_city_code": "Código IBGE do município de origem",
            "destination_city_code": "Código IBGE do município de destino",
            "cfop": "CFOP",
            "service_value": "Valor da prestação",
        }.items():
            if not data.payload.get(key):
                errors.append(f"{label} não informado")
        return errors

    def issue(self, data: FiscalEmissionInput) -> FiscalEmissionResult:
        errors = self.validate(data)
        if errors:
            raise FiscalIntegrationError(" | ".join(errors))
        raise FiscalIntegrationError(
            "Conector CT-e 4.00 configurado, mas o XML assinado/XSD e os endpoints do autorizador da UF ainda precisam ser parametrizados."
        )

    def cancel(self, access_key: str, justification: str) -> FiscalEmissionResult:
        raise FiscalIntegrationError("Evento de cancelamento CT-e real ainda não configurado")

    def status(self, access_key: str) -> FiscalEmissionResult:
        raise FiscalIntegrationError("Consulta de situação CT-e real ainda não configurada")
