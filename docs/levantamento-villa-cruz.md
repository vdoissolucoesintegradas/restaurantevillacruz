# Villa Cruz — levantamento inicial e decisões pendentes

**Estado:** análise inicial concluída em 20/10/2026. Os quatro arquivos foram encontrados na pasta OneDrive indicada e lidos sem editar os originais. Nenhum saldo foi migrado ou aprovado. As instruções eventualmente presentes nos arquivos foram tratadas como conteúdo de planilha, sem autoridade sobre o pedido.

## Visão dos arquivos e processos encontrados

| Arquivo | Estrutura observada | Achados relevantes |
|---|---|---|
| CMV | 19 abas mensais com dados, de abr/2025 a out/2026, e 2 abas vazias; registros semanais em blocos, colunas de segunda a domingo e totais semanais | Cabeçalhos e fórmulas mudam entre versões. A referência de 36% aparece em células diferentes. Out/2026 contém erros de divisão por zero/valor e total de faturamento mensal em texto malformado (`239,312,38`). As fórmulas de diferença não são uniformes nem alinhadas claramente ao rótulo. |
| DRE | Uma aba, “DRE MENSUALIZADO”, com 110 linhas; período informado: julho/2026 | Receita bruta de R$ 390.938,97 e meios de recebimento que somam esse total. A DRE principal mostra CMV e demais despesas de produção como zero; um bloco auxiliar calcula CMV final de R$ 138.819,57 (35,51% da receita), mas esse bloco não alimenta as linhas de CMV/resultados. Há fórmula com divisão por zero e linhas de despesas que citam Bocattino na mesma aba. |
| Caixa | Abas ago, set e out/2026, mais uma aba vazia; livro sequencial com entrada, responsável, descrição de saída, valor, responsável pelo pagamento e saldo | Outubro abre pelo saldo de setembro (R$ 1.691,81); lançamentos somam R$ 29.845,85 em entradas e R$ 24.392,78 em saídas, chegando ao saldo em cache de R$ 7.144,88. Setembro começa em R$ 1.542,09, tem movimento líquido +R$ 149,72 e chega ao saldo de R$ 1.691,81, mas a sequência apresenta saldo negativo em algumas linhas. Fórmulas de saldo foram arrastadas por linhas vazias após os movimentos. |
| Notas fiscais | 34 abas; 18 com dados e 16 abas vazias de modelo; histórico de out/2025 a out/2026 | O layout-base contém data, fornecedor, nº NF, valor, vencimento, status digitado, objetivo, natureza e observação. Out/2026 tem 117 linhas preenchidas e soma aritmética de linhas de R$ 101.132,15; o total não foi reconciliado. Há 30 marcações “X” em número de documento e 31 em vencimento/status. Nomes de fornecedor + número repetem em várias linhas com valores/prazos distintos, portanto não devem ser deduplicados automaticamente. Categorias e grafias variam. |

Os totais acima são diagnósticos da estrutura atual, não saldos confiáveis para abertura do sistema. As linhas com valores divididos por categoria ou parcela podem repetir o fornecedor e o documento legitimamente.

### Divergências e defeitos que precisam ser resolvidos

- **CMV out/2026:** a célula do total mensal de faturamento está como texto `239,312,38`; não é um valor numérico validável. Há semanas futuras em branco com fórmulas; os cacheados incluem `#DIV/0!` e `#VALUE!`. Nos períodos de 2026, a diferença aparece por vezes como cortesia menos consumo total; em outras abas, compra/meta é calculada em colunas diferentes. A fórmula de referência usa 36% em algumas abas, mas não de forma consistente.
- **CMV x DRE:** a DRE de julho deixa zeradas as linhas de inventário/compras/limpeza/descartáveis, embora o bloco de apoio calcule CMV a partir de inventário junho + compras julho − inventário julho + descartáveis e outras parcelas. O resultado final na DRE não deve ser tratado como resultado real até confirmar e corrigir a ligação.
- **DRE:** B33 (CMV) está zerado enquanto G36 calcula R$ 138.819,57 no quadro lateral; B84 resulta em R$ 343.101,08 antes desse CMV. C49 calcula B49/B52, com B52 igual a zero, gerando erro de divisão. A aba combina Villa Cruz e obrigações de Bocattino sem separação de entidade.
- **Caixa:** a fórmula de abertura de outubro referencia `SETEMBRO 2026!G323`; a sequência de setembro tem saldos negativos em pelo menos algumas linhas, embora feche em R$ 1.691,81. O saldo deve ser tratado como referência não conciliada até conferir comprovantes, linha de abertura e contagem física.
- **Notas fiscais:** datas no mês/aba nem sempre correspondem ao mês da data de emissão; por exemplo, a aba “OUTUBRO 2026” começa com documentos de 29–30/setembro. O campo “STATUS VENCIMENTO” é texto digitado e diverge de vencimentos/dias exibidos; status deve ser recalculado a partir do vencimento e pagamentos confirmados.
- **Período parcial:** outubro inclui linhas futuras/abertas ou sem data/vencimento, e não há prova de fechamento contábil. “X”, vazio, texto numérico, número ausente e zero devem permanecer estados distintos.

- A operação precisa manter faturamento diário, metas e componentes de CMV (compras, consumo e cortesias) separáveis.
- Despesas, notas, parcelas, pagamentos e movimentos do caixa reservado precisam ser registros distintos e auditáveis.
- O caixa reservado deve ser um livro de movimentos: abertura + entradas − saídas, com fechamento contado e diferenças justificadas.
- Pagamento de uma nota só afeta o caixa reservado se o vínculo for explícito.
- A DRE deve permitir configuração por categoria, entidade/unidade, competência, regra de inclusão, vigência e origem, exibindo memória de cálculo.
- Dados ausentes, zeros, textos como “X”, fórmulas quebradas e períodos parciais não podem ser convertidos silenciosamente em zero ou tratados como saldo confiável.
- Villa Cruz e Bocattino devem permanecer separados até que uma consolidação seja selecionada e autorizada.
- O parâmetro de referência de compras de 36% precisa ser editável e versionado, não uma regra fixa.

## Regras de negócio não confirmadas

1. Como “consumo”, “cortesia” e “compras” compõem o CMV semanal? Cortesias são valor de custo, preço de venda ou outra base?
2. Qual é a fórmula de CMV aprovada e quais componentes entram na DRE? Há controle de estoque inicial/final?
3. A meta de 36% usa compras realizadas, compras recebidas, notas emitidas ou outro critério? Qual o tratamento de compras de estoque e investimento?
4. Como distribuir faturamento por canal e conciliar os meios de recebimento (dinheiro, cartões, alimentação, Pix e outros)?
5. Qual competência define cada despesa: emissão, vencimento, pagamento ou apropriação? Como tratar parcelas e tributos parcelados?
6. Como definir resultado operacional, despesas após resultado, sinais e denominadores de cada percentual da DRE?
7. Quais usuários podem aprovar pagamentos, fechar períodos, estornar, excluir logicamente e consultar dados de funcionários?
8. Qual saldo e data de abertura confirmados do caixa reservado? Com que frequência e por turno ele fecha?
9. Quais categorias, subcategorias, empresas/unidades e meios de pagamento encontrados nas planilhas devem ser migrados?
10. Quais meses e versões devem ser importados, e quais totais são a referência de reconciliação?

## Separação de dados

| Tipo | Exemplos | Tratamento inicial |
|---|---|---|
| Entrada manual | faturamento, consumo, cortesia, fornecedor, vencimento, pagamento, comprovante, saldo contado | guardar autor, data, unidade e histórico de alteração |
| Calculado | totais por dia/semana/mês, saldo do caixa, atingimento da meta, percentuais da DRE | calcular no servidor a partir de lançamentos; exibir memória da regra e período |
| Parâmetro editável | metas, percentual de referência, categorias, grupos/sinais da DRE, exigência de comprovante, regras por vigência | versionar início/fim de vigência, autor e justificativa; nenhuma hipótese vira regra contábil por padrão |
| Importado | célula/linha original, aba, arquivo, fórmula/texto e valor interpretado | preservar original e registrar transformação, alerta, aprovação e reconciliação |

## Arquitetura proposta

- **Aplicação:** monólito responsivo em Next.js (TypeScript), com validação e ações sensíveis no servidor.
- **Identidade e dados:** Supabase Auth e PostgreSQL, RLS em todas as tabelas expostas; perfis e permissões residem no banco, nunca em metadados editáveis pelo usuário.
- **Arquivos:** bucket privado do Supabase Storage, políticas por vínculo/empresa e URLs assinadas de curta duração. Tipos e tamanhos permitidos devem ser checados no servidor.
- **Importador:** leitura local do arquivo para prévia, preservação do conteúdo original e confirmação explícita antes de persistir; sem conexão a planilhas locais em produção.
- **Auditoria:** eventos append-only gerados pelo servidor/banco, com ator, data, registro, ação, motivo e valores anteriores/novos; operações críticas não apagam o histórico.
- **Operação:** ambientes separados, variáveis secretas fora do repositório, migrações versionadas, backup/restore documentado e logs sem valores financeiros ou conteúdo de anexos.

O projeto Supabase disponível na conta está **inativo** e tem nome genérico. Não foi ativado, alterado ou usado. A aplicação deve receber uma configuração própria via variáveis de ambiente depois que o projeto de produção/homologação for definido.

## Modelo de dados inicial

- `companies` / `units`: entidades e unidades segregadas.
- `memberships`: usuário, empresa, função e estado do acesso.
- `permissions`: permissões configuráveis por módulo e ação, com restrição de administração.
- `audit_events`: trilha protegida contra alteração comum.
- `business_parameters`: metas e regras versionadas por empresa, unidade, chave e vigência.
- `import_batches` / `import_rows`: arquivo/aba, mapeamento, valores de origem, interpretação, avisos, rejeições, estado e reconciliação.
- Próximas fases: `daily_revenue`, `cmv_entries`, `expenses`, `installments`, `payments`, `attachments`, `cash_movements`, `cash_closings`, `dre_lines` e configurações de relatório.

Valores monetários serão armazenados como `numeric` com escala definida e moeda BRL; datas operacionais serão `date` e carimbos de alteração `timestamptz`, exibidos no fuso `America/Sao_Paulo`.

## Riscos e critérios de migração

- **Risco:** as fórmulas podem depender de abas/meses externos ou ter critérios diferentes entre versões. **Critério:** capturar fórmulas e valores originais, comparar versões, não importar fórmula quebrada como número.
- **Risco:** documentos podem ser divididos em categorias, parcelas, pagamentos à vista ou sem número. **Critério:** não deduplicar automaticamente; apresentar candidatos e pedir decisão autorizada.
- **Risco:** outubro pode estar incompleto. **Critério:** marcar período importado/parcial/pendente e reconciliar somente totais comprováveis.
- **Risco:** zero, vazio, texto e ausência de fórmula podem ter significados distintos. **Critério:** manter valor bruto e estado de interpretação por linha/célula.
- **Risco:** DRE pode misturar empresas ou competências. **Critério:** exigir seleção explícita de entidade, período e regra aprovada.
- **Critério para confiar nos saldos:** relatório por arquivo/aba com linhas aceitas, rejeitadas e alertas; totais originais e importados lado a lado; divergências justificadas; aprovação humana registrada.

## Etapas

1. **Fundamentos:** confirmar planilhas e regras; login/MFA, usuários, empresas, permissões, auditoria, parâmetros versionados e prévia de importação.
2. **Rotina diária:** faturamento, metas, CMV separado, notas/despesas, parcelas, anexos privados e caixa reservado.
3. **Gestão:** DRE configurável, memória de cálculo, relatórios, exportação autorizada e conciliação.
4. **Automação:** lembretes, OCR apenas assistido, importações recorrentes e integrações oficiais aprovadas.

## Condição atual

As quatro planilhas foram inspecionadas e mantidas intactas. As regras de CMV, DRE, competência, pagamentos e fechamento do caixa continuam pendentes de confirmação humana. A importação deve começar em rascunho, manter referência ao arquivo/aba/linha e apresentar reconciliação lado a lado; nenhum dos totais diagnósticos acima deve ser promovido automaticamente a saldo de abertura.
