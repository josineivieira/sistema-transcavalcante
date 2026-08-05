from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.database.session import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate

router = APIRouter()


@router.get("")
def list_companies(db: Session = Depends(get_db), _=Depends(require_roles("general_admin"))):
    return db.query(Company).all()


@router.post("")
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), _=Depends(require_roles("general_admin"))):
    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company
