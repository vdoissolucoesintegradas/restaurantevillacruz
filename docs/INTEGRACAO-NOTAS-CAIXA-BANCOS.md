# Integração de notas, caixa e bancos

No cadastro de uma nota, a situação do pagamento começa em aberto. O usuário pode escolher pagamento em dinheiro ou débito/PIX e informar a conta de origem. A nota já paga exige uma parcela e valor positivo; pagamentos parciais, mistos e parcelados continuam disponíveis pelo registro de pagamentos da nota.

- Em aberto: cria a obrigação e as parcelas, sem movimentar caixa ou banco.
- Pago em dinheiro: registra o pagamento e uma saída vinculada à nota e ao caixa aberto da mesma unidade. O pagamento usa a data de hoje. Sem caixa aberto, aparece Abrir caixa em uma nova aba, respeitando a permissão de abertura. A nova aba abre o formulário de abertura; ao retornar à nota, o estado do caixa é consultado sem limpar os campos.
- Pago no débito/PIX: exige conta ativa da mesma unidade e lança saída bancária vinculada ao pagamento; não movimenta a gaveta.
- Falhas no pagamento durante o cadastro revertem a transação inteira, inclusive a criação da nota, parcelas e auditoria. Não há migração de pagamentos históricos.
- Pagamentos em períodos fechados, acima do saldo da parcela, com data futura ou conta inválida são bloqueados. Os bloqueios anteriores de alteração de pagamentos de caixas já fechados continuam em entries.js.
- A interface envia uma chave por operação. A migração 030 cria financial_requests para devolver a resposta de um reenvio idêntico, sem repetir a nota ou a baixa. Reuso da chave com outros dados é rejeitado. Clientes sem chave mantêm o comportamento anterior; cadastros independentes ainda exigem conferência de documento para identificar duplicidades de negócio.

O serviço compartilhado expense-payments.js atende cadastro com pagamento e pagamentos posteriores. As permissões existentes de criação de nota, pagamento e abertura de caixa são respeitadas. Saldos bancários são gerenciais; não há confirmação automática pelo banco nem conciliação com extrato.

## Resumo de notas e interface

Quatro indicadores acompanham os filtros e todas as páginas carregadas, com mês corrente como padrão: quantidade, valor total, pagamentos acumulados e saldo pendente. Rascunhos e notas canceladas/excluídas não compõem os indicadores. A agenda de parcelas mantém sua visão própria. A API de notas aceita offset, conservando lotes de até 500 registros. O botão Sair usa a sessão existente, impede reenvio e preserva a tela autenticada quando a requisição falha.

## Validação em 17/11/2026

- Teste de integração em PGlite executa todas as migrações e o handler real de criação de nota: dinheiro, débito, pagamento parcial e misto, saldos finais de banco e gaveta, reenvio, conflito de chave, isolamento entre unidades, caixa fechado e período fechado.
- Verificação de interface em 1440, 1024 e 390 px: indicadores, filtros, formulário, escolha da conta, ausência de controles fora da tela, abertura em nova aba, preservação dos campos, atualização do caixa ao voltar e logout em sucesso/erro. Respostas de API simuladas apenas na verificação visual.
- Suíte geral: 24 de 31 testes passam. As mesmas sete falhas também foram reproduzidas na versão HEAD anterior às alterações; estão em app-ui.test.js (expectativas e simulações de DOM antigas). A integração nova passa. Não houve validação contra o PostgreSQL de produção.

## Publicação

Alterações locais; publicação não realizada. A migração 030 é aditiva e deve acompanhar os arquivos de aplicação na próxima publicação conjunta. Não foram excluídos ou importados dados históricos.

## Complementos da publicação

Boleto e cartão de crédito também utilizam a conta selecionada quando o pagamento é confirmado. Formas de pagamento permitem cadastrar bandeira e vincular banco/conta; o cadastro de banco pode ser aberto em outra aba. A migração 031 adiciona bandeira opcional ao catálogo e uma fotografia da bandeira no pagamento da nota, preservando os registros antigos.

A tela de caixa compartilha os cards e filtros das notas: entradas, saídas/estornos, pagamentos de notas e saldo atual da gaveta. O filtro se aplica aos três primeiros indicadores e ao livro de movimentos. O saldo da gaveta é atual; pagamentos de notas já estão incluídos nas saídas. A agregação do período não depende do limite de 300 movimentos exibidos no livro.

O card Acumulado do mês do painel Compra/venda agora apresenta quantidade, valor e percentual de quebras sobre o faturamento confirmado do mesmo mês/unidade e até a data selecionada, com atalho Lançar quebra. Na ausência de faturamento, o percentual aparece como indisponível.
