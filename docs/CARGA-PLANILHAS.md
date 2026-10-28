# Carga das planilhas do Villa Cruz

Tela **Importar Excel → Carga das planilhas do Villa Cruz** (administrador, proprietário e financeiro). Lê de uma vez as planilhas de caixa, notas fiscais, CMV e DRE, mostra o que será lançado e só grava depois de **Confirmar carga**. Não usa migração nova: grava nas tabelas que já existem.

## Como usar

1. Escolha os arquivos `.xlsx` (até 6, de até 10 MB cada). O nome do arquivo não importa: o sistema reconhece cada aba pelo conteúdo.
2. Escolha como tratar as notas fiscais vencidas (veja abaixo) e clique em **Ler e conferir**.
3. Confira totais, avisos e o que já existe no sistema. Clique em **Confirmar carga**.
4. O arquivo precisa ser o mesmo da conferência; se mudar, o sistema pede para conferir de novo.

Rodar a carga outra vez não duplica o que já foi carregado (veja "Conferências e proteções"). Durante a gravação a tela trava os campos para evitar dois cliques.

## Para onde vai cada planilha

| Planilha / aba | Vai para | Regra |
|---|---|---|
| **CMV** (abas `SETEMBRO 2026`, `OUTUBRO 2026`) | Faturamento | Um lançamento por dia, canal "Salão", total geral do dia. Dias vazios ou zerados são ignorados. |
| **DRE** (aba com `RECEITA BRUTA`) | Faturamento e Despesas | Receita do mês em um lançamento por forma de pagamento (datado no último dia do mês) e **CMV final** como uma despesa consolidada. Despesas zeradas e taxas percentuais fixas não são lançadas. |
| **Notas fiscais** (abas por mês) | Despesas e notas | Uma despesa por nota. Linhas da mesma nota (fornecedor, nº e emissão) viram parcelas. Nota repetida entre abas conta uma vez. |
| **Caixa** (abas `AGOSTO 2026` etc.) | Caixa da loja | Um turno fechado por mês ("Caixa reserva · Mês Ano"), com saldo anterior como abertura. Entradas viram recebimentos em dinheiro; pagamentos viram saídas. O saldo final precisa bater com o da planilha, senão aparece aviso. |

O que não tem campo no sistema (consumo semanal, cortesia e compras da semana do CMV) não é lançado. A mesma aba enviada duas vezes (por exemplo, `... (1).xlsx`) é lida só uma vez, com aviso.

## Notas fiscais

- Categoria pelo "OBJ. NEGÓCIO": insumo, limpeza e descartável → CMV (regra pendente); VT e uniforme → Pessoal; manutenção, utensílio e investimento → Ocupação; o resto → Sem classificação. Em nota com várias linhas, descrição e categoria seguem a linha de maior valor.
- A planilha não diz quem já pagou. Opções na tela:
  - **Vencidas até hoje como pagas** (padrão): parcelas com vencimento até a data da carga viram pagas (pagamento presumido na data de vencimento, nunca antes da emissão); as seguintes ficam em aberto. Nota sem vencimento ("X") é compra à vista e entra paga na data de emissão.
  - **Todas em aberto**: tudo fica a pagar; notas sem vencimento ficam sem data (a prévia mostra quantas e quanto) e não entram nas projeções por data.
  - **Todas como pagas**.
- **CMV consolidado de julho (DRE):** entra sempre como despesa baixada (qualquer opção acima), mas **sem registro de pagamento**, porque é um valor contábil (estoque inicial + compras − estoque final + extras − cortesia) e não dinheiro que saiu numa data.
- **Produto bonificado** (observação "PRODUTO BONIFICADO"): entra como nota **cancelada**, sem custo, sem pagamento e fora da DRE, só para ficar registrada.
- Pagamentos da carga aparecem com responsável "Carga de planilha" e não mexem no caixa nem em conta bancária.
- Correções e avisos automáticos, sempre listados na prévia: vencimento com ano muito distante (ex.: 2029) usa o ano da emissão; vencimento anterior à emissão é mantido; prazo acima de 40 dias é sinalizado; compras sem NF repetidas no mesmo dia e valor, ou o mesmo item comprado de fornecedores diferentes em até 3 dias, são avisadas e **mantidas**.
- Notas sem NF não têm número para conferir; por isso a carga também guarda uma referência por conteúdo (fornecedor, emissão, valor e vencimento) e não repete a mesma compra, mesmo se a planilha for reenviada com linhas em outra posição.
- Pagamentos feitos pelo caixa reserva (ex.: hortifrúti) **não** são ligados às notas; as duas coisas ficam registradas separadamente.

## Caixa reserva

- Data fora do mês da aba usa a data da linha anterior (ou o dia 1 se for a primeira) e é avisada (ex.: 29/09/2029).
- Responsável: só vale nome simples (ex.: CAIO). Textos soltos da coluna viram observação e o responsável fica "Não informado".
- Entrada com texto na coluna de descrição (ex.: "FUNDO DE RESERVA", "VENDA / FOGÃO USADO") entra como **Outras entradas**, não como dinheiro do caixa, e é avisada.
- Categoria da saída sugerida pela descrição, em ordem: depósito bancário, retiradas e PPR, transporte, vale transporte, pessoal (diárias, salário, gratificação, uniforme, vale de funcionário), manutenção e utensílios, compras de insumos e, no fim, outras despesas. A descrição original fica intacta e você pode recategorizar depois.
- Depósitos bancários da planilha entram como saída com a categoria "Depósito bancário", mas **sem** movimento em conta, porque a planilha não diz qual conta recebeu. Se quiser refletir no saldo bancário, lance o recebimento em **Fluxo financeiro → Recebimento no banco** (não use "Depósito do caixa", que mexeria de novo no caixa).
- Os turnos entram fechados. Depois da carga, abra um novo turno com o saldo contado (o último fechamento da planilha de outubro foi R$ 7.144,88 em 18/10/2026). O saldo do caixa na tela Caixa e na Visão geral é o do turno aberto ou, sem turno aberto, o valor contado no último fechamento; a carga não infla esse número.

## Conferências e proteções

- Mês fechado bloqueia a carga inteira (nada é gravado).
- Dia que já tem faturamento lançado à mão não é repetido; nota já cadastrada (mesmo fornecedor, número, emissão e valor) também não.
- Duas cargas ao mesmo tempo (dois cliques, dois usuários) são enfileiradas: a segunda vê o que a primeira gravou e pula tudo.
- Aba com mais de 10.000 linhas é ignorada com aviso (apague as linhas vazias formatadas no fim e reenvie).
- Tudo acontece em uma única transação: se algo falhar, nada fica pela metade.
- Faturamento, despesas e movimentos de caixa carregados têm `[carga <código>]` nas observações, e a carga é registrada na auditoria. Parcelas, pagamentos e turnos de caixa não têm campo de observação: os pagamentos têm responsável "Carga de planilha" e os turnos têm o motivo de fechamento "Carga histórica…".

## Desfazer uma carga

Não há botão. Para desfazer, use o código `[carga …]` mostrado ao final (ou na auditoria) com um administrador de banco, **depois de exportar uma cópia**. Só é seguro antes de alguém pagar, editar ou anexar algo às notas carregadas. Antes, confira se há pagamentos feitos depois da carga (deve retornar 0):

```sql
SELECT count(*) FROM expense_payments p JOIN expenses e ON e.id = p.expense_id
WHERE e.notes LIKE '%[carga CODIGO]%' AND p.responsible <> 'Carga de planilha';
```

Se retornar 0, substitua `CODIGO` e execute:

```sql
BEGIN;
DELETE FROM expense_payments WHERE responsible = 'Carga de planilha' AND expense_id IN (SELECT id FROM expenses WHERE notes LIKE '%[carga CODIGO]%');
DELETE FROM expense_installments WHERE expense_id IN (SELECT id FROM expenses WHERE notes LIKE '%[carga CODIGO]%');
DELETE FROM expenses WHERE notes LIKE '%[carga CODIGO]%';
DELETE FROM sales WHERE notes LIKE '%[carga CODIGO]%';
DELETE FROM cash_movements WHERE notes LIKE '%[carga CODIGO]%';
DELETE FROM cash_sessions s WHERE s.close_reason LIKE 'Carga histórica%' AND NOT EXISTS (SELECT 1 FROM cash_movements m WHERE m.session_id = s.id);
COMMIT;
```

Se a consulta de conferência retornar mais que 0, há pagamentos reais sobre notas carregadas: nesse caso não desfaça por SQL; peça ajuda.

## Verificação

O fluxo foi exercitado com o `server.js` real contra PostgreSQL em memória (PGlite) usando as quatro planilhas originais: 53 lançamentos de faturamento (R$ 971.132,82), 254 notas em 284 parcelas (R$ 386.331,84) e 3 turnos de caixa com 642 movimentos, saldos finais R$ 1.542,09, R$ 1.691,81 e R$ 7.144,88. Com a opção padrão: 260 parcelas baixadas (259 pagamentos registrados), 21 a pagar (R$ 29.729,48) e 3 bonificadas canceladas. Passou por revisão independente (três revisores e checagem adversarial) antes da publicação; os achados reais foram corrigidos. Falta repetir no PostgreSQL da Railway; a trava contra cargas simultâneas só age num banco com várias conexões.
