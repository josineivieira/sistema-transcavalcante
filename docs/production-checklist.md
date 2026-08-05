# Checklist de Produção

## Operacional

- Empresa cadastrada.
- Usuários e perfis revisados.
- Clientes fiscais validados.
- Fretes com regras de aprovação.
- Fechamentos com reabertura auditada.
- Financeiro conferido.

## Fiscal

- CNPJ validado.
- Inscrição municipal preenchida quando exigida.
- Inscrição estadual preenchida quando exigida.
- Regime tributário configurado.
- Regras fiscais validadas pelo contador.
- Certificado A1 instalado, criptografado e válido.
- Provider NFS-e configurado.
- Provider CT-e configurado.
- Ambiente de homologação aprovado.
- Produção liberada formalmente.

## Infraestrutura

- PostgreSQL com backup diário.
- Redis monitorado.
- Worker ativo.
- S3 configurado para XML, PDF, eventos e demonstrativos.
- SMTP configurado.
- Logs e métricas externos configurados.
- Alertas configurados.
- Plano de restauração testado.

## Segurança

- Segredos fora do repositório.
- CORS restritivo.
- Rate limit ativo.
- Auditoria ativa.
- Permissões revisadas.
- Testes de segurança executados.
