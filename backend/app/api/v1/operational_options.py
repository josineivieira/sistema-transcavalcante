from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.operational_data import _get_or_create_snapshot, _require_operational_auth
from app.database.session import get_db

router = APIRouter()


def _matches(value: object, search: str) -> bool:
    if not search:
        return True
    return search.lower() in str(value or "").lower()


def _limit_rows(rows: list[dict], limit: int) -> list[dict]:
    return rows[: max(1, min(limit, 200))]


@router.get("/freight-form")
def list_freight_form_options(
    search: str = "",
    limit: int = Query(80, ge=1, le=200),
    _: str = Depends(_require_operational_auth),
    db: Session = Depends(get_db),
):
    snapshot = _get_or_create_snapshot(db)
    data = snapshot.data or {}

    customers = [
        {
            "id": str(customer.get("id") or customer.get("document") or customer.get("name") or ""),
            "name": str(customer.get("name") or customer.get("tradeName") or ""),
            "document": str(customer.get("document") or ""),
        }
        for customer in data.get("customers", [])
        if customer.get("status") != "Inativo" and _matches(customer.get("name") or customer.get("tradeName"), search)
    ]

    drivers = [
        {
            "id": str(driver.get("id") or driver.get("cpf") or driver.get("name") or ""),
            "name": str(driver.get("name") or ""),
        }
        for driver in data.get("drivers", [])
        if driver.get("status") != "Inativo" and _matches(driver.get("name"), search)
    ]

    tractors = [
        {
            "id": str(vehicle.get("id") or vehicle.get("tractorPlate") or ""),
            "plate": str(vehicle.get("tractorPlate") or ""),
            "description": str(vehicle.get("description") or vehicle.get("type") or vehicle.get("fleetType") or ""),
        }
        for vehicle in data.get("vehicles", [])
        if vehicle.get("status") != "Inativo"
        and vehicle.get("vehicleType") == "Cavalo"
        and vehicle.get("tractorPlate")
        and _matches(f"{vehicle.get('tractorPlate', '')} {vehicle.get('description', '')} {vehicle.get('type', '')}", search)
    ]

    trailers = [
        {
            "id": str(vehicle.get("id") or vehicle.get("trailerPlate") or ""),
            "plate": str(vehicle.get("trailerPlate") or ""),
            "description": str(vehicle.get("description") or vehicle.get("type") or vehicle.get("fleetType") or ""),
        }
        for vehicle in data.get("vehicles", [])
        if vehicle.get("status") != "Inativo"
        and vehicle.get("vehicleType") == "Carreta"
        and vehicle.get("trailerPlate")
        and _matches(f"{vehicle.get('trailerPlate', '')} {vehicle.get('description', '')} {vehicle.get('type', '')}", search)
    ]

    product_map: dict[str, dict] = {}
    suppliers: dict[str, dict] = {}
    for price in data.get("priceLists", []):
        if price.get("status") == "Inativo":
            continue
        product = str(price.get("product") or "").strip()
        if product and _matches(product, search):
            product_map.setdefault(product, {"value": product, "label": product})
        supplier = str(price.get("listName") or "").strip()
        if supplier and _matches(supplier, search):
            suppliers.setdefault(supplier, {"value": supplier, "label": supplier})

    return {
        "customers": _limit_rows(sorted(customers, key=lambda item: item["name"]), limit),
        "drivers": _limit_rows(sorted(drivers, key=lambda item: item["name"]), limit),
        "tractors": _limit_rows(sorted(tractors, key=lambda item: item["plate"]), limit),
        "trailers": _limit_rows(sorted(trailers, key=lambda item: item["plate"]), limit),
        "products": _limit_rows(sorted(product_map.values(), key=lambda item: item["label"]), limit),
        "suppliers": _limit_rows(sorted(suppliers.values(), key=lambda item: item["label"]), limit),
    }
