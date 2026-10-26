# NFS-e municipal com A1: homologacao

## Implantacao

O frontend usa /api/v1/operational-nfse e o cadastro operacional existente. Publicar backend e frontend juntos. render-start.sh executa alembic upgrade head; a migracao 20261025_0007 cria certificado cifrado, contador e emissoes persistentes.

Definir ENCRYPTION_KEY aleatoria de pelo menos 32 caracteres, diferente do padrao. O Blueprint Render gera essa chave em novos servicos; conferir nos servicos existentes. Preservar essa chave e backups do banco: mudar a chave impede abrir certificados ja instalados. Manter HTTPS e ENABLE_NFSE=true.

## Primeiro teste

1. Em Configuracoes fiscais, selecionar NFS-e Nacional e Homologacao. Conferir CNPJ, municipio IBGE, regime, serie, proximo numero e codigos de servico com o contador. Codigo nacional deve ter seis digitos; nao preencher por aproximacao. Configurar ISS, retencoes e IBS/CBS conforme a operacao. Confirmar e salvar os dados.
2. Instalar o .pfx/.p12 A1 e sua senha diretamente no formulario. Nao enviar senha por chat. O backend verifica validade, chave RSA e CNPJ e cifra arquivo e senha no banco.
3. Usar Testar conexao. Este passo verifica a conexao com certificado; instalar o arquivo sozinho nao comprova habilitacao fiscal. Confirmar credenciamento do prestador no ambiente nacional.
4. Conferir endereco completo, CPF/CNPJ e municipio IBGE do cliente. Aprovar o fechamento. Em Documentos fiscais, selecionar fechamento, cliente, competencia e descricao; validar e emitir em homologacao.
5. Conferir retorno oficial e baixar XML/DANFSe. Em timeout, consultar antes de tentar novamente: resultado incerto bloqueia retransmissao. Rejeicoes preservam numero da DPS para correcao. Cancelamento depende de evento confirmado; substituicao referencia nota autorizada e outro fechamento aprovado.

## Limites e verificacao

Producao permanece bloqueada. Notas antigas simuladas nao comprovam autorizacao. Homologacao nao altera fechamento para faturado em producao. Certificado e senha nao sao devolvidos ao navegador nem armazenados no localStorage. Permissoes de emissao e configuracao sao verificadas no servidor, inclusive protecao contra promocao de usuario pelo snapshot.

Os testes automatizados usam certificado sintetico e transporte HTTP simulado, incluindo assinatura verificada, XSD oficial, autorizacao, rejeicao, timeout, cancelamento, numera??o e permissoes. Nenhuma nota foi transmitida ao governo neste desenvolvimento. Falta validacao assistida com o A1 real, credenciamento e dados tributarios do emitente. A validacao local do certificado nao substitui verificacao da cadeia ICP-Brasil pelo servico nacional.

Layout implementado: DPS 1.01 do pacote oficial de homologacao de 20/10/2026. A configuracao cobre servico municipal tributavel, regimes previstos no XSD, retencoes opcionais e grupo IBS/CBS; operacoes especiais exigem adaptacao e validacao especifica. Confirmar atualizacoes de layout antes de liberar producao.

Fontes: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao e https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita . Endpoint inicial: https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional; alternativa oficial permitida /SefinNacional. O caminho aceito pelo ambiente deve ser confirmado pelo teste com A1.
