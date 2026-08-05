# Módulo fiscal implementado

Foi adicionada ao projeto existente uma arquitetura profissional para emissão de NFS-e e CT-e, sem reescrever o sistema.

## Entregue

- Provider fiscal por tipo de documento.
- Provider mock funcional para desenvolvimento e homologação interna.
- Adapters separados para NFS-e Nacional e CT-e/SEFAZ.
- Validação antes da emissão.
- Emissão idempotente para evitar duplicidade.
- Registro de chave, protocolo, XML, PDF, rejeição e cancelamento.
- Endpoint de validação.
- Endpoint de emissão.
- Endpoint de consulta individual.
- Endpoint de cancelamento.
- Migration Alembic com os novos campos fiscais.
- Variáveis de ambiente para certificado A1 e endpoints oficiais.
- Testes automatizados do provider fiscal.

## Importante

A emissão real não foi ativada porque depende de dados que não estavam no projeto: certificado A1, senha, credenciamento, URLs do autorizador da UF, dados tributários da empresa, códigos de serviço, CFOP/CST e leiautes XML oficiais aplicáveis. Os adapters reais bloqueiam a transmissão incompleta para evitar documento fiscal inválido.

## Para rodar

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

No `.env`, mantenha inicialmente:

```env
FISCAL_DEFAULT_PROVIDER=mock
FISCAL_ENVIRONMENT=homologation
```

Depois configure os dados reais usando `backend/.env.example`.
