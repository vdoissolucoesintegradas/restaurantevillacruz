# Villa Cruz · Sistema de Gestão

Aplicação web responsiva para registrar faturamento, estoque por lote e validade, pedidos de compra, despesas/notas recorrentes, pagamentos, caixa por turno, DRE por competência, relatórios e auditoria. O banco PostgreSQL é a fonte de verdade; planilhas são importadas por prévia e confirmação.

## Estado desta entrega

Esta pasta recebeu uma **primeira versão funcional para desenvolvimento e implantação controlada**. Inclui login por sessão, perfis fixos, validação no servidor, PostgreSQL, migrações SQL, trilha de auditoria, anexos privados em disco/volume e interface pt-BR.

Ela ainda **não deve ser tratada como sistema financeiro pronto para produção**. Leia [limitações e regras pendentes](docs/STATUS-E-LIMITACOES.md), valide os cálculos com o contador/gestor e configure backups e credenciais antes de liberar usuários.

## Requisitos

- Node.js 24 LTS (ou superior, mantendo uma versão LTS suportada).
- PostgreSQL 14 ou superior.
- Um segredo de sessão aleatório com pelo menos 32 caracteres.
- Para anexos em produção Railway, um volume persistente montado em `/app/data/uploads`.

## Desenvolvimento local

1. Crie um banco PostgreSQL vazio.
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
3. Gere o segredo de sessão no PowerShell:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Instale e inicie:

   ```powershell
   npm install
   npm start
   ```

5. Acesse `http://localhost:3000`. O primeiro administrador só é criado quando o banco não tem usuários. A conta inicial é marcada para troca obrigatória de senha; a senha temporária e as senhas novas devem ter pelo menos 12 caracteres e no máximo 72 bytes em UTF-8. Nunca reutilize a senha temporária depois do primeiro acesso.
6. Execute os testes automatizados de interface com `npm test`. A suíte usa respostas simuladas e não substitui validação integrada com PostgreSQL.

As migrações em `migrations/` rodam no início do servidor. A migração 001 cria tabelas e índices; nenhuma planilha é importada automaticamente.

## Subir ao GitHub

Crie um repositório vazio no GitHub e, nesta pasta, use o endereço desse repositório:

```powershell
git add .
git commit -m "Cria sistema de gestão Villa Cruz"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Se já houver um remoto, confira `git remote -v` e use-o em vez de adicionar outro. Não envie `.env`, arquivos financeiros originais, documentos, anexos, senhas ou URLs de banco ao GitHub. O `.gitignore` exclui `.env`, `data/` e `uploads/`.

## Deploy na Railway

1. Na Railway, crie um projeto e adicione um serviço PostgreSQL.
2. Adicione um serviço de aplicação conectado ao repositório GitHub. O comando de início é `npm start`; a porta é lida de `PORT`.
3. Configure as variáveis da aplicação:

   - `NODE_ENV=production`
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (ajuste o nome do serviço PostgreSQL, se diferente)
   - `SESSION_SECRET` com um segredo aleatório novo, diferente do ambiente local
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD` com a conta inicial; ela só é criada se o banco estiver sem usuários e exige troca de senha no primeiro acesso
   - `UPLOAD_DIR=/app/data/uploads`
   - `APP_TIMEZONE=America/Sao_Paulo`

4. Em Settings do serviço, defina o health check como `/healthz`.
5. Adicione um volume persistente ao serviço web com mount path `/app/data/uploads`; sem ele, anexos podem sumir numa nova implantação.
6. Gere o domínio público da aplicação e teste o acesso, os fluxos e a persistência. Configure e verifique backups do PostgreSQL e do volume antes de inserir dados oficiais.

Em produção, publique somente atrás de HTTPS e de um proxy reverso confiável. Com `NODE_ENV=production`, o cookie da sessão recebe o atributo `Secure`; mantenha o proxy confiável configurado com o número real de saltos e impeça acesso direto à aplicação que permita falsificar cabeçalhos encaminhados. O limite de login atual é de 12 requisições por IP a cada 15 minutos, mantido em memória por processo; múltiplas instâncias precisam de um limitador compartilhado para aplicar um limite consistente.

A Railway executa o app a partir do `package.json`. A aplicação executa migrações pendentes e tenta criar o primeiro administrador na primeira inicialização, desde que as variáveis de ambiente estejam preenchidas. Não faça implantação com dados financeiros oficiais antes da validação dos cálculos, acessos e restauração de backup.

Referências operacionais: [Deployments Railway](https://docs.railway.com/deployments/reference), [variáveis e banco de dados Railway](https://docs.railway.com/databases) e [volumes persistentes Railway](https://docs.railway.com/volumes).

## Módulos incluídos

- **Visão geral:** cartões personalizáveis, reordenáveis por arraste ou setas, faturamento do dia, meta informada no lançamento, caixa, contas e alertas de validade/estoque mínimo; filtros por mês preenchem o intervalo de datas e gráficos ajustam a escala aos valores.
- **Faturamento:** lançamento por dia/canal, meta diária e anexo opcional.
- **Estoque:** produto, lote, fornecedor, custo, validade, saldo, entrada, consumo, perda, cortesia, ajuste e FEFO.
- **Compras:** pedidos com vários itens, unidade de compra e conversão; recebimentos parciais criam lotes vinculados ao pedido e atualizam o estoque. Indicadores de fornecedor consideram apenas pedidos registrados depois da funcionalidade.
- **Despesas/notas:** competência, emissão, vencimento, categoria, parcelas, status e comprovantes privados.
- **Recorrências e documentos:** modelos de despesa mensal/trimestral/anual geram rascunhos para revisão; central de anexos e histórico de importações permitem localizar registros e rejeições.
- **Pagamentos:** pagamento parcial ou total, método e responsável. Só impacta o livro do caixa reservado quando o usuário marca que saiu desse caixa; pagamentos da despesa continuam registrados por competência na DRE.
- **Caixa reservado:** abertura de turno, entrada/saída, saldo esperado, valor contado, diferença e justificativa obrigatória.
- **DRE:** receita confirmada por data de faturamento e despesas por competência; pagamentos não são somados novamente. O CMV é sinalizado como pendente de definição.
- **Relatórios:** consultas executáveis de faturamento, despesas, caixa, fechamentos de turno, posição e movimentações de estoque e linhas de origem da DRE; filtros por período, busca e status aplicável; configurações reexecutáveis e CSV coerente com a consulta. Limite de 5.000 linhas por execução.
- **Excel:** prévia de uma aba XLSX e mapeamento para faturamento, despesa ou produto; rejeições aparecem no relatório de importação.
- **Administração:** usuários e perfis com desativação/reativação, categorias, meta percentual por vigência, configurações de alertas de caixa e auditoria com filtros.

## Arquivos importantes

- `server.js` — API, autenticação, validações e servidor web.
- `migrations/` — schema PostgreSQL versionado.
- `public/` — interface responsiva.
- `docs/PROJECT-SNAPSHOT.md` — contexto atual do projeto.
- `docs/STATUS-E-LIMITACOES.md` — funcionalidades, regras ainda pendentes e risco operacional.
- `docs/SEGURANCA-E-PRIVACIDADE.md` — controles de autenticação, configuração externa e pendências do aviso de privacidade.
- `docs/DIRETRIZES-ENGENHARIA.md` — critérios para analisar e implementar melhorias com base na arquitetura real do repositório.
- `docs/PROMPT-MELHORIAS-PRODUTO-E-UX.md` — prompt para evolução de funcionalidades e redesenho visual orientados a resultado.
- `docs/ROADMAP-PRODUTO-E-UX.md` — estado confirmado das 20 melhorias, evidências e sequência de entrega.
- `docs/ESCOPO-EVOLUCAO-GESTAO-RESTAURANTE.md` — escopo funcional proposto para estoque de restaurante, caixa, DRE e relatórios gerenciais.
- `docs/adr/` — decisões de arquitetura e regras de dados.

## Dados e segurança

- Senhas são armazenadas com bcrypt; sessões ficam no PostgreSQL, em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- A conta inicial e os usuários cadastrados pela administração precisam trocar a senha no primeiro acesso. O servidor exige 12 caracteres para a senha nova, limita senhas a 72 bytes em UTF-8 e bloqueia o restante da API até a troca.
- Escritas exigem token CSRF; rotas de API validam sessão, função e pertencimento à unidade.
- Login aplica limite temporário por IP, usa resposta genérica para falhas e executa comparação bcrypt fictícia quando a conta não existe. Contas não são reveladas pela mensagem de erro.
- Respostas da API não são armazenadas em cache. Logs de erro não incluem mensagem bruta, campos de requisição ou credenciais.
- Anexos aceitam PDF/PNG/JPG, verificam a assinatura do arquivo e exigem sessão/permissão para leitura.
- Valores monetários persistem em centavos inteiros. Não converta campo ausente, “X” ou fórmula inválida para zero durante a importação.
- A trilha de auditoria é append-only na interface, mas um administrador de banco ainda pode alterá-la. Restrinja credenciais SQL.
- MFA e recuperação de senha ainda não estão implementados; não há envio ou redefinição autônoma de senha. Gestão completa de unidades, fechamento contábil, backup agendado dentro do app e alertas por e-mail também não estão implementados. O procedimento externo de backup está em `scripts/backup-postgres.sh` e `docs/BACKUP-E-RESTAURACAO.md`.
- `docs/PRIVACIDADE-RASCUNHO.html` preserva o rascunho baseado no fluxo de login; ele não é servido ao público. Controlador, canal de contato, retenção, operadores e transferências precisam ser confirmados antes de publicar uma política completa.

