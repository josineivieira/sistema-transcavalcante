from copy import deepcopy
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.database.session import get_db
from app.models.operational_data import OperationalSnapshot

router = APIRouter()

DEFAULT_COMPANY_KEY = "transcavalcante"
LOGIN_TOKEN_PREFIX = "operational:"
ACCESS_COOKIE_NAME = "tc_access_token"
REFRESH_COOKIE_NAME = "tc_refresh_token"
CSRF_COOKIE_NAME = "tc_csrf_token"
REMEMBER_COOKIE_NAME = "tc_remember_session"
CSRF_HEADER_NAME = "x-csrf-token"

_login_attempts: dict[str, dict[str, datetime | int]] = {}


class OperationalDataPayload(BaseModel):
    data: dict = Field(default_factory=dict)


class OperationalPriceListPayload(BaseModel):
    data: dict = Field(default_factory=dict)


class OperationalLoginPayload(BaseModel):
    email: str
    password: str
    remember: bool = False


class OperationalLoginResponse(BaseModel):
    session_idle_timeout_minutes: int
    user: dict


def _default_snapshot_data() -> dict:
    return {
        "customers": [],
        "drivers": [],
        "vehicles": [],
        "containers": [],
        "freights": [],
        "deletedFreightIds": [],
        "closings": [],
        "fiscalDocuments": [],
        "receivables": [],
        "priceLists": [],
        "purchaseRequests": [],
        "payrollProfiles": [],
        "payrollClosings": [],
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
                    "purchaseRequests": "edit",
                    "payroll": "edit",
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


def _digits(value: object) -> str:
    return "".join(char for char in str(value or "") if char.isdigit())


def _format_zip_code(value: object) -> str:
    digits = _digits(value)[:8]
    if len(digits) == 8:
        return f"{digits[:5]}-{digits[5:]}"
    return str(value or "").strip()


def _prepare_price_list_record(record: dict, price_id: str) -> dict:
    prepared = deepcopy(record)
    prepared["id"] = str(prepared.get("id") or price_id)
    prepared["originZipCode"] = _format_zip_code(prepared.get("originZipCode"))
    return prepared


def _prepare_data_for_storage(incoming: dict, current: dict | None = None) -> dict:
    data = deepcopy(incoming)
    current_deleted_freights = set((current or {}).get("deletedFreightIds") or [])
    incoming_deleted_freights = set(data.get("deletedFreightIds") or [])
    data["deletedFreightIds"] = sorted(current_deleted_freights | incoming_deleted_freights)

    current_users = {
        str(user.get("id")): user
        for user in (current or {}).get("users", [])
        if user.get("id")
    }

    secured_users = []
    for user in data.get("users", []):
        secured = deepcopy(user)
        existing = current_users.get(str(secured.get("id")), {})
        permissions = dict(secured.get("permissions") or {})
        if "purchaseRequests" not in permissions:
            permissions["purchaseRequests"] = "edit" if secured.get("role") == "Administrador" else "none"
        if "payroll" not in permissions:
            permissions["payroll"] = "edit" if secured.get("role") == "Administrador" else "none"
        secured["permissions"] = permissions
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


def _request_is_https(request: Request | None) -> bool:
    if request is None:
        return False
    forwarded_proto = request.headers.get("x-forwarded-proto", "").lower()
    return forwarded_proto == "https" or request.url.scheme == "https"


def _cookie_secure(request: Request | None = None) -> bool:
    return settings.app_env != "development" or _request_is_https(request)


def _cookie_samesite(request: Request | None = None) -> str:
    return "none" if _cookie_secure(request) else "lax"


def _set_auth_cookies(response: Response, email: str, remember: bool, request: Request) -> None:
    access_token = create_access_token(f"{LOGIN_TOKEN_PREFIX}{email.lower()}")
    refresh_token = create_refresh_token(f"{LOGIN_TOKEN_PREFIX}{email.lower()}")
    csrf_token = token_urlsafe(32)
    secure = _cookie_secure(request)
    samesite = _cookie_samesite(request)

    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60 if remember else None,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE_NAME,
        csrf_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60 if remember else None,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        REMEMBER_COOKIE_NAME,
        "true" if remember else "false",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60 if remember else None,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
    )


def _clear_auth_cookies(response: Response, request: Request | None = None) -> None:
    secure = _cookie_secure(request)
    samesite = _cookie_samesite(request)
    for cookie_name in (ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME, REMEMBER_COOKIE_NAME):
        response.delete_cookie(cookie_name, path="/", secure=secure, samesite=samesite)


def _decode_operational_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido") from exc

    subject = str(payload.get("sub") or "")
    token_type = payload.get("type")
    if token_type != "access" or not subject.startswith(LOGIN_TOKEN_PREFIX):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    return subject.removeprefix(LOGIN_TOKEN_PREFIX)


def _validate_csrf(request: Request, x_csrf_token: str | None) -> None:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return

    csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
    if not csrf_cookie or not x_csrf_token or csrf_cookie != x_csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requisicao nao autorizada")


def _require_operational_auth(
    request: Request,
    authorization: str | None = Header(default=None),
    x_csrf_token: str | None = Header(default=None, alias=CSRF_HEADER_NAME),
) -> str:
    access_cookie = request.cookies.get(ACCESS_COOKIE_NAME)

    if access_cookie:
        _validate_csrf(request, x_csrf_token)
        return _decode_operational_access_token(access_cookie)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao obrigatoria")

    token = authorization.split(" ", 1)[1].strip()
    return _decode_operational_access_token(token)


def _decode_operational_refresh_token(refresh_token: str) -> str:
    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao expirada") from exc

    subject = str(payload.get("sub") or "")
    token_type = payload.get("type")
    if token_type != "refresh" or not subject.startswith(LOGIN_TOKEN_PREFIX):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao expirada")

    return subject.removeprefix(LOGIN_TOKEN_PREFIX)


@router.post("/login", response_model=OperationalLoginResponse)
def login_operational(payload: OperationalLoginPayload, request: Request, response: Response, db: Session = Depends(get_db)):
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
    _set_auth_cookies(response, email, payload.remember, request)
    return {
        "session_idle_timeout_minutes": settings.session_idle_timeout_minutes,
        "user": _sanitize_user(user),
    }


@router.post("/refresh", response_model=OperationalLoginResponse)
def refresh_operational(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao expirada")

    email = _decode_operational_refresh_token(refresh_token)
    snapshot = _get_or_create_snapshot(db)
    data = _prepare_data_for_storage(snapshot.data, snapshot.data)
    if data != snapshot.data:
        snapshot.data = data
        db.commit()
        db.refresh(snapshot)

    user = _find_user(data, email)
    if not user or user.get("status") != "Ativo":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao expirada")

    _set_auth_cookies(response, email, request.cookies.get(REMEMBER_COOKIE_NAME) == "true", request)
    return {
        "session_idle_timeout_minutes": settings.session_idle_timeout_minutes,
        "user": _sanitize_user(user),
    }


@router.post("/logout")
def logout_operational(request: Request, response: Response):
    _clear_auth_cookies(response, request)
    return {"status": "ok"}


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


@router.put("/price-lists/{price_id}")
def save_price_list_record(
    price_id: str,
    payload: OperationalPriceListPayload,
    _: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    snapshot = _get_or_create_snapshot(db)
    current_data = _prepare_data_for_storage(snapshot.data, snapshot.data)
    price = _prepare_price_list_record(payload.data, price_id)
    price_lists = list(current_data.get("priceLists") or [])
    exists = False
    next_price_lists = []
    for item in price_lists:
        if str(item.get("id") or "") == str(price["id"]):
            next_price_lists.append(price)
            exists = True
        else:
            next_price_lists.append(item)
    if not exists:
        next_price_lists.append(price)

    snapshot.data = _prepare_data_for_storage({**current_data, "priceLists": next_price_lists}, snapshot.data)
    db.commit()
    db.refresh(snapshot)
    return {"data": price, "updated_at": snapshot.updated_at}


@router.delete("/price-lists/{price_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_price_list_record(
    price_id: str,
    _: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    snapshot = _get_or_create_snapshot(db)
    current_data = _prepare_data_for_storage(snapshot.data, snapshot.data)
    next_price_lists = [
        item for item in list(current_data.get("priceLists") or [])
        if str(item.get("id") or "") != str(price_id)
    ]
    snapshot.data = _prepare_data_for_storage({**current_data, "priceLists": next_price_lists}, snapshot.data)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
