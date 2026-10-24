ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_to_base_quantity numeric(14,6) NOT NULL DEFAULT 1 CHECK (purchase_to_base_quantity > 0);
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS purchase_to_base_quantity numeric(14,6) NOT NULL DEFAULT 1 CHECK (purchase_to_base_quantity > 0);
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS cost_normalized boolean NOT NULL DEFAULT false;
