# Segurança

## Implementado

- Autenticação JWT com access token e refresh token.
- Hash de senha com Argon2.
- RBAC inicial por perfil.
- Segregação multiempresa por `company_id` nos endpoints principais.
- CORS por configuração.
- Correlation ID por requisição.
- Logs estruturados.
- Bloqueio do provider mock em produção sem variável explícita.

## Regras

- Não registrar senhas, tokens, certificado, senha do certificado ou chaves privadas.
- Não expor segredos no frontend.
- Não permitir acesso cruzado entre empresas.
- Não executar comunicação fiscal pelo navegador.
- Não permitir produção fiscal antes de homologação e validação contábil.

## Próximas Medidas Obrigatórias

- Persistência e revogação de refresh tokens.
- Bloqueio temporário após tentativas inválidas.
- Recuperação de senha.
- Convite de usuários.
- Autenticação em dois fatores opcional.
- Rate limit.
- Headers de segurança no Nginx/API.
- Upload seguro com validação de tipo, tamanho e antivírus quando aplicável.
- Auditoria detalhada com antes/depois e mascaramento de dados sensíveis.
