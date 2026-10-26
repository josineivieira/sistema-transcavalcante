> Atualizacao 25/10/2026: integracao operacional A1 implementada apos este diagnostico inicial. Consulte [instrucoes e limites da homologacao](nfse-homologacao.md). A validacao com certificado real continua pendente.

# Diagnóstico de NFS-e municipal com certificado A1

Revisão: 25/10/2026. Escopo informado: serviço municipal, Manaus, certificado A1.

## Resultado

O sistema ainda não está pronto para transmitir uma NFS-e de teste ao ambiente nacional. A interface simula um documento; o conector nacional não implementa geração, assinatura nem envio da DPS. Informar nome, senha ou caminho de um certificado não completa essa integração.

A Prefeitura informa que serviços prestados a partir de 01/01/2026 utilizam o Emissor Nacional. Para serviços de competência anterior, conferir as orientações de transição antes de selecionar o emissor.

Fonte municipal: https://www.manaus.am.gov.br/semef/2026/01/04/esclarece-instabilidade-pontual-nfs-e/
APIs oficiais: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
Leiautes e manuais: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual

## Bloqueios encontrados no código

| Prioridade | Constatação | Ajuste necessário |
| --- | --- | --- |
| 1 | `frontend/src/pages/FiscalDocumentsPage.tsx`, `confirmIssueDocument`: cria número com a quantidade local de documentos e protocolo `NFSE-SIMULADA`; muda fretes e fechamento para emitidos sem autorização externa. | Separar explicitamente simulação e transmissão; só marcar autorização após resposta fiscal autêntica. |
| 2 | `frontend/src/pages/SettingsPage.tsx`: o certificado é um campo de texto; sua validade também é digitada. O pacote `backend/app/services/fiscal/certificates` não possui implementação de leitura de A1. | Instalar A1 no backend por mecanismo protegido; ler PKCS#12, validar senha, chave privada, validade e titular; restringir acesso e proteger o material criptográfico. Exibir somente metadados e diagnóstico na interface. |
| 3 | `backend/app/services/fiscal/nfse/national_provider.py`: `issue` termina obrigatoriamente em `FiscalIntegrationError`, inclusive com configurações preenchidas. | Implementar DPS no leiaute vigente, validação XSD, assinatura XML, autenticação mTLS, transmissão e tratamento da resposta na produção restrita. |
| 4 | Configurações da interface usam `issuerSettings.nfseProvider/nfseEndpoint`; a factory lê `settings.fiscal_default_provider/nfse_base_url` do backend. | Unificar a configuração efetiva e apresentar o ambiente/provider realmente utilizados. |
| 5 | API fiscal exige autenticação Bearer e entidades UUID de empresa, cliente e fechamento. O fluxo operacional usa sessão por cookie, dados no snapshot e identificadores próprios. | Integrar a sessão operacional à autorização fiscal e estabelecer o mapeamento das entidades, com escopo de empresa. Não basta trocar a URL do botão. |
| 6 | `nextDpsNumber` existe na interface, mas a simulação usa o tamanho da lista. | Reservar série/número DPS atomicamente no backend e persistir a correlação com a NFS-e autorizada. |
| 7 | `get_existing_document` retorna documentos existentes inclusive em `integration_error`; `issue_document` retorna imediatamente esse registro. | Tratar tentativas com erro, transmissões de resultado desconhecido e consulta antes de retransmitir; preservar idempotência. |
| 8 | Consulta e cancelamento nacionais são stubs; não há fluxo real de recebimento/guarda de XML autorizado e DANFSe. | Implementar consulta, rejeições, eventos necessários e armazenamento persistente dos retornos e documentos. |
| 9 | Os dados fiscais de exemplo ainda estão no cadastro. | Conferir CNPJ/IM, regime, cadastro do tomador, município/competência, códigos do serviço e tributação com o responsável fiscal e com os domínios do leiaute vigente. |

## Sequência para o primeiro teste real em homologação

1. Implementar a configuração efetiva e o diagnóstico do A1 no backend.
2. Integrar os cadastros/fechamentos e a autenticação operacional ao serviço fiscal.
3. Gerar, validar e assinar uma DPS de teste conforme a documentação de produção restrita aplicável.
4. Implementar e testar o transporte mTLS e a resposta oficial.
5. Apresentar chave/número/protocolo oficiais e guardar XML/retorno; atualizar fretes e fechamento conforme o resultado recebido.
6. Testar senha incorreta, certificado vencido, rejeição, timeout, consulta e nova tentativa sem duplicidade.

## Validação executada e limites

- Inspeção de frontend, autenticação, contratos, providers e configuração de deploy.
- `pytest backend/tests/test_fiscal_provider.py backend/tests/test_fiscal_rules.py -q`: 6 testes aprovados. Cobrem provider simulado, schema e chave de idempotência; não demonstram integração nacional real.
- Não foram fornecidos certificado ou configurações privadas do Render; validade/titularidade do A1, credenciamento e conectividade efetiva não foram verificados.
- Nenhuma nota foi transmitida. O primeiro teste externo deve usar produção restrita, identificada separadamente da simulação local.
