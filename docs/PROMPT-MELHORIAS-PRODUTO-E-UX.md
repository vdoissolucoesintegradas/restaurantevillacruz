# Prompt completo — melhorias de produto e interface do Villa Cruz · Gestão

Copie o conteúdo abaixo para iniciar o trabalho de evolução do produto.

---

## PROMPT

Atue como engenheiro(a) de software sênior e especialista de produto e UX para sistemas de gestão de restaurantes. Trabalhe no repositório do **Villa Cruz · Gestão**, um sistema para restaurante de shopping com operação de salão e delivery.

Seu trabalho é transformar o sistema em uma ferramenta simples, rápida e confiável que ajude a equipe a tomar decisões e entregar resultado operacional e financeiro. Além de evoluir funcionalidades, redesenhe a interface para transmitir tecnologia, clareza e confiança. Evite adicionar complexidade visual ou operacional.

### Minha solicitação ao Codex (MY REQUEST)

Analise este repositório e implemente a evolução do **Villa Cruz · Gestão** com base nas 20 melhorias e na direção visual descritas neste documento. Primeiro confirme no código o estado real de cada área; depois priorize por impacto operacional, valor para a gestão, esforço, dependências e risco. Implemente em incrementos pequenos e coerentes, começando pelas melhorias de alto valor que não dependem de decisões de negócio pendentes, e aplique um redesenho visual consistente, moderno, tecnológico e minimalista às telas existentes.

Não entregue apenas diagnóstico, ideias ou backlog: avance com alterações revisáveis no código e na documentação. Preserve os fluxos e dados existentes, não duplique funcionalidades e não invente regras, tabelas, endpoints ou integrações. Quando uma decisão indispensável depender da gestão ou da contabilidade, registre a pergunta específica e continue os itens independentes. Ao final, informe o que foi alterado, como validar manualmente, as decisões pendentes e as migrações necessárias; não afirme que executou verificações que não realizou.

### Objetivos do produto

- Ajudar o gestor a identificar rapidamente o que exige ação hoje.
- Reduzir tempo de lançamento, conferência e fechamento.
- Aumentar a qualidade e a rastreabilidade dos dados.
- Evidenciar divergências de caixa, estoque, despesas e recebíveis antes que virem problemas maiores.
- Melhorar a leitura de vendas, custos e resultado por período e canal, respeitando a qualidade dos dados disponíveis.
- Manter a interface enxuta para uso em computador, tablet e celular durante a operação.

**North Star sugerida:** percentual de registros operacionais e financeiros conciliados no prazo, com origem e responsável identificáveis.

**Resultado esperado:** menos retrabalho e divergências sem explicação; decisões mais rápidas sobre caixa, compras, estoque, despesas e canais de venda. Cada funcionalidade deve mostrar qual decisão ou tarefa melhora e como observar esse efeito.

### Entenda o repositório antes de alterar

1. Leia `docs/PROJECT-SNAPSHOT.md`, `docs/STATUS-E-LIMITACOES.md`, `docs/DIRETRIZES-ENGENHARIA.md`, os ADRs relevantes e o README.
2. Inspecione o código, as migrações, as rotas, os componentes de interface e os dados efetivamente usados.
3. Confirme no código o que existe, o que está incompleto e o que ainda não foi iniciado. O snapshot documenta Node.js 24, Express 5, PostgreSQL e HTML/CSS/JavaScript sem framework; confirme essa stack antes de usá-la como premissa.
4. Considere as 20 melhorias abaixo como backlog a verificar. Não presuma que um item esteja implementado só porque aparece aqui.
5. Não invente endpoints, tabelas, colunas, integrações, regras contábeis, taxas, permissões ou fluxos. Quando uma regra de negócio indispensável não estiver documentada, registre a decisão pendente e pergunte objetivamente antes de implementar a parte dependente.
6. Preserve os padrões adequados do sistema. Não adicione frameworks ou dependências sem uma justificativa concreta.

### Backlog de 20 melhorias orientadas a resultado

Para cada item, primeiro identifique a evidência no código e o estado atual. Se já existir, aperfeiçoe o fluxo e a experiência sem duplicar a função. Se faltar, avalie dependências e proponha sua implementação dentro das fases abaixo. Não invente resultados financeiros quando faltarem dados confiáveis.

#### Prioridade 1 — clareza e controle diário

1. **Painel de ações do dia** — Resuma em uma tela o que precisa de atenção: fechamento pendente, caixa aberto, divergência, conta próxima do vencimento, estoque baixo e lote vencido ou perto do vencimento. Ordene por urgência; cada alerta deve levar direto à ação correspondente. Evite repetir indicadores sem uma decisão associada.

2. **Lançamentos rápidos e consistentes** — Reduza etapas para registrar venda, despesa, movimento de caixa e estoque. Use padrões seguros, campos condicionais e valores recentes quando fizer sentido. Preserve os campos necessários para auditoria e não transforme dado ausente em zero.

3. **Vendas por período e canal** — Facilite comparar hoje, semana e mês com período anterior, meta e canal, caso os dados existentes permitam. Mostre o valor total e a variação em linguagem clara; sinalize cobertura incompleta ou lançamento manual.

4. **Fechamento de caixa guiado** — Conduza abertura, movimentos, contagem e fechamento em passos curtos. Exiba saldo esperado, valor contado e diferença, sem esconder movimentos incluídos no cálculo. Reaproveite o modelo atual se ele suportar o fluxo.

5. **Tratamento de divergência de caixa** — Mostre diferença e contexto no momento do fechamento. Exija justificativa quando a regra existente ou validada pelo negócio assim determinar, registre responsável e evento na auditoria e impeça duplo fechamento concorrente.

6. **Agenda de despesas e vencimentos** — Destaque contas vencidas e próximas do vencimento, com total por faixa e acesso ao comprovante e às parcelas. Permita conferir pagamentos parciais e saldo restante sem duplicar valores na DRE.

7. **Conciliação simples de recebimentos** — Permita comparar vendas registradas, valores previstos e valores efetivamente recebidos, identificando divergências e seu estado de resolução. Antes de criar estados, campos ou regras de liquidação, confirme como cada canal informa taxas, prazos, cancelamentos e estornos.

#### Prioridade 2 — estoque, custos e delivery

8. **Lista de reposição acionável** — Reúna produtos abaixo do mínimo e estimativa de quantidade necessária, respeitando unidade de medida e saldo atual. Não gere pedido de compra automaticamente sem fluxo e regra de aprovação existentes.

9. **Alertas de validade com FEFO** — Facilite localizar lotes vencidos e próximos do vencimento, priorize o lote que vence primeiro e deixe clara a ação disponível. Mantenha perdas, consumo e ajustes distinguíveis no histórico.

10. **Contagem de estoque guiada** — Ofereça uma conferência prática por produto/lote, compare contagem física com saldo do sistema e registre diferença, motivo, usuário e horário. Proteja a atualização contra contagens simultâneas e não sobrescreva movimentos concorrentes silenciosamente.

11. **Fichas técnicas de produtos** — Avalie a inclusão de receitas que relacionem produto vendido, ingredientes e quantidades. Antes de persistir essas relações, confirme unidades, rendimento, substituições, perdas e responsável pela ficha. Mantenha o fluxo compatível com o catálogo existente.

12. **CMV com origem rastreável** — Depois de validar a regra com gestão/contabilidade, apresente CMV real e/ou teórico com período, fórmula, fontes e pendências visíveis. Não some compras, consumo, cortesia e ajuste de estoque sem regra aprovada.

13. **Resultado líquido por canal de delivery** — Avalie registrar faturamento bruto, comissão, taxas, descontos, estornos e líquido recebido por canal. Não aplique percentuais presumidos nem automatize integrações sem documentação oficial, fonte de dados e decisão do negócio.

14. **Controle de embalagens e descartáveis** — Permita acompanhar embalagem como insumo de estoque e associá-la ao pedido ou ficha técnica somente se o processo real confirmar consumo e unidade. Mostre impacto no custo e reposição sem duplicar baixas.

15. **Conferência de repasses de delivery** — Compare resumo do canal, vendas lançadas, taxas e depósito recebido; permita marcar divergência como pendente, explicada ou resolvida, com evidência e responsável. Defina o fluxo com o gestor antes de adotar estados financeiros definitivos.

#### Prioridade 3 — visão gerencial, qualidade e governança

16. **Histórico de custo por fornecedor** — Compare custo unitário de compras por produto e fornecedor ao longo do tempo, considerando unidade e data. Mostre variações relevantes sem misturar embalagens ou unidades incompatíveis.

17. **Mix de produtos e margem** — Destaque produtos/categorias com maior participação e margem apenas quando houver vendas e custos confiáveis. Apresente cobertura dos dados e permita navegar da síntese aos registros de origem.

18. **Relatórios prontos para decisão** — Ofereça relatórios essenciais para vendas, despesas, caixa e estoque com período claro, filtros funcionais e exportação coerente. Confira se filtros salvos são realmente aplicados; não apresente configuração salva como relatório executado.

19. **Importação com reconciliação e duplicidades** — Aprimore prévia, validação e confirmação para mostrar linhas aceitas, rejeitadas e suspeitas de duplicidade antes de gravar. Preserve os dados de origem, o usuário, o lote da importação e um relatório recuperável; não deduplique automaticamente sem regra confirmada.

20. **Acesso operacional mais seguro** — Revise cadastro, permissões e ciclo de vida de usuários. Avalie ativação/desativação, recuperação de acesso e autenticação reforçada conforme a arquitetura e os riscos existentes; nunca permita escalada de perfil nem exponha informações sensíveis.

### Direção visual: tecnologia com simplicidade

Redesenhe a interface de forma coerente em todas as telas, mantendo navegação familiar e priorizando leitura rápida durante uma operação corrida.

- Crie uma identidade visual tecnológica, elegante e própria para o Villa Cruz. Use uma base escura em azul-petróleo ou grafite para navegação, superfícies claras e alto contraste para conteúdo, com uma cor fria de destaque usada com moderação. Reserve verde, âmbar e vermelho para estados semânticos e acessíveis.
- Prefira tipografia legível, hierarquia clara, espaçamento consistente, ícones simples e componentes reutilizáveis. Use fontes e recursos já disponíveis no projeto; não dependa de serviços externos sem necessidade.
- Organize a navegação por tarefas frequentes e mantenha visível a unidade, o período e o usuário quando forem relevantes. Evite menus profundos, cartões em excesso, gradientes decorativos, animações supérfluas e gráficos sem decisão associada.
- Na página inicial, destaque um resumo curto, ações do dia e poucos indicadores prioritários. Use tabelas compactas e filtros simples para conferência; ofereça detalhes sob demanda.
- Em celulares e tablets, transforme tabelas largas em listas legíveis ou permita rolagem controlada; mantenha alvos de toque confortáveis e ações principais acessíveis.
- Inclua estados de carregamento, vazio, erro, sucesso e falta de conexão. Em falha de gravação, preserve o conteúdo preenchido quando possível e evite indicar sucesso antes da confirmação do servidor.
- Garanta foco de teclado, rótulos claros, contraste adequado e que estado não dependa apenas da cor.
- Mantenha valores monetários em reais na apresentação e em centavos inteiros na lógica e persistência, conforme o modelo atual.

### Segurança, integridade e compatibilidade

- Valide e normalize tudo no servidor; a validação de interface é apenas apoio.
- Use consultas parametrizadas. Aplique autenticação, autorização por perfil/unidade, sessão, cookies e CSRF já adotados pelo projeto.
- Use transações para operações relacionadas e trate repetição de envio, falha de conexão e concorrência sem criar duplicidade ou saldo inconsistente.
- Registre na auditoria ações financeiras e administrativas sensíveis, com contexto suficiente e sem segredos ou dados desnecessários.
- Trate erros com mensagens seguras para a pessoa usuária e detalhes técnicos apenas em logs protegidos.
- Não faça alteração destrutiva, migração irreversível, publicação nem implantação sem autorização explícita.
- Para toda mudança no banco, documente migração, dados existentes, reversão possível e impacto em índices/consultas. Não apague nem recalcule histórico financeiro sem plano aprovado.

### Como executar o trabalho

1. Apresente um diagnóstico conciso com evidências do repositório e a lista das 20 melhorias classificadas em: já existe, precisa de ajuste, novo, ou bloqueado por decisão de negócio.
2. Sugira a sequência de entrega considerando impacto, esforço, dependências e risco. Comece pelo menor conjunto que produza resultado observável sem criar dívida ou retrabalho.
3. Não encerre apenas com ideias ou um plano: implemente as melhorias de escopo claro em incrementos revisáveis. Se um item depender de uma regra de negócio crítica ausente, continue os itens independentes e peça a decisão pontual necessária para aquele item.
4. Faça o redesenho visual de forma consistente com o sistema existente e documente componentes ou padrões novos que sejam importantes para manutenção.
5. Ao concluir cada incremento, resuma problema, evidência, solução, arquivos e fluxos afetados, decisões pendentes, migrações e roteiro de validação manual. Informe claramente o que não foi executado e não declare testes realizados sem tê-los executado.
6. Atualize README, snapshot, limitações ou ADRs quando funcionalidades, configurações, regras ou decisões arquiteturais mudarem.

### Métricas e validação de produto

Para cada incremento, registre:

- **Problema observado:** com evidência no código ou no fluxo atual.
- **Hipótese:** por que a alteração melhora resultado ou reduz esforço/risco.
- **Métrica:** por exemplo tempo de lançamento/fechamento, percentual de fechamentos conciliados, divergências em aberto, perdas por vencimento, cobertura de custo ou importações rejeitadas.
- **Experimento:** período de uso em homologação, com conferência paralela quando os valores forem financeiros.
- **Critério de sucesso:** definido antes da adoção oficial, com gestão/contabilidade quando envolver regra financeira.

Não use metas numéricas inventadas como compromisso do negócio. Proponha valores para validação quando dados atuais não existirem.

### Formato da resposta

Responda sempre em português do Brasil, com linguagem técnica, direta e objetiva. Quando aplicável, use estas seções:

1. Diagnóstico e evidências.
2. Solução e impacto.
3. Alterações realizadas.
4. Banco de dados e segurança.
5. Validação e documentação.

---

## FIM DO PROMPT
