-- Reverte a migração 015. Exporte antes: apaga permissões por usuário, caminhos da auditoria e marcas de exclusão.
ALTER TABLE bank_movements DROP COLUMN IF EXISTS updated_at;
ALTER TABLE cash_movements DROP COLUMN IF EXISTS affects_drawer, DROP COLUMN IF EXISTS updated_at, DROP COLUMN IF EXISTS deleted_by, DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE expenses DROP COLUMN IF EXISTS status_before_delete, DROP COLUMN IF EXISTS deleted_by, DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE sales DROP COLUMN IF EXISTS deleted_by, DROP COLUMN IF EXISTS deleted_at;
DROP INDEX IF EXISTS payment_methods_bank_account_idx;
ALTER TABLE payment_methods DROP COLUMN IF EXISTS bank_account_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS ui_path;
ALTER TABLE users DROP COLUMN IF EXISTS permissions;
