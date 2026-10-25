from copy import deepcopy

import pytest
from fastapi import HTTPException

from app.core.customer_document import valid_customer_document
from app.api.v1.operational_data import _prepare_data_for_storage


@pytest.mark.parametrize("value,kind,valid", [
    ("529.982.247-25", "Fisica", True),
    ("52998224725", "Fisica", True),
    ("529.982.247-26", "Fisica", False),
    ("111.111.111-11", "Fisica", False),
    ("99999999999999999999999999999", "Juridica", False),
    ("11.222.333/0001-81", "Juridica", True),
    ("11.222.333/0001-82", "Juridica", False),
    ("00.000.000/0000-00", "Juridica", False),
    ("00.000.000/E08G-12", "Juridica", True),
    ("00.000.000/e08g-12", "Juridica", True),
    ("00.000.000/E08G-13", "Juridica", False),
    ("52998224725", "Juridica", False),
    ("11222333000181", "Fisica", False),
    ("", "Fisica", False),
    ("123abc", "Fisica", False),
    ("12@22333000181", "Juridica", False),
    ("FOREIGN-123", "Exterior", True),
    ("", "Exterior", False),
])
def test_customer_document(value, kind, valid):
    assert valid_customer_document(value, kind) is valid


def test_new_invalid_customer_is_rejected():
    with pytest.raises(HTTPException) as error:
        _prepare_data_for_storage({"customers": [{"id": "new", "document": "99999999999999999999999999999", "participantType": "Juridica"}]})
    assert error.value.status_code == 422


def test_legacy_invalid_document_does_not_block_unrelated_updates():
    current = {"customers": [{"id": "legacy", "document": "invalid", "participantType": "Juridica", "name": "Before"}]}
    updated = deepcopy(current)
    updated["customers"][0]["name"] = "After"
    assert _prepare_data_for_storage(updated, current)["customers"][0]["name"] == "After"
    updated["customers"][0]["document"] = "still invalid"
    with pytest.raises(HTTPException):
        _prepare_data_for_storage(updated, current)


def test_new_valid_customer_is_accepted():
    data = {"customers": [{"id": "new", "document": "11.222.333/0001-81", "participantType": "Juridica"}]}
    assert _prepare_data_for_storage(data)["customers"] == data["customers"]
