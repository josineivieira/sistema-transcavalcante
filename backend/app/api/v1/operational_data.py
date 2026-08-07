from copy import deepcopy
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.database.session import get_db
from app.models.operational_data import OperationalSnapshot

router = APIRouter()

DEFAULT_COMPANY_KEY = "transcavalcante"
LOGIN_TOKEN_PREFIX = "operational:"

_login_attempts: dict[str, dict[str, datetime | int]] = {}


class OperationalDataPayload(BaseModel):
    data: dict = Field(default_factory=dict)


class OperationalLoginPayload(BaseModel):
    email: str
    password: str


class OperationalLoginResponse(BaseModel):
    access_token: str
    user: dict


def _default_snapshot_data() -> dict:
    return {
        "customers": [],
        "drivers": [],
        "vehicles": [],
        "containers": [],
        "freights": [],
        "closings": [],
        "fiscalDocuments": [],
        "receivables": [],
        "priceLists": [],
        "issuerSettings": {},
        "settingsSavedAt": "-",
        "users": [
            {
                "id": "usr-1",
                "name": "Administrador SF",
                "email": "admin@transcavalcante.local",
                "passwordHash": get_password_hash("admin123"),
                "role": "Administrador",
                "department": "Administracao",
                "status": "Ativo",
                "permissions": {
                    "dashboard": "view",
                    "freights": "edit",
                    "customers": "edit",
                    "drivers": "edit",
                    "vehicles": "edit",
                    "containers": "edit",
                    "closings": "edit",
                    "fiscalDocuments": "edit",
                    "finance": "edit",
                    "priceLists": "edit",
                    "reports": "view",
                    "users": "edit",
                    "settings": "edit",
                },
            }
        ],
    }


def _get_or_create_snapshot(db: Session) -> OperationalSnapshot:
    snapshot = db.query(OperationalSnapshot).filter_by(company_key=DEFAULT_COMPANY_KEY).first()
    if snapshot is not None:
        return snapshot

    snapshot = OperationalSnapshot(company_key=DEFAULT_COMPANY_KEY, data=_default_snapshot_data())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def _client_key(request: Request, email: str) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    return f"{ip}:{email.strip().lower()}"


def _check_rate_limit(key: str) -> None:
    now = datetime.now(timezone.utc)
    state = _login_attempts.get(key)
    if not state:
        return

    locked_until = state.get("locked_until")
    if isinstance(locked_until, datetime) and locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        )

    first_attempt_at = state.get("first_attempt_at")
    if isinstance(first_attempt_at, datetime) and first_attempt_at + timedelta(minutes=30) < now:
        _login_attempts.pop(key, None)


def _register_failed_login(key: str) -> None:
    now = datetime.now(timezone.utc)
    state = _login_attempts.setdefault(key, {"count": 0, "first_attempt_at": now})
    state["count"] = int(state.get("count", 0)) + 1
    if int(state["count"]) >= settings.login_max_attempts:
        state["locked_until"] = now + timedelta(seconds=settings.login_lockout_seconds)


def _clear_failed_logins(key: str) -> None:
    _login_attempts.pop(key, None)


def _find_user(data: dict, email: str) -> dict | None:
    normalized_email = email.strip().lower()
    for user in data.get("users", []):
        if str(user.get("email", "")).strip().lower() == normalized_email:
            return user
    return None


def _verify_user_password(user: dict, password: str) -> bool:
    password_hash = user.get("passwordHash") or user.get("password_hash")
    if password_hash:
        try:
            return verify_password(password, str(password_hash))
        except Exception:
            return False

    legacy_password = user.get("password")
    return bool(legacy_password) and str(legacy_password) == password


def _sanitize_user(user: dict) -> dict:
    sanitized = deepcopy(user)
    sanitized.pop("password", None)
    sanitized.pop("passwordHash", None)
    sanitized.pop("password_hash", None)
    sanitized["passwordConfigured"] = bool(user.get("password") or user.get("passwordHash") or user.get("password_hash"))
    return sanitized


def _sanitize_data(data: dict) -> dict:
    sanitized = deepcopy(data)
    sanitized["users"] = [_sanitize_user(user) for user in sanitized.get("users", [])]
    return sanitized


def _prepare_data_for_storage(incoming: dict, current: dict | None = None) -> dict:
    data = deepcopy(incoming)
    current_users = {
        str(user.get("id")): user
        for user in (current or {}).get("users", [])
        if user.get("id")
    }

    secured_users = []
    for user in data.get("users", []):
        secured = deepcopy(user)
        existing = current_users.get(str(secured.get("id")), {})
        plain_password = str(secured.get("password") or "")

        if plain_password:
            secured["passwordHash"] = get_password_hash(plain_password)
        elif existing.get("passwordHash"):
            secured["passwordHash"] = existing["passwordHash"]
        elif existing.get("password_hash"):
            secured["passwordHash"] = existing["password_hash"]
        elif existing.get("password"):
            secured["passwordHash"] = get_password_hash(str(existing["password"]))

        secured.pop("password", None)
        secured.pop("password_hash", None)
        secured.pop("passwordConfigured", None)
        secured_users.append(secured)

    data["users"] = secured_users
    return data


def _require_operational_auth(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao obrigatoria")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido") from exc

    subject = str(payload.get("sub") or "")
    token_type = payload.get("type")
    if token_type != "access" or not subject.startswith(LOGIN_TOKEN_PREFIX):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    return subject.removeprefix(LOGIN_TOKEN_PREFIX)


@router.post("/login", response_model=OperationalLoginResponse)
def login_operational(payload: OperationalLoginPayload, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip()
    key = _client_key(request, email)
    _check_rate_limit(key)

    snapshot = _get_or_create_snapshot(db)
    data = _prepare_data_for_storage(snapshot.data, snapshot.data)
    if data != snapshot.data:
        snapshot.data = data
        db.commit()
        db.refresh(snapshot)

    user = _find_user(data, email)

    if not user or user.get("status") != "Ativo" or not _verify_user_password(user, payload.password):
        _register_failed_login(key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario ou senha invalido.")

    _clear_failed_logins(key)
    return {
        "access_token": create_access_token(f"{LOGIN_TOKEN_PREFIX}{email.lower()}"),
        "user": _sanitize_user(user),
    }


@router.get("")
def get_operational_data(
    _: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    snapshot = _get_or_create_snapshot(db)
    secured = _prepare_data_for_storage(snapshot.data, snapshot.data)
    if secured != snapshot.data:
        snapshot.data = secured
        db.commit()
        db.refresh(snapshot)

    return {"data": _sanitize_data(snapshot.data), "updated_at": snapshot.updated_at}


@router.put("")
def save_operational_data(
    payload: OperationalDataPayload,
    _: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    snapshot = _get_or_create_snapshot(db)
    snapshot.data = _prepare_data_for_storage(payload.data, snapshot.data)

    db.commit()
    db.refresh(snapshot)
    return {"data": _sanitize_data(snapshot.data), "updated_at": snapshot.updated_at}
