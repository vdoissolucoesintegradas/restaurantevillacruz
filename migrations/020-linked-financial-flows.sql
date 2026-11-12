-- Liga os documentos operacionais aos eventos financeiros sem reescrever o histórico já importado.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id text REFERENCES suppliers(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_order_id text REFERENCES purchase_orders(id);
UPDATE expenses e SET supplier_id=s.id
FROM suppliers s
WHERE e.unit_id=s.unit_id
  AND e.supplier_id IS NULL
  AND lower(btrim(e.supplier))=lower(btrim(s.name));
CREATE INDEX IF NOT EXISTS expenses_supplier_idx ON expenses(unit_id,supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_purchase_order_idx ON expenses(unit_id,purchase_order_id) WHERE purchase_order_id IS NOT NULL;

ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS payment_source text;
ALTER TABLE expense_payments ADD CONSTRAINT expense_payments_source_check
  CHECK (payment_source IS NULL OR payment_source IN ('cash','bank','third_party'));

CREATE TABLE IF NOT EXISTS sale_receipts (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  sale_id text NOT NULL REFERENCES sales(id),
  payment_method_id text REFERENCES payment_methods(id),
  payment_method text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  settlement_on date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','received')),
  cash_movement_id text REFERENCES cash_movements(id),
  bank_movement_id text REFERENCES bank_movements(id),
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz
);
CREATE INDEX IF NOT EXISTS sale_receipts_sale_idx ON sale_receipts(sale_id,settlement_on);
CREATE INDEX IF NOT EXISTS sale_receipts_pending_idx ON sale_receipts(unit_id,settlement_on) WHERE status='pending';

ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS sale_receipt_id text REFERENCES sale_receipts(id);
ALTER TABLE bank_movements ADD COLUMN IF NOT EXISTS sale_receipt_id text REFERENCES sale_receipts(id);
CREATE UNIQUE INDEX IF NOT EXISTS cash_movements_sale_receipt_unique ON cash_movements(sale_receipt_id) WHERE sale_receipt_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bank_movements_sale_receipt_unique ON bank_movements(sale_receipt_id) WHERE sale_receipt_id IS NOT NULL;
