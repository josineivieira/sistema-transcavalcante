from app.core.config import settings
from app.services.fiscal.cte.sefaz_provider import SefazCteProvider
from app.services.fiscal.nfse.national_provider import NationalNfseProvider
from app.services.fiscal.providers.mock_provider import MockFiscalProvider


def get_provider(fiscal_type: str):
    provider = settings.fiscal_default_provider.lower()
    if provider == "mock":
        return MockFiscalProvider()
    if fiscal_type == "nfse":
        return NationalNfseProvider()
    if fiscal_type == "cte":
        return SefazCteProvider()
    raise ValueError(f"Tipo fiscal não suportado: {fiscal_type}")
