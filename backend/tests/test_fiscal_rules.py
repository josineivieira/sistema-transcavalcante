from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.fiscal import FiscalIssueRequest
from app.services.fiscal_service import build_idempotency_key


def test_fiscal_type_is_normalized():
    payload = FiscalIssueRequest(
        fiscal_type="NFSE",
        company_id=uuid4(),
        closing_id=uuid4(),
        customer_id=uuid4(),
    )

    assert payload.fiscal_type == "nfse"


def test_fiscal_type_rejects_unknown_value():
    with pytest.raises(ValidationError):
        FiscalIssueRequest(
            fiscal_type="mdfe",
            company_id=uuid4(),
            closing_id=uuid4(),
            customer_id=uuid4(),
        )


def test_idempotency_key_includes_environment_and_closing():
    closing_id = uuid4()
    payload = FiscalIssueRequest(
        fiscal_type="cte",
        company_id=uuid4(),
        closing_id=closing_id,
        customer_id=uuid4(),
    )

    key = build_idempotency_key(payload)

    assert str(closing_id) in key
    assert ":cte:" in key
