from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import enforce_company_access, is_general_admin, require_roles
from app.core.security import get_password_hash
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate

router = APIRouter()


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin")),
):
    query = db.query(User)
    if not is_general_admin(user):
        query = query.filter(User.company_id == user.company_id)
    return query.order_by(User.full_name.asc()).all()


@router.post("")
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("general_admin", "company_admin")),
):
    if not is_general_admin(user):
        if payload.company_id is None:
            payload.company_id = user.company_id
        enforce_company_access(user, payload.company_id)
        if payload.role == "general_admin":
            raise HTTPException(status_code=403, detail="Administrador da empresa não pode criar administrador geral")

    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    new_user = User(
        company_id=payload.company_id,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
