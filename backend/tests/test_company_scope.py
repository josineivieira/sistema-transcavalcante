from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.deps import enforce_company_access
from app.models.user import User


def test_company_user_can_access_own_company():
    company_id = uuid4()
    user = User(company_id=company_id, email="user@example.com", full_name="User", password_hash="x", role="billing")

    enforce_company_access(user, company_id)


def test_company_user_cannot_access_other_company():
    user = User(company_id=uuid4(), email="user@example.com", full_name="User", password_hash="x", role="billing")

    with pytest.raises(HTTPException) as exc:
        enforce_company_access(user, uuid4())

    assert exc.value.status_code == 403


def test_general_admin_can_access_any_company():
    user = User(company_id=None, email="admin@example.com", full_name="Admin", password_hash="x", role="general_admin")

    enforce_company_access(user, uuid4())
