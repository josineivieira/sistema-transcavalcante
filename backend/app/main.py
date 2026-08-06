from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.middleware import CorrelationIdMiddleware, SecurityHeadersMiddleware

configure_logging()

def allowed_cors_origins() -> list[str]:
    origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sistema-transcavalcante-1.onrender.com",
        settings.app_url.rstrip("/"),
        *[origin.rstrip("/") for origin in settings.cors_origins],
    }
    return sorted(origin for origin in origins if origin)


app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    return {"status": "ready"}


@app.get("/metrics")
def metrics():
    return {"metrics": {"placeholder": 1}}
