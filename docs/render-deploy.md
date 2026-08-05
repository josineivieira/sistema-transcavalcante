# Deploy no Render

Este projeto esta preparado para subir no Render usando Blueprint (`render.yaml`).

## O que o Blueprint cria

- `transcavalcante-db`: banco PostgreSQL.
- `transcavalcante-api`: backend FastAPI.
- `transcavalcante-web`: frontend React/Vite como Static Site.

## Passo a passo

1. Suba este projeto para um repositorio no GitHub.
2. No Render, clique em `New` > `Blueprint`.
3. Conecte o repositorio.
4. Confirme o arquivo `render.yaml` na raiz do projeto.
5. Clique para aplicar o Blueprint.
6. Depois do primeiro deploy, abra o servico `transcavalcante-api` e confira se `/health` responde.
7. Abra `transcavalcante-web` e teste o login.

## Variaveis importantes

O `DATABASE_URL` e preenchido automaticamente pelo Render a partir do banco `transcavalcante-db`.

Estas variaveis ficam como segredo no painel do Render e devem ser preenchidas quando for ativar emissao fiscal real:

- `NFSE_BASE_URL`
- `FISCAL_CERTIFICATE_PASSWORD`

Para producao fiscal real, tambem sera necessario configurar:

- certificado A1 no backend;
- provider/API NFS-e;
- credenciamento da empresa;
- ambiente de homologacao aprovado;
- storage persistente para XML/PDF;
- envio de e-mail fiscal.

## Observacao sobre URLs

O frontend esta configurado para chamar:

`https://transcavalcante-api.onrender.com/api/v1`

Se o Render alterar o nome da URL porque ja existe outro servico com esse nome, ajuste `VITE_API_URL` em `transcavalcante-web` e rode um novo deploy.

## Caminho manual se nao aparecer Blueprint

### 1. Criar o banco

No Render:

1. Clique em `+ New`.
2. Clique em `Postgres`.
3. Nome: `transcavalcante-db`.
4. Database name: `transcavalcante`.
5. User: `transcavalcante`.
6. Region: use a mesma da API.
7. Plan: free para teste.
8. Crie o banco.
9. Depois de criado, copie a `Internal Database URL`.

### 2. Criar a API

No Render:

1. Clique em `+ New`.
2. Clique em `Web Service`.
3. Conecte o repositorio.
4. Root Directory: `backend`.
5. Runtime: `Python`.
6. Build Command:

```bash
pip install -r requirements.txt
```

7. Start Command:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

8. Health Check Path:

```text
/health
```

9. Variaveis de ambiente:

```env
APP_ENV=production
APP_NAME=Container Freight Manager
APP_URL=https://transcavalcante-web.onrender.com
API_URL=https://transcavalcante-api.onrender.com
API_V1_PREFIX=/api/v1
DATABASE_URL=<Internal Database URL do Postgres>
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<gerar segredo>
JWT_SECRET=<gerar segredo>
ENCRYPTION_KEY=<gerar segredo>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=["https://transcavalcante-web.onrender.com"]
FISCAL_DEFAULT_PROVIDER=mock
FISCAL_ENVIRONMENT=homologation
ALLOW_MOCK_IN_PRODUCTION=false
ENABLE_NFSE=true
ENABLE_CTE=true
ENABLE_MDFE=false
```

### 3. Criar o frontend

No Render:

1. Clique em `+ New`.
2. Clique em `Static Site`.
3. Conecte o mesmo repositorio.
4. Root Directory: `frontend`.
5. Build Command:

```bash
npm ci && npm run build
```

6. Publish Directory:

```text
dist
```

7. Variaveis:

```env
VITE_APP_NAME=Container Freight Manager
VITE_API_URL=https://transcavalcante-api.onrender.com/api/v1
```

8. Adicione uma Rewrite Rule:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```
