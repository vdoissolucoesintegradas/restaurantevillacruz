# Escopo de evolução — Gestão completa para restaurante

**Status:** proposta de escopo para alinhamento com Villa Cruz e cliente.  
**Base:** repositório atual do Villa Cruz · Gestão e promessa comercial informada pelo responsável.  
**Objetivo:** transformar os módulos atuais em controles operacionais confiáveis, demonstráveis e auditáveis para estoque, caixa, DRE e relatórios gerenciais.

## 1. O que a promessa significa no produto

| Promessa ao cliente | Capacidade necessária para cumprir | Estado do sistema atual |
|---|---|---|
| Sistema completo de gestão | Cadastros, usuários e perfis, registros rastreáveis, visão diária, histórico, anexos, importação e exportação segura. | Há uma aplicação com módulos operacionais e financeiros, unidade Villa Cruz, perfis fixos, auditoria e alguns fluxos de importação/exportação. Ainda é uma primeira versão, sem ciclo financeiro fechado nem integrações com PDV/bancos. |
| Gestão de estoque com validades e avisos | Saldo por produto/lote/local, recebimento, consumo/baixa, contagem, perdas, validade, FEFO, alertas e relatórios acionáveis. | Há produto, saldo agregado por lote, fornecedor em texto livre, custo unitário, validade, movimentações, mínimo, alertas básicos e consumo FEFO. Faltam compras estruturadas, locais, contagem guiada, fichas técnicas, consumo por venda e relatórios completos de estoque. |
| Gestão de caixa com entradas, saídas e fechamento | Abertura por turno, registro auditável de movimentos, saldo esperado, contagem, diferença, justificativa, fechamento protegido e consulta histórica. | Abertura, entrada/saída, fechamento, diferença com justificativa e auditoria já existem. Ainda é um caixa reservado único por unidade, sem conciliação consolidada por forma de pagamento ou relação completa com vendas. |
| DRE completo | Plano de contas validado, receita e deduções rastreáveis, CMV com fórmula aprovada, despesas por competência, fechamento e drill-down até as origens. | A DRE é preliminar: usa faturamento diário e despesas por competência; pagamentos não são somados novamente. CMV, taxas, impostos, classificações e validação contábil ainda estão pendentes. |
| Relatórios gerenciais personalizáveis | Consultas executadas com filtros reais, períodos comparáveis, detalhamento, exportação e configuração salva reproduzível. | Há CSV de alguns domínios e gravação de configurações; filtros salvos ainda não executam relatórios personalizados. |

**Conclusão de produto:** os módulos já demonstram parte da promessa, mas não se deve vender a versão atual como estoque de restaurante completo, DRE contábil ou relatórios personalizáveis concluídos. O escopo abaixo fecha essas lacunas por etapas.

## 2. Princípios e limites de escopo

- PostgreSQL permanece como fonte de verdade. Cada saldo deve ser reconstituível por eventos de origem, responsável e horário.
- Quantidades devem respeitar unidade-base e conversões aprovadas; dinheiro deve continuar em centavos inteiros.
- Não interpretar campo vazio como zero nem deduplicar silenciosamente importações.
- Separar movimentos de estoque, caixa, competência contábil e recebimento bancário; um registro não pode aparecer duas vezes no resultado.
- Alterações em valor/saldo ficam em histórico; correções devem gerar reversão/ajuste autorizado, não apagar o evento original.
- DRE gerencial não será apresentada como apuração fiscal ou contábil oficial sem validação da contabilidade.
- Integrações com PDV, iFood/marketplaces, bancos e emissão fiscal ficam como conectores opcionais com escopo, documentação e homologação próprios. A tela não deve simular integração onde só existe lançamento/importação manual.
- Mesa, comanda, KDS, delivery próprio, emissão de NFC-e, folha, fiscal, CRM e reservas não fazem parte da promessa listada. Só entram se o cliente confirmar que espera operação de salão/pedido/POS dentro do Villa Cruz Gestão.

## 3. Escopo funcional por módulo

### 3.1 Base comum de gestão

**Cadastros e rastreabilidade**

- Unidade, usuários, perfis, categorias e parâmetros com vigência.
- Origem do registro: manual, importação ou integração; usuário, data/hora, unidade e referência documental.
- Auditoria de criação, alteração, fechamento, ajuste, cancelamento e reversão.
- Anexos privados vinculados a compra, lote, despesa, movimento ou fechamento, com acesso conforme o perfil.
- Busca e filtros que atuam nos dados exibidos; paginação para listas extensas.
- Estados explícitos de carregamento, vazio, falha de gravação e sucesso confirmado pelo servidor.

**Critérios de aceite**

1. Um gestor consegue identificar autor, horário, unidade e origem de cada evento operacional/financeiro.
2. Permissões de escrita são verificadas no servidor; ocultar botão no navegador não é controle de acesso.
3. Tentativa de repetição da mesma ação financeira não cria movimento duplicado sem aviso ou chave de idempotência apropriada.

### 3.2 Estoque de restaurante — prioridade máxima

#### A. Catálogo de itens

- Cadastro de ingrediente/insumo, embalagem/descartável e item preparado/vendido, conforme categorias aprovadas pela operação.
- Nome, código/SKU opcional, categoria, unidade-base, status ativo, quantidade mínima/parâmetro de reposição, controla validade sim/não, fornecedores e documentos associados.
- Cadastro de unidades de compra e de consumo com conversões explícitas (por exemplo, caixa → unidade, kg → g), fator, responsável e vigência. Não converter por aproximação silenciosa.
- Local de estoque opcional (recebimento, depósito, cozinha/bar ou outros nomes definidos pelo cliente); saldo por local se a operação realmente separar fisicamente.
- Distinguir item sem controle de validade de lote sem data informada. Ausência de validade não equivale a validade futura.

#### B. Compras e recebimento

- Cadastro de fornecedor com identificação única suficiente para histórico de preços e contatos/documentos necessários.
- Solicitação/lista de compra sugerida a partir de estoque mínimo aprovado; não envia pedido automaticamente.
- Pedido de compra opcional com itens, unidade de compra, quantidade, preço previsto, aprovador e status. Só incluir aprovação se o cliente definir quem aprova e limites.
- Recebimento parcial ou total: fornecedor, documento, data, item, unidade/quantidade recebida, custo unitário, lote, validade quando aplicável, destino/local e usuário responsável.
- Permitir anexar nota/comprovante. Registrar divergência entre quantidade pedida e recebida sem reescrever o pedido original.
- Entrada no saldo e evento de recebimento devem ser atômicos: ou ambos gravam, ou nenhum grava.

#### C. Lotes, validade e FEFO

- Consultar lotes por produto com quantidade recebida/remanescente, fornecedor, documento, data de recebimento, validade, custo e local.
- Alertas separados: vencido com saldo, vence hoje, vence dentro da janela configurada, mínimo atingido/abaixo do mínimo.
- Cada alerta leva à lista filtrada e à ação permitida (conferir, consumir, transferir, registrar perda). Não declarar lote utilizável só porque a data está vazia.
- Saída automática por FEFO: priorizar validade mais próxima entre lotes utilizáveis; permitir seleção de lote quando o processo exigir e guardar alocação por lote.
- Bloquear consumo de lote vencido conforme regra aprovada; perda/descarte deve manter motivo, quantidade, responsável e horário.
- Mostrar unidade da quantidade e destacar saldo de cada lote para não comparar caixa com unidade avulsa.

#### D. Movimentações, consumo e perdas

- Livro imutável de entradas, consumo, perda/descarte, cortesia, transferência, devolução e ajuste aprovado. Usar apenas tipos realmente necessários e aprovados.
- Cada movimento contém produto, lote/local, quantidade na unidade-base, tipo, motivo, referência, responsável, horário e origem.
- Não lançar saída acima do saldo disponível. A operação usa transação e bloqueio/controle de concorrência para impedir saldo negativo.
- Transferência entre locais registra origem e destino na mesma transação e não altera o saldo total da unidade.
- Correção posterior registra reversão e novo movimento; manter o evento original na auditoria.

#### E. Contagem física

- Abrir contagem por local, categoria ou lista de itens; identificar responsável, horário, critério de corte e quem pode editar/fechar.
- Registrar quantidade contada sem expor saldo teórico ao contador se o procedimento exigir contagem cega (decisão operacional).
- Ao conferir, mostrar sistema × físico × diferença com unidade clara; pedir motivo para divergência conforme regra definida.
- Contagens concorrentes do mesmo escopo são bloqueadas ou tratadas com snapshot e movimentos ocorridos durante a contagem; nunca sobrescrever saldo novo por uma contagem antiga.
- Fechar contagem gera ajuste auditável por item/lote e relatório recuperável. Contagem fechada só pode ser corrigida por reversão autorizada.

#### F. Fichas técnicas e baixa por venda — etapa dependente

- Ficha técnica vincula item vendido/preparado aos insumos, quantidade por rendimento, unidade, perdas, substituições e embalagem quando aplicável.
- Versionar ficha com vigência e responsável; não recalcular vendas históricas com uma ficha atualizada posteriormente.
- Importar vendas por item a partir de arquivo aprovado ou integrar com PDV homologado. A venda por total diário/canal atual não informa quantidade de cada produto e não é suficiente para baixa automática.
- Calcular consumo teórico apenas quando houver venda por item e ficha vigente. Comparar com consumo real e exibir diferença sem transformar o cálculo em ajuste automático.

#### G. Relatórios e métricas de estoque

- Posição atual por produto, lote, unidade e local; exibir saldo e unidade-base.
- Lotes vencidos/próximos, itens abaixo do mínimo, lista de reposição, entradas por período/fornecedor e perdas/cortesias/ajustes por motivo.
- Histórico de custo de compra por fornecedor e produto, comparando somente unidades convertidas compatíveis.
- Extrato de movimentações com filtro e drill-down para evento/documento de origem.
- Valor financeiro do estoque e CMV só após aprovação de método de valoração, conversões e tratamento de perdas/transferências pela gestão/contabilidade.

**Critérios de aceite do estoque**

1. Receber insumo em lote com fornecedor, quantidade, unidade e validade e localizar o lote depois.
2. Alertar lote vencido/próximo e abrir a lista correspondente.
3. Dar baixa parcial respeitando FEFO e demonstrar quais lotes foram consumidos.
4. Contar estoque, explicar diferença e preservar contagem, ajuste e movimentos concorrentes no histórico.
5. Repor/transferir sem criar saldo inconsistente ou duplicar entradas.
6. Exportar posição e movimentações com filtros que correspondem à tela e ao período escolhido.

### 3.3 Caixa e fechamento

- Abrir caixa por unidade/caixa/turno autorizado, usuário e saldo inicial contado.
- Registrar entrada e saída com valor, tipo, categoria, forma de pagamento, descrição, responsável, referência/anexo e motivo quando aplicável.
- Distinguir caixa físico, pagamento eletrônico e recebimento bancário. Não somar cartão/PIX como dinheiro contado sem a regra operacional correspondente.
- Mostrar livro do turno completo, saldo esperado e composição por movimento/forma, com origem e responsável.
- Fechar informando valor contado; apresentar diferença em reais e exigir justificativa quando divergente (já existe para o caixa atual).
- Impedir dois caixas abertos simultaneamente no mesmo escopo definido e impedir duplo fechamento concorrente.
- Fechamento grava esperado, contado, diferença, responsável, data/hora e trilha. Reabrir/corrigir somente por ação autorizada que preserve o fechamento anterior e gere evento de reversão/reabertura.
- Consultar fechamentos anteriores, filtrar divergências e exportar relatório por período, turno, usuário e unidade.
- Conciliação de cartão/PIX, taxas e depósitos bancários só entra quando canais, arquivos, prazos e responsáveis forem definidos.

**Critérios de aceite do caixa**

1. Gestor confere a composição do saldo esperado antes de fechar.
2. Fechamento com diferença exige motivo; o fechamento registra autor e não pode ocorrer duas vezes para o mesmo turno.
3. Usuário sem perfil não grava entrada, saída, fechamento ou reversão pela API.
4. Relatório histórico reproduz totais e diferença do fechamento original.

### 3.4 DRE gerencial

- Definir plano de contas/categorias com grupo, sinal e regra de competência por aprovação da contabilidade.
- Exibir, em estrutura aprovada, receita bruta, deduções, receita líquida, CMV, despesas operacionais e resultado gerencial. A estrutura e cada componente devem indicar origem e fórmula.
- Receita: definir se vem do faturamento diário atual, vendas itemizadas/PDV, regime bruto ou líquido, cancelamentos/descontos e momento do reconhecimento.
- Despesas: usar competência e evitar duplicidade com pagamentos; distinguir pago, aberto, parcial e despesa em revisão sem alterar o resultado apenas por fluxo de caixa.
- CMV: definir método e fontes; separar teórico (ficha × venda por item) e real (inventário/consumo), se a contabilidade aprovar. Não tratar compras como consumo automaticamente.
- Tratar impostos, comissões, cupons, estornos, gorjetas, perdas, cortesia, consumo interno e embalagens conforme definição formal. Sem essas regras, sinalizar “não calculado/incompleto”, sem estimativa disfarçada de resultado.
- Comparar período com período anterior, orçamento/meta aprovada e canal/unidade quando dados suportarem; sempre mostrar cobertura e registros pendentes.
- Fechamento mensal com período em aberto/fechado, responsável e trilha de reabertura autorizada. Bloquear edições retroativas depois do fechamento, exceto fluxo de ajuste validado.
- Drill-down da linha da DRE até vendas/despesas/movimentos de origem e exportação reproduzível.

**Critérios de aceite da DRE**

1. Contador/gestor aprovam uma competência piloto com fórmula, plano de contas e fontes documentadas.
2. Soma do drill-down confere com cada total apresentado; pagamento de despesa não duplica a despesa da competência.
3. Período com lacuna de vendas, categoria não mapeada ou CMV não validado apresenta pendência e cobertura, não um total rotulado como completo.
4. Reabrir período fechado deixa justificativa e auditoria.

### 3.5 Relatórios gerenciais personalizáveis

- Biblioteca de relatórios de estoque, compras, perdas, caixa, fechamentos, despesas, vendas e DRE.
- Filtros coerentes com a fonte: intervalo de data, unidade, local de estoque, categoria, fornecedor, produto, lote, canal, status, turno e usuário, quando aplicável.
- “Executar relatório” aplica os filtros; “salvar configuração” armazena filtros e colunas e a configuração pode ser reexecutada com período atualizado.
- Colunas selecionáveis, ordenação, totais e agrupamentos suportados pela fonte, sem permitir somar grandezas incompatíveis.
- Acesso ao registro de origem conforme perfil; exportação CSV/XLSX com data/hora, período, filtros, unidade, moeda/unidade e totais. PDF pode entrar após validar layout e uso.
- Relatório deve mostrar carregamento, nenhum resultado, falha e filtros ativos; download representa a mesma consulta mostrada na tela.
- Não permitir que usuário salve uma configuração e a interface a chame de relatório executado sem rodar a consulta.

**Critérios de aceite dos relatórios**

1. Filtros reduzem o mesmo conjunto de dados na tela e exportação.
2. É possível abrir origem de cada total agregado sem ultrapassar autorização.
3. Uma configuração salva pode ser reexecutada e informa quais filtros estão ativos.
4. Total em centavos e quantidades respeitam moeda e unidades; totais não misturam unidades não convertidas.

### 3.6 Painel gerencial

- Pendências de estoque: vencidos, próximos, abaixo do mínimo e contagens por concluir.
- Pendências de caixa: turno aberto, fechamento pendente e divergência sem explicação.
- Pendências financeiras: contas vencidas/próximas, categorias não classificadas e período de DRE em conferência.
- Cada alerta abre a lista filtrada e sugere ação permitida; não é apenas um número decorativo.
- Indicadores mostram período, unidade, origem e cobertura; não exibir margem/CMV quando os dados não forem confiáveis.

## 4. Ordem de entrega e dependências

| Fase | Entrega | Dependências principais | Prioridade |
|---|---|---|---|
| 0. Descoberta e regras | Mapear fluxo real de recebimento, locais, unidades, fornecedores, contagem, caixa, canais, plano de contas, DRE e dados de origem. Aprovar glossário e responsável por cada regra. | Gestor, operação, contador e arquivos/extratos de exemplo. | Bloqueia cálculos e dados históricos |
| 1. Estoque rastreável | Catálogo e unidades; fornecedor/recebimento; lotes/validade; FEFO; movimentos; alertas; contagem; ajustes; relatórios operacionais. | Regras de unidades, locais, validade, motivos e contagem. | P0 |
| 2. Caixa confiável | Completar visualização por turno, composição e formas de pagamento; histórico, filtros, exportação e correções auditáveis. | Definir caixas físicos, formas de pagamento e papeis de fechamento. | P0 |
| 3. Compra e custo operacional | Solicitação/requisição, recebimento parcial, histórico comparável de custo e sugestão de reposição. | Cadastro de fornecedor, aprovações e conversão de embalagem. | P1 |
| 4. Ficha técnica/consumo | Receitas versionadas, importação de venda por item, consumo teórico e análise de variação. | Unidades, rendimento, substituição, desperdício, PDV/arquivo. | P1, condicionada |
| 5. DRE gerencial | Plano de contas, fórmula validada, CMV aprovado, drill-down e fechamento mensal. | Decisões de contabilidade/gestão e competência reconciliada. | P0 para declarar DRE completa |
| 6. Relatórios personalizáveis | Biblioteca, filtros executáveis, configuração salva funcional, exportação e origem. | Fontes confiáveis dos módulos 1–5. | P1 |
| 7. Homologação e adoção | Carga de amostra conciliada, treinamento, operação paralela, correções, aceite e plano de suporte/backup. | Critérios assinados pelo responsável do cliente. | Obrigatória antes de declarar concluído |

**Sequência prática:** não esperar DRE/CMV para entregar controle de validade, contagem ou fechamento de caixa. Entregar estoque operacional e caixa em incrementos independentes; só ativar relatórios monetários de estoque e DRE depois de validar regras e dados.

## 5. Decisões que precisam de resposta do cliente

1. **Locais:** o restaurante controla um estoque único ou separa depósito, cozinha, bar e outros locais? Quais nomes e transferências ocorrem?
2. **Unidades:** quais embalagens e conversões são usadas por item (ex.: fardo, caixa, pacote, kg, g, litro, ml, unidade)? Quem aprova fatores e mudanças?
3. **Validade:** quais itens exigem lote/data? Qual janela significa “próximo do vencimento”? Qual ação deve ser oferecida para lote vencido?
4. **Contagens:** contagem deve ser cega? Quem fecha e aprova divergência? Qual procedimento para movimento ocorrido enquanto conta?
5. **Reposição:** o mínimo atual é suficiente ou há estoque-alvo por dia de cobertura, fornecedor, lead time e dias de operação? Quem aprova pedido?
6. **Custos:** valor de estoque e custo unitário usam custo do lote, média ponderada, FIFO contábil ou outro método aprovado? Como tratar frete, bonificações e mudança de embalagem?
7. **Fichas técnicas:** quem valida ingredientes, rendimento, perda, substituições, cortesia/consumo interno e embalagem por item?
8. **Vendas por item:** qual PDV/marketplace fornece quantidade por produto, forma de pagamento, cancelamento e desconto? O projeto inclui integração ou importação manual padronizada?
9. **CMV/DRE:** qual fórmula e regime a contabilidade aprova? Como classificar compras, consumo, perdas, cortesia, imposto, comissão, taxas, estornos, gorjeta e desconto?
10. **Caixa:** caixa é físico por turno ou deve conciliar cartão/PIX também? Quem abre, movimenta, confere, fecha, aprova divergência e corrige fechamento?
11. **Relatórios:** quais decisões o gestor toma diariamente, semanalmente e mensalmente? Quais dimensões e formatos são indispensáveis?
12. **Aceite:** quem assina os testes de homologação e quais bases/períodos serão conferidos em paralelo?

## 6. Não objetivos desta entrega-base

- Não presumir operação de ponto de venda, mesa/comanda, KDS ou emissão fiscal dentro do produto.
- Não automatizar pedido de compra, baixa por venda, valor de CMV ou margem sem regra e fonte aprovadas.
- Não deduplicar documentos/importações nem alterar saldos históricos sem relatório e autorização.
- Não substituir ERP/contabilidade fiscal ou plataforma de pagamento.

Itens podem ser contratados como fases/aditivos após responder às decisões acima.

## 7. Validação, métricas e critérios de sucesso

**North Star operacional:** percentual de registros de estoque, caixa e financeiro conferidos no prazo, com origem e responsável identificáveis.

Medir linha de base em homologação antes de propor meta numérica:

- itens recebidos com unidade, fornecedor e lote/validade necessários completos;
- diferença entre contagem física e sistema, com causa e resolução registradas;
- perdas registradas por tipo, quantidade, produto e período;
- turnos fechados com contagem, composição e diferença explicada;
- despesas conciliadas sem pagamento contado novamente na DRE;
- relatórios que reproduzem os filtros e totais de origem;
- tempo de recebimento, contagem, fechamento de caixa e geração de relatório.

**Experimento:** homologação com amostra real e representativa; operar em paralelo com o controle atual por período definido pelo cliente; reconciliar diariamente estoque/caixa e mensalmente DRE com contador; só depois promover o sistema a fonte operacional oficial. Definir duração e limite aceitável de divergência com o cliente antes do piloto, sem inventar metas neste documento.

## 8. Entregáveis técnicos e governança

- PRD/regras aprovadas, dicionário de dados e fluxos de operação.
- Modelo de dados/API com migrações versionadas, índices e estratégia de reversão documentada.
- Implementação por módulo com validação no servidor, SQL parametrizado, transações, controle de concorrência, autorização por unidade/perfil e auditoria.
- Testes unitários, integração com PostgreSQL, concorrência para recebimento/contagem/fechamento, smoke de interface e roteiro manual por perfil.
- Atualização de snapshot, status/limitações, README e ADRs de decisões contábeis/operacionais.
- Plano de importação com prévia, reconciliação, duplicidades suspeitas e confirmação; nenhuma planilha oficial deve ser migrada silenciosamente.
- Procedimento de backup e restauração testada, health check, logs protegidos e ambiente de homologação.
- Release notes, manual rápido por função e registro de aceite do cliente.

## 9. Definição de “pronto para entregar”

O produto pode ser apresentado como atendendo ao escopo combinado quando:

1. Estoque suporta recebimento, lote/validade, FEFO, movimentos, perdas, contagem, ajuste auditado e relatórios de posição/alertas.
2. Caixa suporta abertura, entradas/saídas, composição, conferência, justificativa, fechamento único, histórico e correção auditável.
3. DRE tem fórmula, categorias, período e fontes aprovados por gestão/contabilidade, concilia com origens e sinaliza limitações/cobertura.
4. Relatórios salvos executam filtros reais e exportam o mesmo resultado com origem rastreável.
5. Requisitos de acesso, transação, concorrência, backup/restauração e testes de homologação foram aprovados.
6. O cliente executou os cenários de aceite e registrou aprovação dos responsáveis.

“Completo” deve ser definido contra estes limites aprovados; integração PDV, delivery, fiscal e bancária não deve ser inferida apenas pelo termo comercial.
