# Fluxo financeiro

Módulo gerencial para acompanhar onde está o dinheiro da loja: caixa da loja (por turno) e contas bancárias. Contas, extrato e movimentações ficam na página **Bancos**; o **Fluxo financeiro** mostra os indicadores, gráficos e a projeção de contas a pagar. Cada forma de pagamento pode cair em uma conta (Pix e cartão saem do saldo da gaveta e entram no banco). Migração `014-bank-accounts-and-cash-flow.sql`; retorno em `migrations/rollback/014-bank-accounts-and-cash-flow.sql` (exporte os dados antes: a reversão apaga contas e movimentos bancários).

## Perfis

| Ação | Perfis |
|---|---|
| Ver saldos, extrato, projeção e relatório | administrador, proprietário, financeiro, consulta/auditoria |
| Registrar movimentação e estornar | administrador, proprietário, financeiro |
| Criar, editar e desativar conta | administrador, proprietário |
| Operação | sem acesso |

## Contas

- Nome único por unidade, banco opcional, tipo (corrente, poupança, digital ou outra), saldo inicial e data do saldo.
- Saldo = saldo inicial + entradas − saídas lançadas. Nenhuma movimentação pode ter data anterior ao saldo inicial.
- Conta só é desativada com saldo zero. Contas inativas não recebem movimentos.

## Movimentações

| Tipo | Efeito | Regras |
|---|---|---|
| Depósito do caixa no banco | Saída no livro do caixa (`Depósito bancário`) e entrada na conta | Exige turno aberto, data de hoje e valor até o saldo esperado do turno |
| Saque do banco para o caixa | Saída na conta e entrada no livro do caixa (`Saque para o caixa`) | Exige turno aberto, data de hoje e saldo suficiente na conta |
| Transferência entre contas | Saída na origem e entrada no destino, na mesma transação | Contas diferentes e saldo suficiente na origem; não altera o caixa |
| Recebimento no banco | Entrada na conta | Repasse de cartão, Pix e outros créditos |
| Pagamento pelo banco / Tarifa | Saída na conta | Podem deixar a conta negativa (o evento já ocorreu); o painel destaca saldo negativo |

- Depósitos e saques entram no livro do caixa sem forma de pagamento, para não aparecerem como venda no resumo por dia e forma.
- Pagamento de despesa pode sair de uma conta bancária (campo na tela de pagamento). Caixa da loja e conta bancária são excludentes. O pagamento continua vinculado à despesa e à DRE por competência.
- Datas futuras são recusadas. Toda gravação é auditada.

## Estorno

- Excluir é estornar: o estorno cria o lançamento oposto, marca o original como estornado e guarda motivo, usuário e data. Lançamentos manuais permitem editar descrição, categoria, observações e data; ver `docs/PERMISSOES-LANCAMENTOS-E-AUDITORIA.md`.
- Transferência é estornada nas duas pernas. Depósito e saque também geram o movimento oposto no caixa e exigem turno aberto.
- Um estorno não pode ser estornado. Pagamento de despesa feito pelo banco não é estornável por aqui (não existe estorno de pagamento de despesa no sistema).

## Painel

- **Total disponível** = caixa da loja + contas bancárias. O caixa é o saldo esperado do turno aberto ou, sem turno aberto, o valor contado no último fechamento.
- **Saldo após contas a pagar** = disponível − parcelas vencidas − parcelas dos próximos 30 dias (despesas confirmadas e abertas). É uma estimativa gerencial.
- Totais do período ignoram movimentos estornados e seus estornos. Depósitos, saques e transferências são movimentos internos e não entram em recebimentos nem em pagamentos.
- Gráficos de recebimentos × pagamentos usam até os 500 movimentos mais recentes do período filtrado. O relatório CSV (`Movimentação bancária`) vai até 5.000 linhas.

## Observação sobre o caixa

O saldo acumulado exibido em **Caixa da loja** soma a abertura de cada turno. Se a abertura de um turno repetir o valor contado no fechamento anterior, esse valor é contado duas vezes nesse acumulado. O fluxo financeiro não usa esse acumulado: usa o saldo esperado do turno e o valor contado.

## Verificação

As rotas foram exercitadas com o `server.js` real contra um PostgreSQL em memória (PGlite): contas, os seis tipos de movimento, bloqueios de saldo e de turno, estornos, pagamento de despesa pelo banco, fechamento do caixa depois de depósitos e estornos, relatório CSV e permissões por perfil. Falta repetir em homologação com o PostgreSQL da Railway e testar concorrência com várias conexões.
