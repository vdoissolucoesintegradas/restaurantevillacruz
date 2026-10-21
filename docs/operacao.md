# Operação, segurança e recuperação

## Antes de usar dados reais

- Use projetos Supabase distintos para desenvolvimento, homologação e produção. Confirme organização/região e política de backup antes de criar ou ativar recursos pagos.
- Configure TLS no domínio publicado, chaves/segredos no gerenciador de ambiente do deploy, SMTP confiável, allowlist de redirecionamento, limites de tentativas e duração de sessão.
- Desabilite criação pública de contas e convide usuários individualmente. Confirme MFA TOTP para administradores; MFA para Financeiro é recomendada.
- Teste o papel de cada usuário em RLS com dados fictícios. A chave publishable pode estar no cliente; `service_role`/secret jamais pode estar no navegador.
- Configure alertas de erro e auditoria sem gravar valores financeiros, senhas, tokens, conteúdo de anexos ou códigos TOTP em logs.
- Mantenha bucket privado. A política de anexos e URLs assinadas ainda será criada com a Fase 2.

## Importação

1. Preserve uma cópia imutável dos arquivos de origem em armazenamento autorizado.
2. Gere prévia por arquivo/aba, guarde hash SHA-256, mapeamento e linhas brutas.
3. Investigue avisos, duplicatas candidatas, datas/textos, fórmulas e erros de referência.
4. Compare totais por período e origem; mostre divergências sem ajustar automaticamente.
5. Obtenha confirmação humana registrada antes de criar lançamentos finais ou saldos de abertura.

## Backup e restauração (a documentar com o ambiente real)

- Defina retenção, frequência, responsável e RPO/RTO com o proprietário do sistema; a disponibilidade de backups automáticos depende do plano/configuração do Supabase.
- Exporte o banco com Supabase CLI/`pg_dump` usando credencial segura; armazene a cópia cifrada fora do projeto e monitore o sucesso. Exporte o Storage separadamente: backup de banco não implica backup dos objetos.
- Faça um exercício periódico de restauração em homologação, valide quantidade de registros, referências, permissões, objetos e auditoria, e guarde evidência sem dados pessoais desnecessários.
- Registre data, versão das migrações e resultado do teste de restauração.

## Situação da Fase 1

A aplicação oferece autenticação de senha via Supabase, encerramento de sessão, recuperação de senha, configuração/desafio TOTP para administradores, RLS inicial e criação atômica de rascunho de importação. Ainda faltam fluxo de convite/gestão de usuários, MFA recomendada para Financeiro, políticas por permissão granular em cada módulo, auditoria para alterações além da importação, monitoramento operacional e validação das migrações em ambiente Supabase dedicado. Não considerar fase pronta para produção.
