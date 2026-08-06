# Transcavalcante

Sistema web para gestão de fretes de contêineres, fechamentos, faturamento e base segura para emissão fiscal NFS-e/CT-e.

## Status

Esta base entrega:

- monorepo com `frontend` e `backend`;
- autenticação JWT com access token, refresh token e RBAC inicial;
- segregação multiempresa por `company_id`;
- módulos iniciais de empresas, usuários, clientes, fretes, fechamentos e documentos fiscais;
- provedor fiscal `mock` desacoplado;
- PostgreSQL, Redis, worker, Nginx e Docker Compose;
- auditoria, logs estruturados, health, readiness e metrics;
- Alembic com migration inicial;
- testes iniciais de segurança, escopo multiempresa e regras fiscais.

## Limite fiscal

A emissão fiscal real em produção depende de credenciamento, certificado A1 válido, provedor ou município definido, schemas oficiais vigentes, homologação concluída e validação contábil.

O sistema não inventa endpoint, número, chave, protocolo ou autorização fiscal. O provider `mock` é somente para desenvolvimento e homologação controlada.

## Executar com Docker

```bash
docker compose up --build
```

Serviços esperados:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`

## Variáveis de ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Nunca preencha segredos reais no repositório.

## Banco e migrations

```bash
docker compose exec api alembic upgrade head
```

## Testes

```bash
python -m pytest -q backend/tests
```

## Build do frontend

```bash
npm run build --prefix frontend
```

## Antes de produção

- configurar certificado A1 com criptografia;
- contratar/configurar provider NFS-e ou integração municipal aplicável;
- implementar CT-e contra schemas e notas técnicas oficiais vigentes;
- configurar S3 real para XML, PDF, eventos e demonstrativos;
- configurar SMTP real;
- ativar fila/worker produtivo;
- revisar permissões com perfis reais;
- executar testes de integração, segurança e homologação fiscal;
- validar regras fiscais com contador.
