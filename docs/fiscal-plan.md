# Estratégia Fiscal

## Princípios

- NFS-e e CT-e são fluxos separados.
- O sistema não decide enquadramento tributário sozinho.
- Toda regra fiscal depende de configuração por empresa, operação, tomador, município, UF, serviço e validação contábil.
- Nenhum documento deve ser marcado como autorizado sem resposta válida do órgão ou provedor fiscal.

## NFS-e

Usar a documentação oficial do padrão nacional quando aplicável ao município. Quando não for aplicável, utilizar provedor fiscal homologado ou integração municipal específica por adapter.

O sistema deve suportar:

- ambiente mock;
- homologação;
- produção;
- envio;
- consulta;
- cancelamento;
- XML;
- PDF/DANFSe;
- rejeições;
- idempotência.

## CT-e

Usar schemas, notas técnicas e regras oficiais vigentes do CT-e. A assinatura e comunicação fiscal devem ocorrer somente no backend/worker.

O sistema deve suportar:

- certificado A1;
- validação de XML;
- assinatura digital;
- autorização;
- consulta;
- eventos;
- cancelamento;
- DACTE;
- XML autorizado;
- tratamento de rejeições.

## Bloqueios de Produção

Produção fiscal só pode ser habilitada quando:

- empresa estiver cadastrada e validada;
- certificado A1 estiver válido;
- provedor fiscal estiver configurado;
- ambiente estiver testado;
- armazenamento S3 estiver configurado;
- e-mail fiscal estiver configurado;
- homologação estiver concluída;
- contador tiver validado regras e tributação.
