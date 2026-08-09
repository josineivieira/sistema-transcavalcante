from copy import deepcopy
from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.operational_data import _find_user, _get_or_create_snapshot, _require_operational_auth
from app.database.session import get_db
from app.models.company import Company
from app.models.customer import Customer
from app.models.freight import Freight, FreightTask

router = APIRouter()


class OperationalFreightPayload(BaseModel):
    data: dict = Field(default_factory=dict)


def _require_permission(db: Session, email: str, permission: str) -> dict:
    snapshot = _get_or_create_snapshot(db)
    user = _find_user(snapshot.data, email)
    if not user or user.get("status") != "Ativo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario sem acesso")

    current = user.get("permissions", {}).get("freights", "none")
    if permission == "view" and current in {"view", "edit"}:
        return user
    if permission == "edit" and current == "edit":
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissao para fretes")


def _digits(value: str | None) -> str:
    return "".join(char for char in str(value or "") if char.isdigit())


def _decimal(value: object) -> Decimal:
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    normalized = str(value or "0").replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return Decimal(normalized or "0")
    except InvalidOperation:
        return Decimal("0")


def _state_from_city(value: str | None) -> str:
    text = str(value or "")
    if "/" in text:
        state = text.rsplit("/", 1)[-1].strip().upper()
        if len(state) == 2:
            return state
    return "AM"


def _city_from_value(value: str | None) -> str:
    text = str(value or "").strip()
    if "/" in text:
        return text.rsplit("/", 1)[0].strip() or "Manaus"
    return text or "Manaus"


def _get_company(db: Session, payload: dict) -> Company:
    document = payload.get("serviceTakerDocument") or "10.872.023/0001-40"
    cnpj = _digits(str(document))[:14] or "10872023000140"
    formatted = payload.get("serviceTakerDocument") or cnpj
    company = db.query(Company).filter(Company.cnpj.in_([formatted, cnpj])).first()
    if company:
        return company

    company = Company(
        name=payload.get("serviceTaker") or "TRANSCAVALCANTE TRANSPORTES DE CARGAS LTDA",
        trade_name="TRANSCAVALCANTE",
        cnpj=formatted,
        email=None,
        phone=None,
    )
    db.add(company)
    db.flush()
    return company


def _get_customer(db: Session, company_id: UUID, payload: dict) -> Customer:
    document = str(payload.get("recipientDocument") or payload.get("senderDocument") or "00000000000000")
    name = str(payload.get("customer") or payload.get("recipient") or "Cliente sem cadastro")
    customer = db.query(Customer).filter(Customer.company_id == company_id, Customer.document == document).first()
    if customer:
        if customer.name != name:
            customer.name = name
        return customer

    customer = Customer(
        company_id=company_id,
        person_type="Juridica" if len(_digits(document)) > 11 else "Fisica",
        document=document,
        name=name,
        trade_name=name,
        email_fiscal=None,
        status="active",
    )
    db.add(customer)
    db.flush()
    return customer


def _task_to_dict(task: FreightTask) -> dict:
    return {
        "id": task.external_id,
        "name": task.name,
        "description": task.description,
        "status": task.status,
        "sendToCustomer": task.send_to_customer,
        "startDate": task.start_date,
        "endDate": task.end_date,
        "completionPercent": task.completion_percent,
        "internalUse": task.internal_use,
        "time": task.time_label,
        "user": task.user_name,
    }


def _freight_to_dict(freight: Freight, tasks: list[FreightTask]) -> dict:
    payload = deepcopy(freight.payload or {})
    payload.update({
        "id": freight.external_id or str(freight.id),
        "number": freight.internal_number,
        "date": freight.execution_date.isoformat(),
        "customer": freight.customer_name or payload.get("customer", ""),
        "process": freight.process_number or payload.get("process", ""),
        "container": freight.container_number or payload.get("container", ""),
        "driver": freight.driver_name or payload.get("driver", ""),
        "tractorPlate": freight.tractor_plate or payload.get("tractorPlate", ""),
        "trailerPlate": freight.trailer_plate or payload.get("trailerPlate", ""),
        "origin": freight.origin_city if freight.origin_state in freight.origin_city else f"{freight.origin_city}/{freight.origin_state}",
        "destination": freight.destination_city if freight.destination_state in freight.destination_city else f"{freight.destination_city}/{freight.destination_state}",
        "value": float(freight.total_value),
        "operationalStatus": freight.operational_status,
        "fiscalStatus": freight.fiscal_status,
        "sender": freight.sender_name or payload.get("sender", ""),
        "senderDocument": freight.sender_document or payload.get("senderDocument", ""),
        "recipient": freight.recipient_name or payload.get("recipient", ""),
        "recipientDocument": freight.recipient_document or payload.get("recipientDocument", ""),
        "taskHistory": [_task_to_dict(task) for task in tasks],
    })
    return payload


def _sync_tasks(db: Session, freight: Freight, task_history: list[dict]) -> None:
    existing = {task.external_id: task for task in db.query(FreightTask).filter(FreightTask.freight_id == freight.id).all()}
    incoming_ids = set()
    for item in task_history:
        external_id = str(item.get("id") or item.get("name") or "")
        if not external_id:
            continue
        incoming_ids.add(external_id)
        task = existing.get(external_id) or FreightTask(company_id=freight.company_id, freight_id=freight.id, external_id=external_id)
        task.name = str(item.get("name") or "")
        task.description = str(item.get("description") or "")
        task.status = str(item.get("status") or "ENCERRADO")
        task.send_to_customer = str(item.get("sendToCustomer") or "N")
        task.start_date = str(item.get("startDate") or "")
        task.end_date = str(item.get("endDate") or "")
        task.completion_percent = int(float(item.get("completionPercent") or 0))
        task.internal_use = str(item.get("internalUse") or "N")
        task.time_label = str(item.get("time") or "")
        task.user_name = str(item.get("user") or "")
        db.add(task)

    for external_id, task in existing.items():
        if external_id not in incoming_ids:
            db.delete(task)


def _date_from_payload(value: object, fallback: date | None = None) -> date:
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value or ""))
    except ValueError:
        return fallback or date.today()


def _upsert_freight_data(db: Session, data: dict) -> Freight:
    external_id = str(data.get("id") or data.get("number") or data.get("process") or "").strip()
    if not external_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Frete sem identificador")

    company = _get_company(db, data)
    customer = _get_customer(db, company.id, data)
    freight = db.query(Freight).filter(Freight.company_id == company.id, Freight.external_id == external_id).first()
    if freight is None:
        freight = Freight(
            company_id=company.id,
            customer_id=customer.id,
            external_id=external_id,
            internal_number=str(data.get("number") or data.get("process") or external_id),
            service_type=str(data.get("product") or data.get("processType") or "Frete"),
            execution_date=_date_from_payload(data.get("date")),
            origin_city=_city_from_value(data.get("origin")),
            origin_state=_state_from_city(data.get("origin")),
            destination_city=_city_from_value(data.get("destination")),
            destination_state=_state_from_city(data.get("destination")),
            total_value=_decimal(data.get("value")),
        )
        db.add(freight)

    freight.customer_id = customer.id
    freight.internal_number = str(data.get("number") or freight.internal_number or external_id)
    freight.process_number = str(data.get("process") or "")
    freight.container_number = str(data.get("container") or "")
    freight.service_type = str(data.get("product") or data.get("processType") or "Frete")
    freight.execution_date = _date_from_payload(data.get("date"), freight.execution_date)
    freight.origin_city = _city_from_value(data.get("origin"))
    freight.origin_state = _state_from_city(data.get("origin"))
    freight.destination_city = _city_from_value(data.get("destination"))
    freight.destination_state = _state_from_city(data.get("destination"))
    freight.total_value = _decimal(data.get("value"))
    freight.operational_status = str(data.get("operationalStatus") or data.get("status") or "Em digitacao")
    freight.fiscal_status = str(data.get("fiscalStatus") or "Pendente")
    freight.approved_for_billing = freight.operational_status == "Aprovado para faturamento"
    freight.customer_name = str(data.get("customer") or "")
    freight.sender_name = str(data.get("sender") or "")
    freight.sender_document = str(data.get("senderDocument") or "")
    freight.recipient_name = str(data.get("recipient") or "")
    freight.recipient_document = str(data.get("recipientDocument") or "")
    freight.driver_name = str(data.get("driver") or "")
    freight.tractor_plate = str(data.get("tractorPlate") or "")
    freight.trailer_plate = str(data.get("trailerPlate") or "")
    freight.payload = data
    db.flush()
    _sync_tasks(db, freight, list(data.get("taskHistory") or []))
    return freight


def _migrate_legacy_freights(db: Session) -> None:
    snapshot = _get_or_create_snapshot(db)
    legacy_freights = list(snapshot.data.get("freights") or [])
    if not legacy_freights:
        return

    deleted_ids = set(snapshot.data.get("deletedFreightIds") or [])
    for freight_data in legacy_freights:
        if isinstance(freight_data, dict):
            legacy_id = str(freight_data.get("id") or "")
            legacy_process = str(freight_data.get("process") or "")
            legacy_number = str(freight_data.get("number") or "")
            if legacy_id in deleted_ids or legacy_process in deleted_ids or legacy_number in deleted_ids:
                continue
            _upsert_freight_data(db, deepcopy(freight_data))

    snapshot.data = {**snapshot.data, "freights": []}
    db.commit()


def _remember_deleted_freight(db: Session, identifiers: list[str]) -> None:
    snapshot = _get_or_create_snapshot(db)
    deleted_ids = set(snapshot.data.get("deletedFreightIds") or [])
    deleted_ids.update(identifier for identifier in identifiers if identifier)
    snapshot.data = {**snapshot.data, "deletedFreightIds": sorted(deleted_ids)}


@router.get("")
def list_operational_freights(
    search: str = "",
    status_filter: str = Query("", alias="status"),
    process_number: str = "",
    process_code: str = "",
    date_start: str = "",
    date_end: str = "",
    process_description: str = "",
    supplier: str = "",
    process_type: str = "",
    container: str = "",
    origin_date_start: str = "",
    origin_date_end: str = "",
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    email: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    _require_permission(db, email, "view")
    _migrate_legacy_freights(db)
    snapshot = _get_or_create_snapshot(db)
    deleted_ids = set(snapshot.data.get("deletedFreightIds") or [])
    query = db.query(Freight).filter(Freight.external_id.isnot(None))
    if deleted_ids:
        query = query.filter(
            ~Freight.external_id.in_(deleted_ids),
            or_(Freight.process_number.is_(None), ~Freight.process_number.in_(deleted_ids)),
            ~Freight.internal_number.in_(deleted_ids),
        )
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            Freight.internal_number.ilike(like),
            Freight.process_number.ilike(like),
            Freight.customer_name.ilike(like),
            Freight.sender_name.ilike(like),
            Freight.recipient_name.ilike(like),
            Freight.container_number.ilike(like),
        ))
    if status_filter:
        query = query.filter(Freight.operational_status.ilike(f"%{status_filter}%"))
    if process_number:
        query = query.filter(Freight.internal_number.ilike(f"%{process_number}%"))
    if process_code:
        query = query.filter(Freight.process_number.ilike(f"%{process_code}%"))
    if process_description:
        like = f"%{process_description}%"
        query = query.filter(or_(
            Freight.customer_name.ilike(like),
            Freight.sender_name.ilike(like),
            Freight.recipient_name.ilike(like),
            Freight.origin_city.ilike(like),
            Freight.destination_city.ilike(like),
        ))
    if supplier:
        like = f"%{supplier}%"
        query = query.filter(or_(
            Freight.customer_name.ilike(like),
            Freight.sender_name.ilike(like),
            Freight.recipient_name.ilike(like),
        ))
    if process_type:
        query = query.filter(Freight.service_type.ilike(f"%{process_type}%"))
    if container:
        query = query.filter(Freight.container_number.ilike(f"%{container}%"))

    parsed_date_start = _date_from_payload(date_start, None) if date_start else None
    parsed_date_end = _date_from_payload(date_end, None) if date_end else None
    parsed_origin_start = _date_from_payload(origin_date_start, None) if origin_date_start else None
    parsed_origin_end = _date_from_payload(origin_date_end, None) if origin_date_end else None
    if parsed_date_start:
        query = query.filter(Freight.execution_date >= parsed_date_start)
    if parsed_date_end:
        query = query.filter(Freight.execution_date <= parsed_date_end)
    if parsed_origin_start:
        query = query.filter(Freight.execution_date >= parsed_origin_start)
    if parsed_origin_end:
        query = query.filter(Freight.execution_date <= parsed_origin_end)

    total = query.count()
    freights = query.order_by(Freight.execution_date.desc(), Freight.internal_number.desc()).offset(offset).limit(limit).all()
    freight_ids = [freight.id for freight in freights]
    tasks_by_freight: dict[UUID, list[FreightTask]] = {freight.id: [] for freight in freights}
    if freight_ids:
        for task in db.query(FreightTask).filter(FreightTask.freight_id.in_(freight_ids)).order_by(FreightTask.created_at.desc()).all():
            tasks_by_freight.setdefault(task.freight_id, []).append(task)

    return {
        "items": [_freight_to_dict(freight, tasks_by_freight.get(freight.id, [])) for freight in freights],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.put("/{external_id}")
def upsert_operational_freight(
    external_id: str,
    payload: OperationalFreightPayload,
    email: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    _require_permission(db, email, "edit")
    data = deepcopy(payload.data)
    data["id"] = external_id
    freight = _upsert_freight_data(db, data)
    db.commit()
    db.refresh(freight)
    tasks = db.query(FreightTask).filter(FreightTask.freight_id == freight.id).order_by(FreightTask.created_at.desc()).all()
    return {"data": _freight_to_dict(freight, tasks)}


@router.delete("/{external_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operational_freight(
    external_id: str,
    email: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    _require_permission(db, email, "edit")
    freight = db.query(Freight).filter(or_(
        Freight.external_id == external_id,
        Freight.process_number == external_id,
        Freight.internal_number == external_id,
    )).first()
    if freight is None:
        _remember_deleted_freight(db, [external_id])
        db.commit()
        return None

    identifiers = [freight.external_id or "", freight.process_number or "", freight.internal_number or "", external_id]
    _remember_deleted_freight(db, identifiers)
    try:
        db.query(FreightTask).filter(FreightTask.freight_id == freight.id).delete(synchronize_session=False)
        db.delete(freight)
        db.commit()
    except IntegrityError:
        db.rollback()
        _remember_deleted_freight(db, identifiers)
        db.commit()
    return None
