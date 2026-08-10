from fastapi import APIRouter
from app.api.v1 import auth, companies, users, customers, freights, closings, fiscal_documents, operational_data, operational_freights, operational_options

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(freights.router, prefix="/freights", tags=["freights"])
api_router.include_router(closings.router, prefix="/closings", tags=["closings"])
api_router.include_router(fiscal_documents.router, prefix="/fiscal-documents", tags=["fiscal-documents"])
api_router.include_router(operational_data.router, prefix="/operational-data", tags=["operational-data"])
api_router.include_router(operational_freights.router, prefix="/operational-freights", tags=["operational-freights"])
api_router.include_router(operational_options.router, prefix="/operational-options", tags=["operational-options"])
