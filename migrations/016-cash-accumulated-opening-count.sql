-- Caixa acumulado: depósitos e saques com o caixa fechado descontam do saldo acumulado,
-- e a abertura do turno guarda o saldo do sistema, o valor contado e a quebra (diferença).
ALTER TABLE cash_sessions
  ADD COLUMN IF NOT EXISTS opening_system_cents bigint,
  ADD COLUMN IF NOT EXISTS opening_counted_cents bigint,
  ADD COLUMN IF NOT EXISTS opening_difference_cents bigint,
  ADD COLUMN IF NOT EXISTS opening_reason text;

ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS between_sessions boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS cash_movements_between_sessions_idx ON cash_movements(unit_id, created_at) WHERE between_sessions;
