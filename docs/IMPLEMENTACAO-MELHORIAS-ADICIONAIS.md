# Implementação das dez melhorias complementares

## Estado e escolhas

1. **Agenda de parcelas:** já existia em Despesas e notas, incluindo valor, pago, saldo, vencimento e filtro de situação. Foi mantida.
2. **Recorrências:** cadastro mensal/trimestral/anual gera despesa em revisão para aprovação manual. Não agenda pagamento nem confirma a despesa automaticamente. A próxima data só avança quando o rascunho é criado; cada vencimento é único por recorrência.
3. **Pedidos de compra:** pedido suporta vários itens, quantidade, unidade, conversão e custo previsto. Recebimento parcial gera um lote por item recebido e movimentação de estoque na mesma transação. Dados do pedido e do lote ficam vinculados.
4. **Indicadores de fornecedor:** total de pedidos, pedidos parcialmente recebidos, lotes recebidos e média de dias entre pedido e recebimento. Só considera pedidos criados após a funcionalidade; não estima desempenho anterior.
5. **Central de documentos:** busca por nome, módulo e data. Lista até 500 anexos, aponta para a origem e usa a rota autenticada já existente para abrir o arquivo.
6. **Histórico de importação:** lista até 300 lotes, status, responsável, data e resumo; resultado de rejeições pode ser reaberto. O arquivo XLSX original não é mantido pelo sistema.
7. **Ciclo de usuários:** administrador pode desativar/reativar; desativação apaga sessões persistidas do usuário. O servidor impede desativar o último administrador ativo em qualquer unidade associada.
8. **Backup:** `scripts/backup-postgres.sh` gera dump, cópia do volume de anexos e hashes. O procedimento de restauração isolada está em `BACKUP-E-RESTAURACAO.md`. Agendamento e retenção continuam sob responsabilidade da infraestrutura.
9. **Alertas de caixa:** consulta por período, turno e texto da justificativa apresenta contagens, positivos/negativos, soma absoluta e líquido. Proprietário/administrador define limites; sem configuração não há alerta automático. Indicadores não atribuem culpa.
10. **Auditoria:** busca por período, usuário, ação, tipo e ID, até 500 eventos, com valores anteriores/novos e motivo.

## Dados e migração

`012-recurring-purchases-and-links.sql` é aditiva e cria modelos de recorrência e pedidos/itens, vínculos opcionais de recorrência nas despesas e vínculo opcional entre lote e item de pedido. `013-lot-purchase-snapshot.sql` preserva quantidade, unidade e custo informados da embalagem em cada lote e permite que lotes históricos fiquem sem uma conversão que não pode ser reconstruída. A migração de retorno de `012` está em `migrations/rollback/012-recurring-purchases-and-links.sql`; exporte os novos registros antes de reverter, pois a reversão remove os dados desses recursos. Configurações de alerta usam `app_settings` existente e não exigem nova tabela.

## Limites conhecidos

- As conversões e preços esperados devem ser conferidos no pedido; não se preenchem conversões de recebimentos históricos.
- O formulário cria pedidos com vários itens, mas não tem circuito de aprovação, cancelamento pela interface ou comunicação automática com fornecedor.
- A média de prazo mede dias corridos entre a data do pedido e a data dos lotes recebidos; não mede qualidade, conformidade ou pontualidade frente a uma data prometida.
- Os novos fluxos de banco exigem validação em PostgreSQL, que não está disponível no ambiente de revisão.
- Uma prévia isolada com respostas fictícias foi conferida em desktop e mobile para Visão geral/personalização, compras, despesas/recorrências, documentos, caixa, faturamento, DRE, auditoria, importação e usuários. Não houve overflow no documento; tabelas mais largas permanecem em contêineres com rolagem horizontal. Essa inspeção verifica layout e alinhamento, não substitui validação de fluxos com dados reais nem a integração com PostgreSQL, que continua pendente.
