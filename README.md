# Villa Cruz — gestão financeira e operacional

Aplicação web responsiva em português para substituir gradualmente controles financeiros e operacionais em Excel. A primeira entrega cobre a fundação de autenticação, autorização inicial, auditoria de importação e pré-visualização de planilhas. Os módulos financeiros ainda não estão liberados para uso operacional.

## Requisitos

- Node.js 22.22+ ou 24.15+ e pnpm 11.25+.
- Projeto Supabase dedicado para desenvolvimento/homologação. Não use o projeto inativo com nome genérico sem validar que ele pertence a esta aplicação.
- Docker Desktop para executar Supabase localmente.

## Rodar localmente

```powershell
Copy-Item .env.example .env.local
# Preencha a URL e a chave publishable do seu projeto Supabase de desenvolvimento
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:3000`. Sem variáveis Supabase, a página inicial e a prévia local funcionam como demonstração; não salvam dados nem autenticam usuários.

## Banco e migrações

O schema inicial está em `supabase/migrations/`. Para iniciar uma instância local:

```powershell
pnpm dlx supabase start
pnpm dlx supabase db reset
```

Para uma instância remota, configure o projeto Supabase correto, aplique a migração revisada pelo fluxo do Supabase CLI e valide RLS antes de qualquer dado financeiro real. As migrações aqui ainda não foram aplicadas a um banco.

## Primeiro usuário administrador

1. Crie o primeiro usuário na área Auth do projeto Supabase (autocadastro não está habilitado na aplicação).
2. Crie a empresa e a associação do usuário como `administrator` pelo SQL Editor usando o UUID do usuário autenticado. Exemplo, após substituir o UUID:

```sql
insert into public.companies (name, code)
values ('Restaurante Villa Cruz', 'VILLA-CRUZ')
returning id;

insert into public.memberships (company_id, user_id, role)
values ('<id-da-empresa>', '<uuid-do-usuario-auth>', 'administrator');
```

3. A primeira autenticação administrativa exige configurar TOTP. Cadastre o endereço exato de produção na allowlist de redirecionamento de Auth.
4. Em produção, desative signup público, defina rate limits adequados, configure SMTP verificado, sessão e MFA no Dashboard, e proteja credenciais. Nunca coloque `service_role` ou chave secreta em `NEXT_PUBLIC_*`.

## Prévia e importação de Excel

Em `/importar`, selecione arquivo `.xlsx`, aba, empresa e mapeamento inicial. A leitura acontece no navegador; o fluxo marca fórmulas, erros de fórmula, células vazias, valores “X”, datas/valores em texto após o mapeamento e linhas idênticas. Os dados originais da linha são preservados no rascunho. Fórmulas não são avaliadas e nenhuma regra contábil é aplicada. O botão só salva quando o projeto está conectado e o usuário tem função autorizada. A confirmação de importação ainda não está implementada.

Os arquivos de origem e o relatório estão em `references/source-workbooks/` e `docs/levantamento-villa-cruz.md`. Os originais não são alterados.

## Verificações locais

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Backup, restauração e operação

Veja [`docs/operacao.md`](docs/operacao.md). Os anexos devem permanecer em bucket privado; o bucket é criado sem políticas públicas, e as políticas de leitura/escrita de arquivos serão entregues com o módulo de anexos.

## Hipóteses não confirmadas

Os parâmetros de CMV e DRE, regra de competência, abertura do caixa, categoria, duplicidade e valores de outubro estão pendentes de validação do responsável financeiro. A referência de 36% é configurável, não universal. Consulte o levantamento antes de migrar saldos.
