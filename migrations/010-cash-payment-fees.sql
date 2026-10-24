ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS gross_amount_cents bigint,
  ADD COLUMN IF NOT EXISTS fee_percent numeric(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_cents bigint NOT NULL DEFAULT 0;

UPDATE cash_movements
SET gross_amount_cents = amount_cents
WHERE gross_amount_cents IS NULL;

ALTER TABLE cash_movements
  ADD CONSTRAINT cash_movements_fee_percent_range CHECK (fee_percent >= 0 AND fee_percent <= 100),
  ADD CONSTRAINT cash_movements_fee_nonnegative CHECK (fee_cents >= 0);
