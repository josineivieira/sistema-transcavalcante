from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Protocol


@dataclass(slots=True)
class FiscalEmissionInput:
    fiscal_type: str
    company_id: str
    closing_id: str
    customer_id: str
    amount: Decimal
    idempotency_key: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class FiscalEmissionResult:
    status: str
    provider: str
    number: str | None = None
    series: str | None = None
    access_key: str | None = None
    reference: str | None = None
    protocol: str | None = None
    request_xml: str | None = None
    authorized_xml: str | None = None
    pdf_url: str | None = None
    rejection_code: str | None = None
    rejection_message: str | None = None
    raw_response: dict[str, Any] = field(default_factory=dict)


class FiscalProvider(Protocol):
    name: str

    def validate(self, data: FiscalEmissionInput) -> list[str]: ...
    def issue(self, data: FiscalEmissionInput) -> FiscalEmissionResult: ...
    def cancel(self, access_key: str, justification: str) -> FiscalEmissionResult: ...
    def status(self, access_key: str) -> FiscalEmissionResult: ...
