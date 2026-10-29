# Permissões por usuário, lançamentos editáveis, Bancos e auditoria com caminho

Migração `015-permissions-audit-path-bank-link.sql` (retorno em `migrations/rollback/`; exporte os dados antes: a reversão apaga permissões por usuário, caminhos da auditoria, marcas de exclusão e o banco de cada forma de pagamento).

## Permissões por usuário

- **Usuários → Novo usuário / Editar acesso** (popup, só administrador). O perfil é o ponto de partida; abaixo dele há uma lista de permissões por módulo (ver, lançar, editar, excluir, pagar, abrir/fechar caixa, gerir contas…). Marque ou desmarque para liberar ou bloquear só para aquele usuário. **Voltar ao padrão do perfil** restaura a lista do perfil.
- Quando a lista é igual ao padrão do perfil, nada é gravado e o usuário continua acompanhando o perfil. Se for diferente, o usuário aparece como "Personalizado · N permissões".
- Vale na hora: o servidor lê as permissões a cada pedido; não precisa sair e entrar.
- O menu, os botões e as ações de cada tela só aparecem para quem tem a permissão. O servidor confere de novo em toda rota (`permissions.js`).
- Proteções: administrador sempre tem acesso total; ninguém altera o próprio perfil ou as próprias permissões; não dá para rebaixar ou desativar o último administrador; a gestão de usuários continua só do administrador.
- Novas permissões de editar e excluir começam liberadas só para administrador, proprietário e financeiro. Operação pode lançar faturamento e movimentos de caixa, mas editar e excluir precisam ser liberados por usuário.

## Editar, excluir, restaurar e duplicar

Clique com o **botão direito** na linha (ou no **⋮** da última coluna, que também serve no celular):

| Lançamento | Editar | Excluir | Duplicar |
|---|---|---|---|
| Faturamento | data, canal, valor, meta, observações | fica visível como **Excluído**, fora dos totais; **Restaurar** | abre o popup preenchido com a data de hoje |
| Despesa / nota | todos os campos; valor, parcelas e vencimento só sem pagamentos | **Excluída** visível, sai da DRE e das contas a pagar; só sem pagamentos; **Restaurar** | popup preenchido (sem nº de documento nem vencimento) |
| Pagamento de despesa | valor, data, forma, responsável (ajusta o caixa ou o banco junto) | volta a parcela para aberta e remove a saída do caixa ou do banco | — |
| Movimento de caixa | data, valor, meio, taxa, categoria, descrição | **Excluído** visível, sai do saldo do turno; **Restaurar** | popup preenchido |
| Movimento bancário | descrição, categoria, observações e data (só os manuais) | **Excluir (estornar)**: continua no extrato como estornado | popup preenchido |
| Conta bancária | nome, banco, tipo, saldo inicial, situação | desativar (só com saldo zero e sem forma de pagamento ligada) | popup com "(cópia)" |

Regras: mês fechado bloqueia editar, excluir e restaurar faturamento e despesas; turno de caixa já fechado bloqueia editar e excluir os movimentos dele; movimentos ligados a um pagamento de despesa, a um depósito ou saque são geridos pela tela de origem. Tudo é auditado com valores antes e depois e motivo opcional.

## Bancos

Página **Bancos** (Financeiro): saldos por conta, botões Depositar, Sacar, Transferir, Receber e Tarifa (popups), extrato com filtro e exportação, e o quadro **Forma de pagamento → banco**. O Fluxo financeiro ficou com os indicadores, gráficos e a projeção de contas a pagar.

- **Banco da forma de pagamento:** cada forma pode cair em uma conta. Pix e cartão lançados em **Caixa da loja** com banco escolhido criam o recebimento na conta (líquido da taxa), não somam no saldo esperado do turno e aparecem no livro como "cai no banco". Dinheiro, ou forma sem banco, continua na gaveta. Quem não tem a permissão de gerir contas só vê o quadro.
- Editar ou excluir o movimento de caixa atualiza o recebimento no banco; esse recebimento só se altera por ali (a tela de Bancos avisa). Conta inativa ou com data de saldo posterior à do movimento recusa o lançamento com mensagem.
- Movimentos antigos de Pix e cartão, lançados antes de escolher o banco, continuam na gaveta; para tirar da gaveta, exclua e lance de novo depois de escolher o banco.
- No pagamento de despesa, escolher a forma sugere a conta dela no campo "Saiu de uma conta bancária".

## Popup padrão e atualização sem recarregar

Todo botão Adicionar, Registrar, Novo ou Cadastrar abre um popup (faturamento, despesa, pagamento, recorrência, movimento e abertura/fechamento de caixa, movimentos e contas bancárias, pedido de compra, tarefa, usuário, forma de pagamento e categoria). Esc e clique fora fecham o popup (pedindo confirmação se houver dados preenchidos), o foco fica preso dentro dele, e ao salvar a página atual é atualizada na hora, sem "Carregando" e mantendo a rolagem.

## Auditoria com o caminho percorrido

Cada alteração guarda o caminho feito na tela, com os mesmos nomes do sistema, por exemplo:

- `Financeiro › Despesas e notas › Registrar despesa › Salvar despesa`
- `Financeiro › Faturamento e CMV › Botão direito (Faturamento de 29/10/2026) › Excluir › Excluir`
- `Administração › Usuários › Botão direito (Usuário Bia) › Editar acesso e permissões › Salvar alterações`

A tela **Auditoria** mostra a coluna "Caminho percorrido", a ação em português ("Criou · Despesa"), e filtra por caminho, ação, tipo de registro, autor e período. Registros antigos e automáticos (como a carga de planilhas, que registra o arquivo) aparecem sem caminho. O texto é enviado pelo navegador e limitado a 300 caracteres; serve para entender o percurso, não substitui o registro do que mudou.

## Caixa acumulado e abertura com contagem

Migração `016-cash-accumulated-opening-count.sql` (retorno em `migrations/rollback/`; a reversão apaga a conferência da abertura e a marca dos movimentos feitos com o caixa fechado, então exporte antes).

- **Depósito e saque não exigem turno aberto.** Com o caixa fechado, o movimento fica sem turno (aparece no livro como "com caixa fechado") e desconta (depósito) ou soma (saque) no **saldo acumulado**: último fechamento contado mais os movimentos feitos desde então. Com turno aberto, o movimento continua entrando no turno. Depósito maior que o saldo disponível é recusado, e o estorno também funciona sem turno aberto.
- **Abrir caixa** abre um popup com o **saldo do sistema** já preenchido (somente leitura) e, ao lado, o campo **Valor contado**. Em branco, o caixa abre com o valor do sistema. Preenchido e diferente, a tela mostra na hora "Falta" ou "Sobra" de R$ X, aceita uma justificativa opcional e abre o caixa com o valor contado, guardando sistema, contado, quebra e justificativa no turno e na auditoria. No primeiro caixa (sem fechamento anterior) o valor contado vira o saldo inicial, sem quebra.
- A quebra na abertura aparece no turno em andamento, na análise de divergências (coluna "Quebra na abertura" e indicador) e no CSV de fechamentos. Se o saldo do sistema mudar enquanto o popup está aberto (por exemplo, um depósito lançado em outra tela), a abertura é recusada para o usuário conferir de novo.
- Os atalhos **Receber estoque** e **Movimentar caixa** da Visão geral abrem popup na própria tela (o primeiro com escolha do produto) e respeitam as permissões do usuário.

## Verificação

Rotas exercitadas com o `server.js` real em PostgreSQL em memória (PGlite): 65 verificações de permissões, edição, exclusão, restauração, Pix para o banco e auditoria, mais 62 de bancos e caixa (inclui caixa acumulado e quebra na abertura) e 45 da carga de planilhas; 23 testes automáticos da tela. Layout conferido em 390, 768 e 1440 px. Falta repetir no PostgreSQL da Railway.
