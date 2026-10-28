# Carga das planilhas do Villa Cruz

Tela **Importar Excel → Carga das planilhas do Villa Cruz** (administrador, proprietário e financeiro). Lê de uma vez as planilhas de caixa, notas fiscais, CMV e DRE, mostra o que será lançado e só grava depois de **Confirmar carga**. Não usa migração nova: grava nas tabelas que já existem.

## Como usar

1. Escolha os arquivos `.xlsx` (até 6). O nome do arquivo não importa: o sistema reconhece cada aba pelo conteúdo.
2. Escolha como tratar as notas fiscais vencidas (veja abaixo) e clique em **Ler e conferir**.
3. Confira totais, avisos e o que já existe no sistema. Clique em **Confirmar carga**.
4. O arquivo precisa ser o mesmo da conferência; se mudar, o sistema pede para conferir de novo.

Rodar a carga outra vez não duplica nada: o que já foi carregado é pulado.

## Para onde vai cada planilha

| Planilha / aba | Vai para | Regra |
|---|---|---|
| **CMV** (abas `SETEMBRO 2026`, `OUTUBRO 2026`) | Faturamento | Um lançamento por dia, canal "Salão", total geral do dia. Dias vazios ou zerados são ignorados. |
| **DRE** (aba com `RECEITA BRUTA`) | Faturamento e Despesas | Receita do mês em um lançamento por forma de pagamento (datado no último dia do mês) e **CMV final** como uma despesa consolidada, já paga. Despesas zeradas e taxas percentuais fixas não são lançadas. |
| **Notas fiscais** (abas por mês) | Despesas e notas | Uma despesa por nota. Linhas da mesma nota (fornecedor, nº e emissão) viram parcelas. Nota repetida entre abas conta uma vez. |
| **Caixa** (abas `AGOSTO 2026` etc.) | Caixa da loja | Um turno fechado por mês ("Caixa reserva · Mês Ano"), com saldo anterior como abertura. Entradas viram recebimentos em dinheiro; pagamentos viram saídas. O saldo final precisa bater com o da planilha, senão aparece aviso. |

O que não tem campo no sistema (consumo semanal, cortesia e compras da semana do CMV) não é lançado.

## Notas fiscais

- Categoria pelo "OBJ. NEGÓCIO": insumo, limpeza e descartável → CMV (regra pendente); VT e uniforme → Pessoal; manutenção, utensílio e investimento → Ocupação; o resto → Sem classificação.
- A planilha não diz quem já pagou. Opções na tela:
  - **Vencidas até hoje como pagas** (padrão): parcelas com vencimento até a data da carga viram pagas (pagamento presumido na data de vencimento); as seguintes ficam em aberto. Nota sem vencimento ("X") é compra à vista e entra paga na data de emissão.
  - **Todas em aberto**: tudo fica a pagar; notas sem vencimento ficam sem data.
  - **Todas como pagas**.
- Pagamentos da carga aparecem com responsável "Carga de planilha" e não mexem no caixa nem em conta bancária.
- Correções automáticas, sempre listadas nos avisos: vencimento com ano muito distante (ex.: 2029) usa o ano da emissão. Vencimento anterior à emissão é mantido e avisado.
- Pagamentos feitos pelo caixa reserva (ex.: hortifrúti) **não** são ligados às notas; as duas coisas ficam registradas separadamente.

## Caixa reserva

- Data fora do mês da aba usa a data da linha anterior e é avisada (ex.: 29/09/2029).
- Responsável: só vale nome simples (ex.: CAIO). Textos soltos da coluna viram observação e o responsável fica "Não informado".
- Categoria da saída sugerida pela descrição: vale transporte, pessoal (diárias, salário, gratificação), compras de insumos, manutenção, transporte, retiradas e PPR, depósito bancário e outras despesas. A descrição original fica intacta.
- Depósitos bancários da planilha entram como saída com a categoria "Depósito bancário", mas **sem** movimento em conta, porque a planilha não diz qual conta recebeu. Se quiser refletir no saldo bancário, lance o recebimento em **Fluxo financeiro → Recebimento no banco** (não use "Depósito do caixa", que mexeria de novo no caixa).
- Os turnos entram fechados. Depois da carga, abra um novo turno com o saldo contado (o último fechamento da planilha de outubro foi R$ 7.144,88 em 18/10/2026).

## Conferências e proteções

- Mês fechado bloqueia a carga inteira (nada é gravado).
- Dia que já tem faturamento lançado à mão não é repetido; nota já cadastrada (mesmo fornecedor, número, emissão e valor) também não.
- Tudo acontece em uma única transação: se algo falhar, nada fica pela metade.
- Toda linha carregada tem `[carga <código>]` nas observações e a carga é registrada na auditoria.

## Desfazer uma carga

Não há botão. Para desfazer, use o código `[carga …]` mostrado ao final (ou na auditoria) com um administrador de banco, **depois de exportar uma cópia**. Substitua `CODIGO`:

```sql
BEGIN;
DELETE FROM expense_payments WHERE expense_id IN (SELECT id FROM expenses WHERE notes LIKE '%[carga CODIGO]%');
DELETE FROM expense_installments WHERE expense_id IN (SELECT id FROM expenses WHERE notes LIKE '%[carga CODIGO]%');
DELETE FROM expenses WHERE notes LIKE '%[carga CODIGO]%';
DELETE FROM sales WHERE notes LIKE '%[carga CODIGO]%';
DELETE FROM cash_movements WHERE notes LIKE '%[carga CODIGO]%';
DELETE FROM cash_sessions s WHERE s.close_reason LIKE 'Carga histórica%' AND NOT EXISTS (SELECT 1 FROM cash_movements m WHERE m.session_id = s.id);
COMMIT;
```

## Verificação

O fluxo foi exercitado com o `server.js` real contra PostgreSQL em memória (PGlite) usando as quatro planilhas originais: 53 lançamentos de faturamento (R$ 971.132,82), 254 notas em 284 parcelas (R$ 386.331,84) e 3 turnos de caixa com 642 movimentos, saldos finais R$ 1.542,09, R$ 1.691,81 e R$ 7.144,88. Falta repetir no PostgreSQL da Railway.
