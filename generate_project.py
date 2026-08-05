from pathlib import Path
import textwrap

ROOT = Path('/home/user/container-freight-manager')

files = {
    '.gitignore': '''
__pycache__/
*.pyc
.env
.env.*
node_modules/
dist/
.venv/
.pytest_cache/
.mypy_cache/
coverage.xml
htmlcov/
backend/.pytest_cache/
frontend/.vite/
''',
    'README.md': '''
# Container Freight Manager

Sistema web para gestão de fretes, fechamentos, faturamento e base para emissão fiscal real (NFS-e/CT-e) com arquitetura multiempresa.

## Status desta entrega

Esta base entrega:
- monorepo com `frontend` + `backend`
- autenticação JWT com refresh token e RBAC inicial
- multiempresa com `company_id`
- módulos iniciais: empresas, usuários, clientes, fretes, fechamentos, documentos fiscais
- provedor fiscal `mock` desacoplado por adapter
- PostgreSQL + Redis + worker + Nginx + S3 compatível por configuração
- auditoria, logs estruturados, health/readiness/metrics
- Docker e Docker Compose
- Alembic com migration inicial
- testes iniciais
- documentação operacional inicial

## Limite importante

A emissão fiscal **real em produção** depende de:
1. credenciamento da empresa;
2. certificado A1 válido;
3. provedor/município escolhido para NFS-e;
4. schemas e regras oficiais vigentes do CT-e;
5. homologação concluída;
6. validação do contador.

Por isso, esta entrega já deixa a arquitetura pronta, o fluxo correto e o provedor `mock` funcional, mas **não inventa endpoints fiscais reais**.

## Estrutura

```text
backend/   API FastAPI + SQLAlchemy + Alembic + worker
frontend/  React + Vite + Tailwind
infra/     nginx, deploy e docs auxiliares
```

## Executar com Docker

```bash
docker compose up --build
```

Serviços esperados:
- Front-end: http://localhost:3000
- API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs

## Variáveis de ambiente

Copie:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Banco e migrations

```bash
docker compose exec api alembic upgrade head
```

## Testes

```bash
docker compose exec api pytest -q
```

## Próximos passos obrigatórios antes de produção

- finalizar provedores reais NFS-e por município/provedor contratado;
- finalizar camada CT-e contra schemas e notas técnicas vigentes;
- conectar armazenamento S3 real;
- configurar SMTP real;
- configurar observabilidade externa;
- executar hardening e pentest;
- validar regras fiscais com contador.
''',
    'docker-compose.yml': '''
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: freightdb
      POSTGRES_USER: freight
      POSTGRES_PASSWORD: freight
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./backend
    env_file:
      - ./backend/.env.example
    depends_on:
      - postgres
      - redis
    ports:
      - "8000:8000"

  worker:
    build:
      context: ./backend
    env_file:
      - ./backend/.env.example
    depends_on:
      - postgres
      - redis
    command: ["python", "-m", "app.tasks.worker"]

  frontend:
    build:
      context: ./frontend
    env_file:
      - ./frontend/.env.example
    depends_on:
      - api
    ports:
      - "3000:3000"

  nginx:
    image: nginx:1.27-alpine
    depends_on:
      - api
      - frontend
    ports:
      - "8080:80"
    volumes:
      - ./infra/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro

volumes:
  postgres_data:
''',
    'infra/nginx/default.conf': '''
server {
  listen 80;

  location /api/ {
    proxy_pass http://api:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /docs {
    proxy_pass http://api:8000/docs;
  }

  location /openapi.json {
    proxy_pass http://api:8000/openapi.json;
  }

  location / {
    proxy_pass http://frontend:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
''',
    'backend/.env.example': '''
APP_ENV=development
APP_NAME=Container Freight Manager
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
API_V1_PREFIX=/api/v1
SECRET_KEY=change-me
JWT_SECRET=change-me-too
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=postgresql+psycopg://freight:freight@postgres:5432/freightdb
REDIS_URL=redis://redis:6379/0
ENCRYPTION_KEY=change-me-encryption
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=fiscal@example.com
FISCAL_DEFAULT_PROVIDER=mock
FISCAL_ENVIRONMENT=homologation
ENABLE_NFSE=true
ENABLE_CTE=true
ENABLE_MDFE=false
ALLOW_MOCK_IN_PRODUCTION=false
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]
''',
    'backend/requirements.txt': '''
fastapi==0.116.1
uvicorn[standard]==0.35.0
sqlalchemy==2.0.43
alembic==1.16.4
psycopg[binary]==3.2.9
pydantic==2.11.7
pydantic-settings==2.10.1
python-jose[cryptography]==3.5.0
passlib[argon2]==1.7.4
argon2-cffi==25.1.0
python-multipart==0.0.20
structlog==25.4.0
redis==6.4.0
fakeredis==2.31.0
httpx==0.28.1
pytest==8.4.1
pytest-asyncio==1.1.0
''',
    'backend/Dockerfile': '''
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
''',
    'backend/alembic.ini': '''
[alembic]
script_location = migrations
sqlalchemy.url = postgresql+psycopg://freight:freight@postgres:5432/freightdb

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers = console
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
''',
    'backend/migrations/env.py': '''
from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
from app.core.config import settings
from app.database.base import Base
from app import models  # noqa

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
''',
    'backend/migrations/script.py.mako': '''
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
''',
    'backend/migrations/versions/20260804_0001_initial.py': '''
"""initial schema"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260804_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trade_name", sa.String(255), nullable=True),
        sa.Column("cnpj", sa.String(18), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("person_type", sa.String(20), nullable=False),
        sa.Column("document", sa.String(18), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trade_name", sa.String(255), nullable=True),
        sa.Column("email_fiscal", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_customers_company_document", "customers", ["company_id", "document"], unique=True)
    op.create_table(
        "freights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("internal_number", sa.String(50), nullable=False),
        sa.Column("process_number", sa.String(100), nullable=True),
        sa.Column("container_number", sa.String(20), nullable=True),
        sa.Column("service_type", sa.String(100), nullable=False),
        sa.Column("execution_date", sa.Date(), nullable=False),
        sa.Column("origin_city", sa.String(120), nullable=False),
        sa.Column("origin_state", sa.String(2), nullable=False),
        sa.Column("destination_city", sa.String(120), nullable=False),
        sa.Column("destination_state", sa.String(2), nullable=False),
        sa.Column("total_value", sa.Numeric(14, 2), nullable=False),
        sa.Column("operational_status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("fiscal_status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("approved_for_billing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_freights_company_internal_number", "freights", ["company_id", "internal_number"], unique=True)
    op.create_table(
        "closings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("number", sa.String(50), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="preparing"),
        sa.Column("subtotal", sa.Numeric(14, 2), nullable=False),
        sa.Column("discounts", sa.Numeric(14, 2), nullable=False),
        sa.Column("additions", sa.Numeric(14, 2), nullable=False),
        sa.Column("net_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_closings_company_number", "closings", ["company_id", "number"], unique=True)
    op.create_table(
        "closing_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("closing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("closings.id"), nullable=False),
        sa.Column("freight_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("freights.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_closing_items_unique", "closing_items", ["closing_id", "freight_id"], unique=True)
    op.create_table(
        "fiscal_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("closing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("closings.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("fiscal_type", sa.String(20), nullable=False),
        sa.Column("environment", sa.String(20), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("number", sa.String(50), nullable=True),
        sa.Column("series", sa.String(10), nullable=True),
        sa.Column("reference", sa.String(120), nullable=True),
        sa.Column("protocol", sa.String(120), nullable=True),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column("raw_response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fiscal_documents_idempotency", "fiscal_documents", ["company_id", "idempotency_key"], unique=True)
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(120), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("before_data", sa.JSON(), nullable=True),
        sa.Column("after_data", sa.JSON(), nullable=True),
        sa.Column("correlation_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_index("ix_fiscal_documents_idempotency", table_name="fiscal_documents")
    op.drop_table("fiscal_documents")
    op.drop_index("ix_closing_items_unique", table_name="closing_items")
    op.drop_table("closing_items")
    op.drop_index("ix_closings_company_number", table_name="closings")
    op.drop_table("closings")
    op.drop_index("ix_freights_company_internal_number", table_name="freights")
    op.drop_table("freights")
    op.drop_index("ix_customers_company_document", table_name="customers")
    op.drop_table("customers")
    op.drop_table("users")
    op.drop_table("companies")
''',
    'backend/app/__init__.py': '',
    'backend/app/main.py': '''
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.middleware import CorrelationIdMiddleware

configure_logging()

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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
''',
    'backend/app/core/config.py': '''
from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_name: str = "Container Freight Manager"
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    jwt_secret: str = "change-me-too"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    database_url: str = "sqlite:///./app.db"
    redis_url: str = "redis://localhost:6379/0"
    encryption_key: str = "change-me-encryption"
    fiscal_default_provider: str = "mock"
    fiscal_environment: Literal["mock", "homologation", "production"] = "homologation"
    enable_nfse: bool = True
    enable_cte: bool = True
    enable_mdfe: bool = False
    allow_mock_in_production: bool = False
    cors_origins: List[str] = ["http://localhost:3000"]


settings = Settings()
''',
    'backend/app/core/security.py': '''
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": subject, "exp": expire, "type": token_type}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    return create_token(subject, timedelta(minutes=settings.access_token_expire_minutes), "access")


def create_refresh_token(subject: str) -> str:
    return create_token(subject, timedelta(days=settings.refresh_token_expire_days), "refresh")
''',
    'backend/app/core/logging.py': '''
import logging
import structlog


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    )
''',
    'backend/app/core/middleware.py': '''
import uuid
from starlette.middleware.base import BaseHTTPMiddleware


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response
''',
    'backend/app/database/base.py': '''
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
''',
    'backend/app/database/session.py': '''
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
''',
    'backend/app/models/mixins.py': '''
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
''',
    'backend/app/models/company.py': '''
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Company(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255))
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
''',
    'backend/app/models/user.py': '''
import uuid
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="company_admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
''',
    'backend/app/models/customer.py': '''
import uuid
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Customer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "customers"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    person_type: Mapped[str] = mapped_column(String(20))
    document: Mapped[str] = mapped_column(String(18))
    name: Mapped[str] = mapped_column(String(255))
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_fiscal: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
''',
    'backend/app/models/freight.py': '''
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Freight(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "freights"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    internal_number: Mapped[str] = mapped_column(String(50))
    process_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    container_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    service_type: Mapped[str] = mapped_column(String(100))
    execution_date: Mapped[date] = mapped_column(Date)
    origin_city: Mapped[str] = mapped_column(String(120))
    origin_state: Mapped[str] = mapped_column(String(2))
    destination_city: Mapped[str] = mapped_column(String(120))
    destination_state: Mapped[str] = mapped_column(String(2))
    total_value: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    operational_status: Mapped[str] = mapped_column(String(30), default="draft")
    fiscal_status: Mapped[str] = mapped_column(String(30), default="pending")
    approved_for_billing: Mapped[bool] = mapped_column(Boolean, default=False)
''',
    'backend/app/models/closing.py': '''
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Closing(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "closings"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    number: Mapped[str] = mapped_column(String(50))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="preparing")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    discounts: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    additions: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    net_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)


class ClosingItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "closing_items"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    closing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("closings.id"))
    freight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("freights.id"))
''',
    'backend/app/models/fiscal_document.py': '''
import uuid
from decimal import Decimal
from sqlalchemy import ForeignKey, JSON, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class FiscalDocument(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fiscal_documents"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    closing_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("closings.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    fiscal_type: Mapped[str] = mapped_column(String(20))
    environment: Mapped[str] = mapped_column(String(20))
    provider: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="draft")
    number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    series: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    protocol: Mapped[str | None] = mapped_column(String(120), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
''',
    'backend/app/models/audit_log.py': '''
import uuid
from sqlalchemy import JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String(50))
    entity: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(120))
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    before_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
''',
    'backend/app/models/__init__.py': '''
from app.models.company import Company
from app.models.user import User
from app.models.customer import Customer
from app.models.freight import Freight
from app.models.closing import Closing, ClosingItem
from app.models.fiscal_document import FiscalDocument
from app.models.audit_log import AuditLog
''',
    'backend/app/schemas/auth.py': '''
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
''',
    'backend/app/schemas/company.py': '''
from uuid import UUID
from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    trade_name: str | None = None
    cnpj: str
    email: str | None = None
    phone: str | None = None


class CompanyRead(CompanyCreate):
    id: UUID
''',
    'backend/app/schemas/user.py': '''
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    company_id: UUID | None = None
    email: EmailStr
    full_name: str
    password: str
    role: str = "company_admin"


class UserRead(BaseModel):
    id: UUID
    company_id: UUID | None = None
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
''',
    'backend/app/schemas/customer.py': '''
from uuid import UUID
from pydantic import BaseModel


class CustomerCreate(BaseModel):
    company_id: UUID
    person_type: str
    document: str
    name: str
    trade_name: str | None = None
    email_fiscal: str | None = None


class CustomerRead(CustomerCreate):
    id: UUID
    status: str
''',
    'backend/app/schemas/freight.py': '''
from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class FreightCreate(BaseModel):
    company_id: UUID
    customer_id: UUID
    internal_number: str
    process_number: str | None = None
    container_number: str | None = None
    service_type: str
    execution_date: date
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str
    total_value: Decimal


class FreightRead(FreightCreate):
    id: UUID
    operational_status: str
    fiscal_status: str
    approved_for_billing: bool
''',
    'backend/app/schemas/closing.py': '''
from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class ClosingCreate(BaseModel):
    company_id: UUID
    customer_id: UUID
    period_start: date
    period_end: date
    freight_ids: list[UUID]


class ClosingRead(BaseModel):
    id: UUID
    company_id: UUID
    customer_id: UUID
    number: str
    period_start: date
    period_end: date
    status: str
    subtotal: Decimal
    discounts: Decimal
    additions: Decimal
    net_total: Decimal
''',
    'backend/app/schemas/fiscal.py': '''
from uuid import UUID
from pydantic import BaseModel


class FiscalIssueRequest(BaseModel):
    fiscal_type: str
    company_id: UUID
    closing_id: UUID
    customer_id: UUID


class FiscalDocumentRead(BaseModel):
    id: UUID
    fiscal_type: str
    environment: str
    provider: str
    status: str
    number: str | None = None
    series: str | None = None
    reference: str | None = None
    protocol: str | None = None
''',
    'backend/app/api/deps.py': '''
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*allowed_roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Sem permissão")
        return user
    return checker
''',
    'backend/app/api/router.py': '''
from fastapi import APIRouter
from app.api.v1 import auth, companies, users, customers, freights, closings, fiscal_documents

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(freights.router, prefix="/freights", tags=["freights"])
api_router.include_router(closings.router, prefix="/closings", tags=["closings"])
api_router.include_router(fiscal_documents.router, prefix="/fiscal-documents", tags=["fiscal-documents"])
''',
    'backend/app/api/v1/auth.py': '''
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
''',
    'backend/app/api/v1/companies.py': '''
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
''',
    'backend/app/api/v1/users.py': '''
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.core.security import get_password_hash
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate

router = APIRouter()


@router.get("")
def list_users(db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin"))):
    return db.query(User).all()


@router.post("")
def create_user(payload: UserCreate, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin"))):
    user = User(
        company_id=payload.company_id,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
''',
    'backend/app/api/v1/customers.py': '''
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.database.session import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate

router = APIRouter()


@router.get("")
def list_customers(db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing", "operations", "viewer"))):
    return db.query(Customer).all()


@router.post("")
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing"))):
    exists = db.query(Customer).filter(Customer.company_id == payload.company_id, Customer.document == payload.document).first()
    if exists:
        raise HTTPException(status_code=400, detail="Cliente já cadastrado para a empresa")
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer
''',
    'backend/app/api/v1/freights.py': '''
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.database.session import get_db
from app.models.freight import Freight
from app.schemas.freight import FreightCreate

router = APIRouter()


@router.get("")
def list_freights(db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing", "operations", "viewer"))):
    return db.query(Freight).all()


@router.post("")
def create_freight(payload: FreightCreate, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "operations"))):
    if payload.total_value <= 0:
        raise HTTPException(status_code=400, detail="Valor do frete deve ser maior que zero")
    freight = Freight(**payload.model_dump())
    db.add(freight)
    db.commit()
    db.refresh(freight)
    return freight


@router.post("/{freight_id}/approve")
def approve_freight(freight_id: str, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing"))):
    freight = db.get(Freight, freight_id)
    if not freight:
        raise HTTPException(status_code=404, detail="Frete não encontrado")
    freight.approved_for_billing = True
    freight.operational_status = "approved_for_billing"
    db.commit()
    db.refresh(freight)
    return freight
''',
    'backend/app/api/v1/closings.py': '''
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.database.session import get_db
from app.models.closing import Closing, ClosingItem
from app.models.freight import Freight
from app.schemas.closing import ClosingCreate

router = APIRouter()


@router.get("")
def list_closings(db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing", "viewer"))):
    return db.query(Closing).all()


@router.post("")
def create_closing(payload: ClosingCreate, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing"))):
    freights = db.query(Freight).filter(Freight.id.in_(payload.freight_ids)).all()
    if not freights:
        raise HTTPException(status_code=400, detail="Nenhum frete selecionado")
    for freight in freights:
        if freight.customer_id != payload.customer_id:
            raise HTTPException(status_code=400, detail="Todos os fretes devem pertencer ao mesmo cliente")
        if not freight.approved_for_billing:
            raise HTTPException(status_code=400, detail="Existe frete sem aprovação para faturamento")
        if freight.total_value <= 0:
            raise HTTPException(status_code=400, detail="Existe frete com valor inválido")
    subtotal = sum(Decimal(f.total_value) for f in freights)
    closing = Closing(
        company_id=payload.company_id,
        customer_id=payload.customer_id,
        number=f"FEC-{len(db.query(Closing).all())+1:06d}",
        period_start=payload.period_start,
        period_end=payload.period_end,
        subtotal=subtotal,
        discounts=Decimal("0.00"),
        additions=Decimal("0.00"),
        net_total=subtotal,
    )
    db.add(closing)
    db.flush()
    for freight in freights:
        db.add(ClosingItem(company_id=payload.company_id, closing_id=closing.id, freight_id=freight.id))
        freight.operational_status = "included_in_closing"
    db.commit()
    db.refresh(closing)
    return closing


@router.post("/{closing_id}/approve")
def approve_closing(closing_id: str, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing"))):
    closing = db.get(Closing, closing_id)
    if not closing:
        raise HTTPException(status_code=404, detail="Fechamento não encontrado")
    closing.status = "approved"
    db.commit()
    db.refresh(closing)
    return closing
''',
    'backend/app/api/v1/fiscal_documents.py': '''
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.database.session import get_db
from app.models.closing import Closing
from app.models.fiscal_document import FiscalDocument
from app.schemas.fiscal import FiscalIssueRequest
from app.services.fiscal_service import issue_mock_document

router = APIRouter()


@router.get("")
def list_documents(db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing", "viewer"))):
    return db.query(FiscalDocument).all()


@router.post("/issue")
def issue_document(payload: FiscalIssueRequest, db: Session = Depends(get_db), _=Depends(require_roles("general_admin", "company_admin", "billing"))):
    closing = db.get(Closing, payload.closing_id)
    if not closing:
        raise HTTPException(status_code=404, detail="Fechamento não encontrado")
    if closing.status != "approved":
        raise HTTPException(status_code=400, detail="Fechamento precisa estar aprovado")
    return issue_mock_document(db=db, payload=payload, closing=closing)
''',
    'backend/app/services/fiscal_service.py': '''
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.closing import Closing
from app.models.fiscal_document import FiscalDocument
from app.schemas.fiscal import FiscalIssueRequest


def build_idempotency_key(payload: FiscalIssueRequest) -> str:
    return f"{payload.company_id}:{payload.fiscal_type}:{payload.closing_id}:default:v1"


def issue_mock_document(db: Session, payload: FiscalIssueRequest, closing: Closing):
    idempotency_key = build_idempotency_key(payload)
    existing = db.query(FiscalDocument).filter(
        FiscalDocument.company_id == payload.company_id,
        FiscalDocument.idempotency_key == idempotency_key,
    ).first()
    if existing:
        return existing

    document = FiscalDocument(
        company_id=payload.company_id,
        closing_id=payload.closing_id,
        customer_id=payload.customer_id,
        fiscal_type=payload.fiscal_type,
        environment=settings.fiscal_environment,
        provider=settings.fiscal_default_provider,
        status="authorized" if settings.fiscal_default_provider == "mock" else "queued",
        number=f"{len(db.query(FiscalDocument).all())+1:06d}",
        series="1",
        reference=f"MOCK-{payload.fiscal_type.upper()}-{len(db.query(FiscalDocument).all())+1:06d}",
        protocol="PROTOCOLO-MOCK",
        idempotency_key=idempotency_key,
        amount=Decimal(closing.net_total),
        raw_payload={"closing": str(payload.closing_id)},
        raw_response={"provider": settings.fiscal_default_provider},
    )
    db.add(document)
    closing.status = "issued"
    db.commit()
    db.refresh(document)
    return document
''',
    'backend/app/tasks/worker.py': '''
import time


def main():
    while True:
        print("worker running")
        time.sleep(30)


if __name__ == "__main__":
    main()
''',
    'backend/tests/test_security.py': '''
from app.core.security import get_password_hash, verify_password


def test_password_hash_cycle():
    hashed = get_password_hash("123456")
    assert verify_password("123456", hashed)
''',
    'frontend/.env.example': '''
VITE_APP_NAME=Container Freight Manager
VITE_API_URL=http://localhost:8000/api/v1
''',
    'frontend/package.json': '''
{
  "name": "container-freight-manager-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0 --port 3000"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.1",
    "@tanstack/react-query": "^5.85.5",
    "axios": "^1.11.0",
    "clsx": "^2.1.1",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-hook-form": "^7.62.0",
    "react-router-dom": "^7.8.2",
    "zod": "^4.1.5"
  },
  "devDependencies": {
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.2",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.9.2",
    "vite": "^7.1.3"
  }
}
''',
    'frontend/tsconfig.json': '''
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
''',
    'frontend/vite.config.ts': '''
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
''',
    'frontend/tailwind.config.js': '''
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155'
        }
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px'
      }
    }
  },
  plugins: []
}
''',
    'frontend/postcss.config.js': '''
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
''',
    'frontend/index.html': '''
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Container Freight Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
''',
    'frontend/Dockerfile': '''
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
''',
    'frontend/src/index.css': '''
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color: #0f172a;
  background: #f5f7fa;
  font-family: Inter, Arial, sans-serif;
}

body {
  margin: 0;
}
''',
    'frontend/src/main.tsx': '''
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const client = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
''',
    'frontend/src/App.tsx': '''
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { FreightsPage } from './pages/FreightsPage'
import { ClosingsPage } from './pages/ClosingsPage'
import { FiscalDocumentsPage } from './pages/FiscalDocumentsPage'
import { CustomersPage } from './pages/CustomersPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="freights" element={<FreightsPage />} />
        <Route path="closings" element={<ClosingsPage />} />
        <Route path="fiscal-documents" element={<FiscalDocumentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
      </Route>
    </Routes>
  )
}
''',
    'frontend/src/layouts/AppLayout.tsx': '''
import { NavLink, Outlet } from 'react-router-dom'

const items = [
  ['Visão geral', '/dashboard'],
  ['Fretes', '/freights'],
  ['Fechamentos', '/closings'],
  ['Documentos fiscais', '/fiscal-documents'],
  ['Clientes', '/customers'],
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen grid-cols-[240px_1fr]">
        <aside className="border-r border-slate-300 bg-slate-900 text-slate-100">
          <div className="border-b border-slate-700 px-5 py-4">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Transcavalcante</div>
            <div className="mt-1 text-lg font-semibold">Container Freight Manager</div>
            <div className="text-xs text-slate-400">Gestão de Fretes, Faturamento e Documentos Fiscais</div>
          </div>
          <nav className="p-3">
            {items.map(([label, href]) => (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  `mb-1 block border px-3 py-2 text-sm ${isActive ? 'border-slate-500 bg-slate-800' : 'border-transparent hover:border-slate-700 hover:bg-slate-800'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main>
          <header className="border-b border-slate-300 bg-white px-6 py-4">
            <h1 className="text-xl font-semibold">Sistema de gestão de fretes e emissão fiscal</h1>
          </header>
          <section className="p-6">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  )
}
''',
    'frontend/src/services/api.ts': '''
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})
''',
    'frontend/src/pages/DashboardPage.tsx': '''
const cards = [
  ['Fretes na semana', '0'],
  ['Aguardando conferência', '0'],
  ['Aprovados para faturamento', '0'],
  ['Fechamentos pendentes', '0'],
  ['Documentos autorizados', '0'],
  ['Contas vencidas', '0'],
]

export function DashboardPage() {
  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map(([title, value]) => (
          <div key={title} className="border border-slate-300 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-slate-300 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Alertas fiscais</h2>
          <p className="text-sm text-slate-600">Nenhum alerta crítico no ambiente de desenvolvimento.</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Certificados</h2>
          <p className="text-sm text-slate-600">Configure o módulo de certificado A1 no backend antes de habilitar produção.</p>
        </div>
      </div>
    </div>
  )
}
''',
    'frontend/src/pages/FreightsPage.tsx': '''
export function FreightsPage() {
  return (
    <div className="border border-slate-300 bg-white">
      <div className="border-b border-slate-300 px-4 py-3 text-sm font-semibold">Fretes</div>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Número', 'Data', 'Cliente', 'Processo', 'Contêiner', 'Origem', 'Destino', 'Valor', 'Situação'].map((h) => (
              <th key={h} className="border-b border-slate-300 px-3 py-2 text-left font-medium text-slate-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={9} className="px-3 py-8 text-center text-slate-500">Nenhum frete carregado.</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
''',
    'frontend/src/pages/ClosingsPage.tsx': '''
export function ClosingsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ['Etapa 1', 'Seleção de cliente e período'],
        ['Etapa 2', 'Seleção de fretes elegíveis'],
        ['Etapa 3', 'Conferência de valores'],
        ['Etapa 4', 'Pré-validação fiscal'],
        ['Etapa 5', 'Aprovação'],
        ['Etapa 6', 'Emissão'],
      ].map(([title, desc]) => (
        <div key={title} className="border border-slate-300 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
          <div className="mt-2 text-base font-semibold">{desc}</div>
        </div>
      ))}
    </div>
  )
}
''',
    'frontend/src/pages/FiscalDocumentsPage.tsx': '''
export function FiscalDocumentsPage() {
  return (
    <div className="border border-slate-300 bg-white">
      <div className="border-b border-slate-300 px-4 py-3 text-sm font-semibold">Documentos fiscais</div>
      <div className="p-4 text-sm text-slate-600">
        Fluxo preparado para NFS-e e CT-e separados, com provedor mock inicial e idempotência por fechamento.
      </div>
    </div>
  )
}
''',
    'frontend/src/pages/CustomersPage.tsx': '''
export function CustomersPage() {
  return (
    <div className="border border-slate-300 bg-white">
      <div className="border-b border-slate-300 px-4 py-3 text-sm font-semibold">Clientes</div>
      <div className="p-4 text-sm text-slate-600">Cadastro multiempresa pronto para expansão com contatos, endereços e regras fiscais individuais.</div>
    </div>
  )
}
''',
    'docs/architecture.md': '''
# Arquitetura

## Camadas
- Front-end React/TypeScript/Vite/Tailwind
- API FastAPI/SQLAlchemy/Pydantic
- Banco PostgreSQL
- Redis para cache, fila e travas distribuídas
- Worker assíncrono separado
- S3 compatível para XML/PDF/anexos
- Provedores fiscais por adapter

## Decisões críticas
- multiempresa por `company_id`
- emissão desacoplada da interface
- idempotência por fechamento e versão
- mock fiscal obrigatório em desenvolvimento
- ativação de produção dependente de homologação
''',
    'docs/security.md': '''
# Segurança

- autenticação JWT com access e refresh token;
- hash Argon2id;
- RBAC por perfil;
- segregação multiempresa;
- headers e CORS restritivo;
- logs estruturados sem segredos;
- certificado A1 previsto para armazenamento criptografado fora do código;
- emissão fiscal apenas pelo backend/worker.
''',
    'docs/fiscal-plan.md': '''
# Estratégia fiscal

## NFS-e
Usar documentação oficial nacional quando aplicável e, fora disso, plugar provedor homologado ou integração municipal específica por adapter.

## CT-e
Usar schemas e notas técnicas oficiais vigentes do Portal do CT-e/SVRS, assinatura no backend e controle rígido de série/número.

## Regras
O sistema não decide enquadramento sozinho. Toda regra depende de configuração por empresa/operação e validação contábil.
''',
}

for rel_path, content in files.items():
    path = ROOT / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).lstrip(), encoding='utf-8')

print(f'Created {len(files)} files under {ROOT}')
