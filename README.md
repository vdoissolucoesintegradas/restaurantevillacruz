# Villa Cruz · Sistema de Gestão

Aplicação web responsiva para registrar faturamento, estoque por lote e validade, despesas/notas, pagamentos, caixa por turno, DRE por competência, relatórios e auditoria. O banco PostgreSQL é a fonte de verdade; planilhas são importadas por prévia e confirmação.

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

5. Acesse `http://localhost:3000`. O primeiro administrador só é criado quando o banco não tem usuários. A conta inicial é marcada para troca obrigatória de senha; senhas novas devem ter pelo menos 8 caracteres. Nunca reutilize a senha temporária depois do primeiro acesso.

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

A Railway executa o app a partir do `package.json`. A aplicação executa migrações pendentes e tenta criar o primeiro administrador na primeira inicialização, desde que as variáveis de ambiente estejam preenchidas. Não faça implantação com dados financeiros oficiais antes da validação dos cálculos, acessos e restauração de backup.

Referências operacionais: [Deployments Railway](https://docs.railway.com/deployments/reference), [variáveis e banco de dados Railway](https://docs.railway.com/databases) e [volumes persistentes Railway](https://docs.railway.com/volumes).

## Módulos incluídos

- **Visão geral:** faturamento do dia, meta informada no lançamento, caixa, contas e alertas de validade/estoque mínimo.
- **Faturamento:** lançamento por dia/canal, meta diária e anexo opcional.
- **Estoque:** produto, lote, fornecedor, custo, validade, saldo, entrada, consumo, perda, cortesia, ajuste e FEFO.
- **Despesas/notas:** competência, emissão, vencimento, categoria, parcelas, status e comprovantes privados.
- **Pagamentos:** pagamento parcial ou total, método e responsável. Só impacta o livro do caixa reservado quando o usuário marca que saiu desse caixa; pagamentos da despesa continuam registrados por competência na DRE.
- **Caixa reservado:** abertura de turno, entrada/saída, saldo esperado, valor contado, diferença e justificativa obrigatória.
- **DRE:** receita confirmada por data de faturamento e despesas por competência; pagamentos não são somados novamente. O CMV é sinalizado como pendente de definição.
- **Relatórios:** exportação CSV de faturamento/despesas e gravação de configurações de filtro.
- **Excel:** prévia de uma aba XLSX e mapeamento para faturamento, despesa ou produto; rejeições aparecem no relatório de importação.
- **Administração:** usuários e perfis, categorias, meta percentual por vigência e auditoria.

## Arquivos importantes

- `server.js` — API, autenticação, validações e servidor web.
- `migrations/` — schema PostgreSQL versionado.
- `public/` — interface responsiva.
- `docs/PROJECT-SNAPSHOT.md` — contexto atual do projeto.
- `docs/STATUS-E-LIMITACOES.md` — funcionalidades, regras ainda pendentes e risco operacional.
- `docs/adr/` — decisões de arquitetura e regras de dados.

## Dados e segurança

- Senhas são armazenadas com bcrypt; sessões ficam no PostgreSQL, em cookie `HttpOnly`, `SameSite=Lax` e `Secure` quando servido em HTTPS.
- A conta inicial e os usuários cadastrados pela administração precisam trocar a senha no primeiro acesso. O servidor exige 8 caracteres para a senha nova e bloqueia o restante da API até a troca.
- Escritas exigem token CSRF; rotas de API validam sessão, função e pertencimento à unidade.
- Anexos aceitam PDF/PNG/JPG, verificam a assinatura do arquivo e exigem sessão/permissão para leitura.
- Valores monetários persistem em centavos inteiros. Não converta campo ausente, “X” ou fórmula inválida para zero durante a importação.
- A trilha de auditoria é append-only na interface, mas um administrador de banco ainda pode alterá-la. Restrinja credenciais SQL.
- MFA, recuperação de senha, bloqueio/reativação de usuários na interface, gestão de unidade completa, fechamento contábil, backup executável dentro do app e alerta por e-mail ainda não estão implementados.

