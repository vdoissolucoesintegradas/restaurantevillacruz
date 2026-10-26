-- Preserve purchase facts separately from the normalized stock quantities.
-- NULL values intentionally identify historical lots whose packaging cannot be reconstructed.
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS purchase_quantity numeric(14,3);
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS purchase_unit text;
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS package_cost_cents bigint CHECK (package_cost_cents IS NULL OR package_cost_cents >= 0);
ALTER TABLE stock_lots ALTER COLUMN purchase_to_base_quantity DROP NOT NULL;
ALTER TABLE stock_lots ALTER COLUMN purchase_to_base_quantity DROP DEFAULT;
