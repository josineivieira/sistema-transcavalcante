from decimal import Decimal

from app.services.fiscal.contracts import FiscalEmissionInput
from app.services.fiscal.providers.mock_provider import MockFiscalProvider


def make_input(fiscal_type="nfse"):
    return FiscalEmissionInput(
        fiscal_type=fiscal_type,
        company_id="company",
        closing_id="closing",
        customer_id="customer",
        amount=Decimal("1500.00"),
        idempotency_key="key",
        payload={},
    )


def test_mock_provider_authorizes_document():
    provider = MockFiscalProvider()
    result = provider.issue(make_input())
    assert result.status == "authorized"
    assert result.number
    assert result.protocol


def test_mock_provider_validates_amount():
    data = make_input()
    data.amount = Decimal("0")
    assert "O valor do documento deve ser maior que zero" in MockFiscalProvider().validate(data)


def test_mock_provider_cancels_document():
    result = MockFiscalProvider().cancel("MOCK-KEY", "Cancelamento solicitado para teste")
    assert result.status == "cancelled"
    assert result.protocol == "CANCELAMENTO-MOCK"
