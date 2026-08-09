import re

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.operational_data import _get_or_create_snapshot, _require_operational_auth
from app.database.session import get_db

router = APIRouter()


class RouteDestinationRequest(BaseModel):
    zip_code: str = ""
    address: str = ""
    district: str = ""
    city: str = ""
    state: str = ""


def _digits(value: str) -> str:
    return "".join(char for char in str(value or "") if char.isdigit())


def _clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _format_zip_code(value: str) -> str:
    digits = _digits(value)[:8]
    if len(digits) == 8:
        return f"{digits[:5]}-{digits[5:]}"
    return str(value or "").strip()


def _safe_float(value: object) -> str:
    text = str(value or "").strip()
    return text.replace(".", ",") if text else "0,0000000"


def _lookup_zip_code(zip_code: str) -> dict:
    digits = _digits(zip_code)
    if len(digits) != 8:
        return {}
    try:
        response = httpx.get(f"https://viacep.com.br/ws/{digits}/json/", timeout=4.0)
        response.raise_for_status()
        data = response.json()
        if data.get("erro"):
            return {}
        return {
            "zipCode": _format_zip_code(str(data.get("cep") or digits)),
            "address": _clean_text(data.get("logradouro")),
            "district": _clean_text(data.get("bairro")),
            "city": _clean_text(data.get("localidade")),
            "state": _clean_text(data.get("uf")).upper(),
        }
    except Exception:
        return {}


def _lookup_coordinates(address: str, district: str, city: str, state: str, zip_code: str) -> dict:
    queries = [
        ", ".join(part for part in [address, district, city, state, zip_code, "Brasil"] if part),
        ", ".join(part for part in [zip_code, city, state, "Brasil"] if part),
        ", ".join(part for part in [city, state, "Brasil"] if part),
    ]
    queries = [query for index, query in enumerate(queries) if query.strip(", ") and query not in queries[:index]]
    if not queries:
        return {}
    for query in queries:
        try:
            response = httpx.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1, "addressdetails": 0},
                headers={"User-Agent": "transcavalcante-operational-system/1.0"},
                timeout=5.0,
            )
            response.raise_for_status()
            rows = response.json()
            if rows:
                first = rows[0]
                return {
                    "latitude": _safe_float(first.get("lat")),
                    "longitude": _safe_float(first.get("lon")),
                }
        except Exception:
            continue
    return {}


def _matches(value: object, search: str) -> bool:
    if not search:
        return True
    return search.lower() in str(value or "").lower()


def _limit_rows(rows: list[dict], limit: int) -> list[dict]:
    return rows[: max(1, min(limit, 200))]


@router.post("/route-destination")
def resolve_route_destination(
    payload: RouteDestinationRequest,
    _: str = Depends(_require_operational_auth),
):
    zip_data = _lookup_zip_code(payload.zip_code)
    address = zip_data.get("address", "") or _clean_text(payload.address)
    district = zip_data.get("district", "") or _clean_text(payload.district)
    city = zip_data.get("city", "") or _clean_text(payload.city)
    state = zip_data.get("state", "") or _clean_text(payload.state).upper()
    zip_code = zip_data.get("zipCode", "") or _format_zip_code(payload.zip_code)
    coordinates = _lookup_coordinates(address, district, city, state, zip_code)

    destination = f"{city}/{state}" if city and state else city or state
    return {
        "destination": destination,
        "address": address,
        "district": district,
        "zipCode": zip_code,
        "city": city,
        "state": state,
        "latitude": coordinates.get("latitude", "0,0000000"),
        "longitude": coordinates.get("longitude", "0,0000000"),
    }


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
