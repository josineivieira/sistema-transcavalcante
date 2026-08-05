from itertools import count

from app.services.fiscal.contracts import FiscalEmissionInput, FiscalEmissionResult

_sequence = count(1)


class MockFiscalProvider:
    name = "mock"

    def validate(self, data: FiscalEmissionInput) -> list[str]:
        errors: list[str] = []
        if data.amount <= 0:
            errors.append("O valor do documento deve ser maior que zero")
        if data.fiscal_type not in {"nfse", "cte"}:
            errors.append("Tipo fiscal inválido")
        return errors

    def issue(self, data: FiscalEmissionInput) -> FiscalEmissionResult:
        number = next(_sequence)
        prefix = data.fiscal_type.upper()
        return FiscalEmissionResult(
            status="authorized",
            provider=self.name,
            number=f"{number:06d}",
            series="1",
            access_key=f"MOCK-{prefix}-{number:044d}"[-52:],
            reference=f"MOCK-{prefix}-{number:06d}",
            protocol=f"PROTOCOLO-MOCK-{number:06d}",
            raw_response={"mock": True, "idempotency_key": data.idempotency_key},
        )

    def cancel(self, access_key: str, justification: str) -> FiscalEmissionResult:
        return FiscalEmissionResult(
            status="cancelled",
            provider=self.name,
            access_key=access_key,
            protocol="CANCELAMENTO-MOCK",
            raw_response={"mock": True, "justification": justification},
        )

    def status(self, access_key: str) -> FiscalEmissionResult:
        return FiscalEmissionResult(status="authorized", provider=self.name, access_key=access_key)
