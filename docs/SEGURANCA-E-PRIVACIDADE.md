# Segurança de autenticação e privacidade

## Controles implementados

- Login valida formato e comprimento de e-mail e senha. Senhas acima de 72 bytes UTF-8 são rejeitadas para evitar diferenças na comparação bcrypt.
- Falhas de login usam a mesma resposta para conta inexistente, senha incorreta e conta inativa. O servidor faz uma comparação bcrypt fictícia quando não encontra a conta para reduzir diferenças de tempo.
- O login e a troca de senha compartilham um limite de 12 requisições por IP a cada 15 minutos. O armazenamento atual é em memória por processo; ele reinicia com o processo e não sincroniza instâncias.
- Senhas novas exigem 12 caracteres, máximo de 72 bytes UTF-8 e são armazenadas com bcrypt. Senhas temporárias iniciais e administrativas seguem o mesmo mínimo.
- A sessão é regenerada ao entrar e após a troca de senha. A troca revoga as sessões anteriores da conta. O identificador da sessão é entregue em cookie `HttpOnly`, `SameSite=Lax` e, com `NODE_ENV=production`, `Secure`; o conteúdo de resposta da API recebe `Cache-Control: no-store`.
- A API exige token CSRF em requisições de escrita e valida sessão, perfil e unidade. Tokens inválidos recebem erro controlado.
- O objeto de sessão contém identificador, nome e perfil da conta, sem copiar o e-mail para cada registro de sessão. Logs de erro guardam identificador da requisição, tipo e código do erro, sem mensagem bruta, corpo da requisição ou senha.

## Configuração de produção necessária

- Servir o site por HTTPS e terminar TLS somente num proxy controlado. Em produção, o cookie tem `Secure`; acesso HTTP direto não deve ser disponibilizado.
- `server.js` confia em um salto de proxy (`trust proxy = 1`). Confirmar se a hospedagem usa exatamente um salto confiável ou ajustar a configuração. Bloquear acesso direto que permita falsificação de `X-Forwarded-*`, pois o endereço IP participa do limite de tentativas.
- O limite de login é por instância e não protege de forma consistente em múltiplas réplicas. Configurar um armazenamento compartilhado de limite se houver mais de uma instância ou exposição maior.
- Gerar um `SESSION_SECRET` exclusivo e aleatório de pelo menos 32 caracteres para produção. Não reutilizar o segredo de desenvolvimento.

## Recursos que não existem no projeto

- Não há recuperação ou redefinição autônoma de senha, MFA, CAPTCHA ou canal de envio de código. As contas são criadas por um administrador e a pessoa troca a senha temporária no primeiro acesso.
- A tela de login exibe um aviso resumido; não há política completa publicada nem caixa de consentimento para login.
- O rascunho em `docs/PRIVACIDADE-RASCUNHO.html` descreve dados vistos no fluxo: e-mail e senha para autenticação, identificador/nome/perfil na sessão e IP usado temporariamente pelo limitador. Ele não é servido ao público. O projeto ainda precisa confirmar controlador, contato, prazo de retenção, prestadores de hospedagem, destinatários e transferências.

## Antes de publicar a política de privacidade ou ampliar o acesso

1. Confirmar o domínio e HTTPS, a terminação TLS e o número real de proxies confiáveis.
2. Preencher o nome/identificação do controlador e o canal de contato para solicitações de privacidade.
3. Confirmar prazos de retenção, prestadores, destinatários e eventuais transferências internacionais com os responsáveis pela operação.
4. Revisar o texto do aviso e a Política de Privacidade completa com a pessoa responsável por privacidade ou assessoria jurídica.
5. Decidir se o nível de risco requer MFA ou recuperação segura de conta antes de abrir o acesso para mais usuários.

Este registro descreve os controles encontrados no código após as alterações; não representa certificação de segurança nem conclusão de conformidade legal.
