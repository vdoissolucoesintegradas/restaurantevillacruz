# Diagnóstico e sequência de evolução — Produto e UX

Revisão baseada no código atual (`public/app.js`, `public/styles.css`, `server.js` e `migrations/001-initial.sql`). “Existe” indica fluxo já encontrado no repositório; “precisa de ajuste” indica cobertura parcial ou experiência incompleta. Itens bloqueados dependem de regra de gestão/contabilidade ou dados que o sistema ainda não registra.

## Estado das 20 melhorias

| # | Melhoria | Estado confirmado | Evidência / dependência |
|---|---|---|---|
| 1 | Painel de ações do dia | Precisa de ajuste | `/api/dashboard` já resume vendas, contas, estoque e auditoria; alertas antes não levavam à área de ação e não mostravam faturamento ausente ou status do caixa. A tela inicial agora inclui esses acessos. |
| 2 | Lançamentos rápidos e consistentes | Precisa de ajuste | Formulários de venda, despesa, caixa e estoque existem; faltam padrões recentes e mais otimização do fluxo, sem necessidade de alterar regras. |
| 3 | Vendas por período e canal | Precisa de ajuste | Vendas têm data/canal e filtro de período na API, mas a tela apresenta uma lista recente sem comparação de períodos. |
| 4 | Fechamento de caixa guiado | Existe | A tela permite abrir turno, lançar movimentos e fechar com saldo esperado e contagem. Pode ser refinada depois da observação de uso. |
| 5 | Tratamento de divergência de caixa | Existe | A API exige justificativa para diferença, audita o fechamento e a migração garante um caixa aberto por unidade; a operação de fechamento usa transação e bloqueio da sessão. |
| 6 | Agenda de despesas e vencimentos | Precisa de ajuste | Despesas e parcelas têm vencimentos, pagamentos parciais e comprovantes. A listagem agora resume saldo aberto e quantidade vencida/próxima e mostra saldo restante por despesa; falta detalhar totais e situação por parcela/faixa. |
| 7 | Conciliação simples de recebimentos | Bloqueado por decisão de negócio | Não há entidade nem dados previstos para recebíveis, taxas, estornos e liquidação por canal. Definir fonte e regra antes de persistir estados financeiros. |
| 8 | Lista de reposição acionável | Precisa de ajuste | Há estoque mínimo e saldo atual; estimativa de compra não pode ser derivada sem quantidade desejada/regra de reposição definida. |
| 9 | Alertas de validade com FEFO | Existe | Lotes possuem validade, alerta no painel e consumo priorizado por FEFO no servidor. Melhorias futuras podem tornar a lista de lotes vencidos mais direta. |
| 10 | Contagem de estoque guiada | Novo | Há ajustes e histórico de movimentos, mas não há sessão de contagem, comparação protegida ou fluxo de contagens concorrentes. |
| 11 | Fichas técnicas de produtos | Bloqueado por decisão de negócio | Não há estrutura de receitas. Exige confirmar unidades, rendimento, perdas, substituições e responsável antes de persistir composição. |
| 12 | CMV com origem rastreável | Bloqueado por decisão de negócio | A própria interface e ADR mantêm CMV pendente de validação contábil; não automatizar até aprovação da fórmula e fontes. |
| 13 | Resultado líquido por canal de delivery | Bloqueado por decisão de negócio | Vendas têm canal, mas o sistema não guarda comissões, taxas, descontos, estornos ou repasses; requer fonte e parâmetros oficiais. |
| 14 | Controle de embalagens e descartáveis | Bloqueado por decisão de negócio | Estoque genérico existe, mas a baixa vinculada a pedido/ficha depende do processo real e das unidades de consumo. |
| 15 | Conferência de repasses de delivery | Bloqueado por decisão de negócio | Não há importação de extrato de canal nem estados de conferência aprovados. Definir processo e evidências com gestão. |
| 16 | Histórico de custo por fornecedor | Precisa de ajuste | Lotes guardam fornecedor, data e custo unitário; falta uma consulta comparativa que trate unidade e embalagem. |
| 17 | Mix de produtos e margem | Bloqueado por decisão de negócio | Vendas diárias por canal não são vendas por item e o custo/CMV ainda não está validado; margem não é confiável hoje. |
| 18 | Relatórios prontos para decisão | Precisa de ajuste | Existem CSV de domínios e configurações salvas, mas filtros salvos não executam consultas personalizadas. |
| 19 | Importação com reconciliação e duplicidades | Precisa de ajuste | Prévia, mapeamento, rejeições e lote persistido existem; suspeitas de duplicidade e recuperação de relatório podem ser aprimoradas sem deduplicação automática. |
| 20 | Acesso operacional mais seguro | Precisa de ajuste | Há sessão, CSRF, papéis fixos e campo de usuário ativo; administração cria/lista usuários, mas não oferece ciclo de desativação. MFA e recuperação requerem desenho próprio. |

## Incremento entregue

- **Problema observado:** os alertas já eram calculados, mas não levavam à tarefa relacionada. O painel também não distinguia ausência de lançamento de faturamento no dia nem informava o estado do turno de caixa. Na lista de despesas, valores já pagos não eram subtraídos visualmente do saldo pendente.
- **Hipótese:** atalhos para as tarefas e exposição do saldo não pago ajudam a localizar e priorizar conferências com menos retrabalho.
- **Mudança:** painel inicial com alertas clicáveis para faturamento, despesas, estoque e caixa; status do caixa quando visível ao perfil; resumo de saldo aberto e quantidades por prazo; saldo pendente por despesa e ação de pagamento oculta em itens quitados/cancelados. Refinamento visual aplicado por tokens e componentes CSS existentes.
- **Métrica sugerida:** tempo entre abrir o painel e chegar ao registro pendente; proporção de alertas atendidos no mesmo dia; tempo para localizar saldo pendente; completude de registros diários. Não há linha de base ou meta numérica estabelecida.
- **Experimento:** validar em homologação durante operação paralela, observando se os alertas correspondem aos dados e se o destino resolve a tarefa. Gestão define critério de adoção após observar a linha de base.
- **Risco e banco:** não há alteração de schema, endpoint ou regra financeira. O painel reutiliza `/api/dashboard` e `/api/cash`.

## Sequência recomendada

1. **Concluído neste incremento:** painel de ações e identidade visual comum. Baixo risco, usa informações existentes.
2. **Próximo, sem regra contábil nova:** detalhar vencimentos e saldos por parcela; refinamento do relatório de custos de lotes por fornecedor/unidade; filtros executáveis nos relatórios existentes.
3. **Após uso observado:** comparar vendas por período e canal e otimizar formulários de lançamento com dados reais de uso.
4. **Após decisão da gestão/contabilidade:** recebíveis/repasses por canal, CMV, margem, ficha técnica e consumo de embalagens.
5. **Investimento estrutural:** contagem de estoque concorrente, reconciliação de importação e ciclo de vida de usuários/MFA.

Não foram criadas migrações ou novas dependências neste incremento. A suíte de smoke tests de UI cobre os alertas e saldos em aberto com API simulada; testes integrados com PostgreSQL e validação visual no navegador continuam pendentes.
