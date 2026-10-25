from copy import deepcopy

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api.v1 import operational_freights as api
from app.database.base import Base
from app.models.company import Company
from app.models.customer import Customer
from app.models.freight import Freight, FreightTask


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine, tables=[Company.__table__, Customer.__table__, Freight.__table__, FreightTask.__table__])
    monkeypatch.setattr(api, "_require_permission", lambda *args: None)
    with Session(engine) as session:
        yield session
    engine.dispose()


def save(db, external_id, data, regenerate=False):
    return api.upsert_operational_freight(external_id, api.OperationalFreightPayload(data=data, regenerate_process=regenerate), "test@example.local", db)["data"]


def test_regeneration_uses_all_company_codes_and_preserves_freight(db):
    original = save(db, "first", {"process": "TR01", "value": 123, "operationalStatus": "CUSTOM STATUS", "routeName": "CUSTOM ROUTE", "taskHistory": [{"id": "history-1", "name": "CUSTOM STATUS", "user": "Operator"}]})
    save(db, "outside-filter", {"process": "tr500"})
    save(db, "another-company", {"process": "TR999", "serviceTakerDocument": "11111111000111"})
    before = deepcopy(original)
    updated = save(db, "first", original, regenerate=True)
    assert updated["process"] == "TR501"
    assert updated["number"] == "TR501"
    assert updated["id"] == before["id"]
    for key in ["value", "operationalStatus", "routeName", "taskHistory"]:
        assert updated[key] == before[key]
    assert db.query(Freight).count() == 3
    assert db.query(Freight).filter(Freight.external_id == "outside-filter").one().process_number == "tr500"
    again = save(db, "first", updated, regenerate=True)
    assert again["process"] == "TR502"
    assert db.query(Freight).count() == 3


def test_regular_save_keeps_code(db):
    original = save(db, "first", {"process": "TR09"})
    updated = save(db, "first", {**original, "customer": "Updated"})
    assert updated["process"] == "TR09"
    assert updated["customer"] == "Updated"


def test_regeneration_advances_past_current_draft_code(db):
    updated = save(db, "new-draft", {"process": "TR99"}, regenerate=True)
    assert updated["process"] == "TR100"
