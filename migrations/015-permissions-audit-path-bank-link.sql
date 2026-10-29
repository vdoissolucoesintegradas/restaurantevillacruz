-- Permissões por usuário, caminho do usuário na auditoria, banco por forma de pagamento,
-- exclusão visível (com restauração) e marcação de recebimentos que não passam pela gaveta.
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb;

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ui_path text;

ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_account_id text REFERENCES bank_accounts(id);
CREATE INDEX IF NOT EXISTS payment_methods_bank_account_idx ON payment_methods(bank_account_id) WHERE bank_account_id IS NOT NULL;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES users(id);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS status_before_delete text;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS affects_drawer boolean NOT NULL DEFAULT true;

ALTER TABLE bank_movements ADD COLUMN IF NOT EXISTS updated_at timestamptz;
