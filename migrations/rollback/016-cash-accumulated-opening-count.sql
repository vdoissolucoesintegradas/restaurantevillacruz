-- Exporte os dados antes: apaga a conferência da abertura (sistema, contado, quebra) e a marca dos
-- movimentos feitos com o caixa fechado; depois disso eles deixam de entrar no saldo acumulado.
DROP INDEX IF EXISTS cash_movements_between_sessions_idx;
ALTER TABLE cash_movements DROP COLUMN IF EXISTS between_sessions;
ALTER TABLE cash_sessions
  DROP COLUMN IF EXISTS opening_reason,
  DROP COLUMN IF EXISTS opening_difference_cents,
  DROP COLUMN IF EXISTS opening_counted_cents,
  DROP COLUMN IF EXISTS opening_system_cents;
