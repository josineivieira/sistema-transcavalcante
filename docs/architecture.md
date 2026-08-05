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
