from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário inativo")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_payload = jwt.decode(payload.refresh_token, settings.jwt_secret, algorithms=["HS256"])
        if token_payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Refresh token inválido")
        user_id: str | None = token_payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Refresh token inválido")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Refresh token inválido") from exc

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/logout")
def logout():
    return {"status": "ok"}
