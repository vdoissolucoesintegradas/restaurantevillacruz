-- Reverse migration 014 only after exporting bank accounts and bank movements.
-- Dropping these tables removes the bank ledger; cash_movements created by deposits and withdrawals are kept.
DROP INDEX IF EXISTS bank_movements_reverses_unique;
DROP INDEX IF EXISTS bank_movements_transfer_idx;
DROP INDEX IF EXISTS bank_movements_account_date_idx;
DROP INDEX IF EXISTS bank_movements_unit_date_idx;
DROP TABLE IF EXISTS bank_movements;
DROP INDEX IF EXISTS bank_accounts_unit_name_idx;
DROP TABLE IF EXISTS bank_accounts;
