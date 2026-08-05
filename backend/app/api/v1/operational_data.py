from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.operational_data import OperationalSnapshot

router = APIRouter()

DEFAULT_COMPANY_KEY = "transcavalcante"


class OperationalDataPayload(BaseModel):
    data: dict = Field(default_factory=dict)


@router.get("")
def get_operational_data(db: Session = Depends(get_db)):
    snapshot = db.query(OperationalSnapshot).filter_by(company_key=DEFAULT_COMPANY_KEY).first()
    if snapshot is None:
        return {"data": None}
    return {"data": snapshot.data, "updated_at": snapshot.updated_at}


@router.put("")
def save_operational_data(payload: OperationalDataPayload, db: Session = Depends(get_db)):
    snapshot = db.query(OperationalSnapshot).filter_by(company_key=DEFAULT_COMPANY_KEY).first()
    if snapshot is None:
        snapshot = OperationalSnapshot(company_key=DEFAULT_COMPANY_KEY, data=payload.data)
        db.add(snapshot)
    else:
        snapshot.data = payload.data

    db.commit()
    db.refresh(snapshot)
    return {"data": snapshot.data, "updated_at": snapshot.updated_at}
