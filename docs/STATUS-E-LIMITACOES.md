# Status, premissas e limitações

## O que esta versão faz

O repositório contém uma aplicação integrada com cadastro e consulta dos módulos principais. A configuração de produção requer PostgreSQL, segredo de sessão, usuário administrador inicial e volume persistente de anexos. A migração começa com uma base vazia; não transfere nem modifica as planilhas locais.

## O que precisa de validação antes dos dados oficiais

- **CMV:** não consolidar automaticamente compras, consumo, cortesias e baixa de estoque. A regra empresarial/contábil ainda precisa ser confirmada.
- **DRE:** faturamento entra por data do lançamento confirmado; despesas entram por `accrual_date`; pagamentos ficam no controle de caixa/pagamentos sem serem somados novamente. A estrutura e os denominadores precisam ser validados com o contador.
- **Taxas e impostos:** taxas encontradas nas planilhas não são incorporadas como premissas oficiais nem aplicadas automaticamente.
- **Unidade/empresa:** os arquivos de referência mencionam Villa Cruz e Bocattino. A base inicial cria só Villa Cruz; não consolide negócios distintos.
- **Dados ausentes:** “X”, célula vazia, texto numérico inválido ou fórmula quebrada requerem revisão; não equivalem a zero.
- **Parcelas:** despesas criadas manualmente dividem o total igualmente pelas parcelas informadas. Na importação de despesa, a parcela ainda não é extraída automaticamente; use conferência manual.

## Leitura histórica das planilhas

Notas de conferência já disponíveis no contexto do projeto:

- CMV: outubro tem três semanas registradas; a soma das vendas semanais observada foi R$ 239.312,38, enquanto o total mensal estava como texto malformado (`239,312,38`). Há fórmulas apontando para célula em branco. Compras, consumo e cortesia aparecem separados.
- DRE: somente julho estava preenchido na planilha analisada. Taxas estavam como percentuais fixos e algumas linhas zeradas podem significar zero real ou ausência de carga. Um denominador de indicador parece divergente das demais linhas.
- Notas fiscais: há registros com “X” em número/data de vencimento e padrões repetidos que podem ser parcelas ou duplicidade; não deduplicar automaticamente.
- Caixa: a planilha indicada não estava acessível no caminho atual durante esta montagem. A análise histórica anterior relatou movimentos até 18 de outubro e muitos responsáveis em branco; conferir a planilha atualizada antes de migrar.

Os valores acima descrevem o material analisado anteriormente e **não são dados importados no banco**. Repita a conferência dos arquivos de origem e gere relatório de reconciliação antes de qualquer migração oficial.

## Limitações de segurança e operação

- MFA, recuperação de senha, bloqueio/reativação de usuário na interface e permissões configuráveis não estão implementados.
- A pasta local estava sem arquivos do sistema e sem remoto Git configurado. Por isso, esta versão tem autenticação própria e ainda não reutiliza a identidade/login V2 do GitHub.
- A auditoria não tem endpoint de edição/exclusão, mas ainda pode ser alterada com credenciais SQL administrativas.
- Anexos são privados pela aplicação; em Railway, configure volume persistente em `/app/data/uploads`. Não há cópia de anexo no PostgreSQL.
- Não existe rotina de backup/restore própria do aplicativo. Configure backups da plataforma e valide restauração antes de operar.
- Importação XLSX aceita faturamento, despesas e produtos, uma aba por vez; não importa caixa, DRE, CMV, pagamentos ou anexos. Não faz reconciliação contábil completa nem detecta todas as duplicidades.
- Relatórios personalizados guardam nome/fonte/filtros, mas os filtros salvos ainda não são aplicados a uma consulta customizada.
- Não há envio de lembretes, OCR, aprovação de lançamentos, fechamento de mês nem integração com PDV/iFood/banco.
- O sistema não substitui revisão contábil e não deve ser tratado como fonte fiscal.

## Validação de produto

- **Problema:** os registros diários estão fragmentados entre planilhas com fórmulas e convenções diferentes.
- **Hipótese:** um fluxo curto de lançamento com histórico central reduzirá retrabalho e melhorará a visibilidade de vencimentos/estoque.
- **Experimento:** operar em homologação por um período, paralelamente às planilhas, sem tratá-lo como saldo oficial.
- **KPIs:** lançamentos diários completos; divergência na reconciliação; tempo médio para registrar venda/despesa; vencimentos registrados no prazo; ajustes de estoque com motivo.
- **North Star:** registros operacionais reconciliados no prazo, com origem e responsável.
- **Critério de sucesso proposto:** um mês de operação paralela com 100% dos fechamentos de caixa justificados e divergência de totais explicada antes da migração definitiva.
