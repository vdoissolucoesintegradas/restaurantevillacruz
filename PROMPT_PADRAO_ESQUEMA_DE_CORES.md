# Prompt reutilizável — Sistema de cores para interfaces financeiras

Adapte o padrão abaixo ao sistema informado, preservando a identidade visual existente e respeitando as instruções do produto. Antes de implementar, inspecione a estrutura atual e identifique todos os componentes que definem cores, temas, modos claro/escuro e barras de evolução. Faça alterações consistentes e centralizadas, evitando cores soltas por página.

## Objetivo visual

Crie uma interface financeira coesa, legível e acessível. Cada tema deve ter uma cor de identidade marcante, mas usar superfícies sólidas e neutras para manter os dados em primeiro plano. Evite gradientes decorativos, fundos pretos puros e cores saturadas em grandes áreas. Use a cor principal em ações, estados selecionados e pequenos indicadores; mantenha texto e números com contraste suficiente.

## Paletas e modos

Ofereça temas predefinidos para: identidade da empresa, vermelho, azul, verde neon, amarelo, laranja, roxo, preto, branco e cinza neutro. Não inclua rosa. Cada tema precisa definir uma paleta completa para os modos claro e escuro, incluindo:

- fundo da página;
- superfície de cartões e painéis;
- superfície secundária e controles;
- texto principal e texto auxiliar;
- divisórias e bordas;
- fundo do cabeçalho e do menu lateral;
- cor de destaque para botões e estados selecionados.

No modo claro, use superfícies claras. No modo escuro, use superfícies sólidas neutras em grafite, sem azul como cor-base fixa. A identidade de cada tema aparece nos destaques configuráveis; quatro cores próprias ficam reservadas às barras de evolução. Menu lateral, cabeçalho, conteúdo, formulários, tabelas, modais, estados, ícones e botões devem mudar juntos e permanecer dentro da mesma família visual.

## Cores de evolução

As barras/gráficos de evolução são a única área que pode usar quatro cores simultâneas por tema. Permita editar cada cor pelo seletor visual e por código hexadecimal, validando o formato `#RRGGBB`. Identifique claramente os quatro usos — Primária, Comparação, Referência e Indicador — e mostre uma amostra junto a cada campo. Não use essas quatro cores para colorir cartões, ícones ou fundos comuns.

Cada tema predefinido deve fornecer seus próprios quatro valores iniciais. A personalização deve persistir após recarregar a página e funcionar nos modos claro e escuro. Uma ação de restaurar deve recuperar a paleta original do tema selecionado.

## Comportamento de edição

Alterar um tema ou seus campos deve atualizar somente a prévia/rascunho. A interface ativa só muda quando a pessoa clicar em **Aplicar tema**. Ao aplicar, persistir a escolha no perfil do usuário e no armazenamento local como contingência, sem perder o tema escolhido após atualizar a página. A troca de claro/escuro deve afetar toda a interface e preservar as cores configuradas.

## Qualidade e implementação

Centralize os valores em variáveis de tema/tokens compartilhados e faça os componentes consumirem esses tokens. Mantenha cores de sucesso, alerta, erro e informação legíveis e semanticamente distintas, sem confundi-las com a identidade do tema. Em tabelas, torne as divisórias de linhas e colunas visíveis em ambos os modos. Verifique contraste, foco de teclado, textos, placeholders, bordas, estados desabilitados e ícones.

Revise as telas afetadas em larguras desktop e celular. Corrija conteúdo cortado, rolagem horizontal não intencional, controles sobrepostos e quebra de alinhamento. Preserve os dados e fluxos existentes. Não publique nem faça deploy sem autorização explícita.

## Resultado esperado

Entregue uma tela de configurações clara com cartões dos temas predefinidos, seletor de modo, controles para cores da interface e uma seção separada com exatamente quatro cores para barras de evolução. Explique brevemente onde as cores são aplicadas e informe quais telas foram revisadas. Adapte nomes, temas e tons à marca do sistema de destino sem remover requisitos funcionais já existentes.
