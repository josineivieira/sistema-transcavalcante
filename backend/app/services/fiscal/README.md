# Módulo Fiscal Profissional

Arquitetura adicionada ao sistema existente para NFS-e e CT-e:

- `factory.py`: escolhe o provider por tipo fiscal.
- `providers/mock_provider.py`: homologação local segura.
- `nfse/national_provider.py`: fronteira da API NFS-e Nacional.
- `cte/sefaz_provider.py`: fronteira do CT-e 4.00/SEFAZ.
- `contracts.py`: contrato único de emissão, consulta e cancelamento.
- `fiscal_service.py`: idempotência, persistência, status e tratamento de rejeições.

## Estado atual

O módulo está funcional com provider `mock`, incluindo validação, emissão idempotente e cancelamento.
Os providers reais bloqueiam a emissão até que sejam cadastrados os dados fiscais, certificado A1, URLs oficiais, XML/XSD e regras da empresa/município/UF. Isso evita transmitir documentos inválidos.

## Ativação

1. Rode `alembic upgrade head`.
2. Configure o `.env`.
3. Mantenha `FISCAL_DEFAULT_PROVIDER=mock` para testes.
4. Para integração real, implemente os builders XML oficiais dentro dos adapters NFS-e e CT-e, utilizando os leiautes vigentes.

## Endpoints

- `POST /api/v1/fiscal-documents/validate`
- `POST /api/v1/fiscal-documents/issue`
- `GET /api/v1/fiscal-documents/{id}`
- `POST /api/v1/fiscal-documents/{id}/cancel`
