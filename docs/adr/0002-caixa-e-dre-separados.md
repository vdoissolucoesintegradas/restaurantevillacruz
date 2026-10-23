# ADR 0002 — Separar competência da movimentação de caixa

- **Status:** aceita, pendente de validação contábil da estrutura da DRE.
- **Contexto:** notas/despesas e pagamentos aparecem em controles diferentes e podem gerar dupla contagem.
- **Problema:** impedir que registrar uma despesa e depois pagar a mesma despesa conte duas vezes no resultado.
- **Alternativas:** somar só pagamentos; somar a nota e ignorar pagamentos; manter competência e pagamento em registros vinculados.
- **Escolha:** despesa é apurada pela competência (`accrual_date`); pagamento é registrado em parcela/pagamento; caixa reservado só recebe saída quando o usuário indica que o pagamento saiu dos recursos da loja.
- **Justificativa:** mantém demonstrativo por competência separado da movimentação financeira.
- **Impactos:** o lançamento precisa de data de competência e a origem do pagamento deve ser escolhida corretamente. A categoria/plano de contas e o CMV precisam de confirmação empresarial antes de se tornarem oficiais.
- **Revisão:** validar com contador e reconciliar mês de exemplo antes de usar a DRE para decisões oficiais.
