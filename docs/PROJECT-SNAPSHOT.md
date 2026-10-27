# Project Snapshot — Villa Cruz Gestão

- **Objetivo:** substituir gradualmente controles de Excel por sistema web operacional e financeiro responsivo.
- **Estágio:** primeira versão funcional em construção; não liberada para produção financeira.
- **Stack:** Node.js 24 LTS+, Express 5, PostgreSQL, HTML/CSS/JavaScript sem framework.
- **Arquitetura:** aplicação única com API no servidor, PostgreSQL como fonte de verdade, sessão persistida no banco e arquivos anexos em armazenamento privado local/volume.
- **Módulos presentes:** faturamento, fluxo financeiro (contas bancárias, depósitos, saques, transferências e estornos), lotes/estoque, pedidos de compra e recebimentos parciais, despesas recorrentes em rascunho, parcelas/pagamentos, caixa por turno, central de anexos, histórico de importação, DRE preliminar, relatórios executáveis e salvos com exportação CSV, categorias/metas, usuários e auditoria.
- **UX presente:** Visão geral com cartões personalizáveis, reordenação por arraste/setas, filtro mensal, escalas de gráfico adaptáveis e alertas operacionais; identidade visual consistente com navegação escura e conteúdo claro. Diagnóstico das 20 melhorias em `ROADMAP-PRODUTO-E-UX.md`.
- **Escopo de produto proposto:** evolução para gestão de restaurante com estoque rastreável, caixa por turno, DRE validada e relatórios executáveis; ver `ESCOPO-EVOLUCAO-GESTAO-RESTAURANTE.md` (aguarda validações do cliente/contabilidade).
- **Unidade inicial:** Villa Cruz. O modelo separa registros por unidade; só Villa Cruz é criada na inicialização.
- **Autenticação:** login próprio do app via sessão PostgreSQL, bcrypt, CSRF, limite temporário por IP, resposta genérica e funções fixas; administrador inicial e novos usuários têm troca obrigatória de senha no primeiro acesso (mínimo de 12 caracteres). Não está conectado ao login V2 externo.
- **Integrações:** sem PDV, iFood, bancos, OCR ou contabilidade.
- **Deploy:** GitHub `main` → Railway Web + PostgreSQL + volume persistente para anexos; configurar/verificar backups da base e do volume antes do uso de dados oficiais.
- **Fonte de referência:** arquivos Excel apontados no pedido anterior. Nenhum arquivo é importado automaticamente.
- **Cálculo pendente crítico:** definição de CMV, relação entre consumo/cortesia/compras/estoque e parâmetros de taxas/impostos da DRE.
- **Riscos:** falta de MFA e recuperação de senha; configuração de HTTPS/proxy e limite compartilhado entre instâncias depende da hospedagem; aviso de privacidade precisa de confirmação do controlador, contato e práticas reais de retenção/compartilhamento; confirmação contábil pendente; importador ainda não reconcilia todos os módulos/abas; armazenamento de anexos exige volume; testes integrados com PostgreSQL e exercício de restauração ainda não executados. A prévia visual confirmou Visão geral e personalização do painel em desktop/mobile; os módulos novos precisam de inspeção em homologação com dados fictícios.
- **Diretrizes para evolução:** consulte [Diretrizes de engenharia](DIRETRIZES-ENGENHARIA.md) antes de propor ou implementar melhorias. Confirme no código cada rota, tabela, regra e módulo; itens de roadmap não representam funcionalidades existentes.

## Roadmap

1. **Fundamentos (esta entrega):** aplicação, banco, login, perfis, auditoria, lançamentos principais e implantação documentada.
2. **Validação financeira:** reconciliar os quatro arquivos, validar fórmulas, planos de contas, parâmetros vigentes e regra de CMV; expandir importador por domínio com relatório de reconciliação.
3. **Hardening e operação:** MFA, recuperação de conta, aprovação genérica e fechamento contábil, limite de login compartilhado, agendamento/validação de backups e observabilidade.
4. **Relatórios e crescimento:** filtros/campos salvos efetivos, exportação PDF, unidades adicionais e integrações oficiais aprovadas.

## Backlog prioritário

- P0: revisar SQL e permissões de todas as rotas; criar ambiente de homologação e validar ciclo completo.
- P0: validar regra de CMV e plano de contas com a Villa Cruz/contabilidade.
- P0: reconciliação de dados importados antes de uso oficial.
- P1: MFA e recuperação segura de senha.
- P1: fluxo de parcelas que trate vencimentos e pagamentos individualmente na importação.
- P1: concluir visualização/gestão dos anexos de pagamentos e estoque.
- P1: fechamento/aprovação de períodos e estorno auditável pela interface.
- P2: relatórios com filtros executáveis, drill-down e PDF.
- P2: multiunidade e parametrização de papéis/permissões por módulo.
- P2: alertas por e-mail/painel com prazos configuráveis.
