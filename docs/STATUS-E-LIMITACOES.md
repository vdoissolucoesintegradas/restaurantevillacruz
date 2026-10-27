# Status, premissas e limitações

## O que esta versão faz

O repositório contém uma aplicação integrada com cadastro e consulta dos módulos principais. A configuração de produção requer PostgreSQL, segredo de sessão, usuário administrador inicial e volume persistente de anexos. Uma instalação nova começa com base vazia; as migrações pendentes desta entrega acrescentam tabelas e colunas sem importar planilhas.

- O fluxo financeiro registra contas bancárias e movimentações entre bancos e caixa da loja. Os saldos são gerenciais (saldo inicial informado + movimentos lançados) e não são conciliados automaticamente com o extrato do banco; não há importação OFX nem integração bancária. Depósitos e saques exigem turno de caixa aberto e são lançados na data de hoje. As rotas novas foram exercitadas contra um PostgreSQL em memória (PGlite), não contra o PostgreSQL da Railway.
- O visual usa uma camada extra (`public/theme-tech.css`) sobre `styles.css`: indicadores principais em cartões escuros com brilho, gráficos SVG nos dashboards com paleta própria (azul, laranja, violeta, verde-água e vermelho) e a mesma identidade âmbar da marca nos botões e na navegação. Para voltar ao visual anterior, remova o `<link>` dessa folha em `public/index.html`.
- A visão geral abre com os indicadores e gráficos antes dos alertas; quem já personalizou a ordem dos cartões mantém a própria ordem.
- A visão geral apresenta alertas acionáveis para faturamento do dia, estado do caixa (conforme visibilidade do perfil), contas a vencer/vencidas e condições de estoque. Os destinos são os módulos existentes; o painel não altera registros automaticamente.
- As telas usam tokens visuais compartilhados, navegação escura e superfícies claras. Isso é uma atualização de apresentação e não altera regras ou dados.
- O cadastro de fornecedores permite configurar por unidade quais campos complementares aparecem; nome e CNPJ continuam fixos. CNAE/atividade principal e capital social começam ocultos. O cadastro também guarda e lista um contato de referência (nome, cargo, telefone e e-mail).
- A lista de despesas mostra o saldo pendente (total menos pagamentos registrados), resume quantidade vencida/próxima e não oferece ação de pagamento para despesas quitadas ou canceladas. O detalhamento por parcela ainda não está disponível na lista.
- Pedidos de compra admitem itens e recebimento parcial; cada recebimento cria lote e movimentação de estoque na mesma transação. Recorrências geram rascunhos de despesa que exigem revisão. A central de documentos e o histórico de importações consultam anexos e relatórios já armazenados.
- A Visão geral pode ser personalizada e reordenada por arraste/setas. O filtro por mês preenche as datas inicial/final; a escala dos gráficos por canal cresce conforme os valores.

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

- Administrador inicial e usuários criados pelo administrador precisam trocar a senha no primeiro acesso. Senhas novas exigem pelo menos 12 caracteres e no máximo 72 bytes em UTF-8; o servidor bloqueia as rotas operacionais enquanto a troca estiver pendente.
- MFA, recuperação de senha e permissões configuráveis não estão implementados. Administradores podem desativar/reativar usuários; a senha inicial escolhida pelo responsável é temporária e conhecida, então substitua-a antes de liberar o endereço público a outras pessoas.
- `docs/PRIVACIDADE-RASCUNHO.html` não é servido ao público. Controlador, canal de atendimento, prazos de retenção, operadores e transferências dependem de confirmação dos responsáveis e revisão jurídica antes de publicar uma política completa.
- A aplicação usa autenticação própria por sessão; ainda não reutiliza a identidade/login V2 do GitHub.
- A auditoria não tem endpoint de edição/exclusão, mas ainda pode ser alterada com credenciais SQL administrativas.
- Anexos são privados pela aplicação; em Railway, configure volume persistente em `/app/data/uploads`. Não há cópia de anexo no PostgreSQL.
- `scripts/backup-postgres.sh` cria dump do PostgreSQL, cópia do volume de anexos e hashes; o procedimento de restauração isolada está em `docs/BACKUP-E-RESTAURACAO.md`. Agendamento, retenção e armazenamento externo dependem da infraestrutura. Na inspeção do Railway em 26/10/2026, o painel de backups do PostgreSQL e do serviço web não mostrava cópias; restauração ainda não foi exercitada.
- Importação XLSX aceita faturamento, despesas e produtos, uma aba por vez; não importa caixa, DRE, CMV, pagamentos ou anexos. Não faz reconciliação contábil completa nem detecta todas as duplicidades.
- Relatórios permitem executar e salvar consultas com período, busca e status aplicável para faturamento, despesas, movimentos e fechamentos de caixa, posição e movimentações de estoque e linhas de origem da DRE; a exportação CSV usa a mesma consulta e os mesmos filtros. A execução limita a resposta a 5.000 linhas. Colunas customizadas, agrupamentos e fechamento contábil continuam fora desta entrega.
- Não há envio de lembretes, OCR, aprovação genérica de lançamentos, fechamento contábil nem integração com PDV/iFood/banco. Recorrências geram rascunhos e os fechamentos mensais disponíveis são registros gerenciais, não fechamento fiscal/contábil.
- O sistema não substitui revisão contábil e não deve ser tratado como fonte fiscal.

## Validação de produto

- **Problema:** os registros diários estão fragmentados entre planilhas com fórmulas e convenções diferentes.
- **Hipótese:** um fluxo curto de lançamento com histórico central reduzirá retrabalho e melhorará a visibilidade de vencimentos/estoque.
- **Experimento:** operar em homologação por um período, paralelamente às planilhas, sem tratá-lo como saldo oficial.
- **KPIs:** lançamentos diários completos; divergência na reconciliação; tempo médio para registrar venda/despesa; vencimentos registrados no prazo; ajustes de estoque com motivo.
- **North Star:** registros operacionais reconciliados no prazo, com origem e responsável.
- **Critério de sucesso proposto:** um mês de operação paralela com 100% dos fechamentos de caixa justificados e divergência de totais explicada antes da migração definitiva.
