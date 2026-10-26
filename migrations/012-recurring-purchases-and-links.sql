CREATE TABLE IF NOT EXISTS recurring_expense_templates (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  supplier text NOT NULL,
  description text NOT NULL,
  category_id text REFERENCES categories(id),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  frequency text NOT NULL CHECK (frequency IN ('monthly','quarterly','yearly')),
  next_due_on date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_template_id text REFERENCES recurring_expense_templates(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_instance_key text;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_recurrence_instance_unique
  ON expenses(recurrence_template_id,recurrence_instance_key) WHERE recurrence_instance_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  supplier_id text NOT NULL REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','partial','received','cancelled')),
  ordered_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES purchase_orders(id),
  unit_id text NOT NULL REFERENCES business_units(id),
  product_id text NOT NULL REFERENCES products(id),
  purchase_quantity numeric(14,3) NOT NULL CHECK(purchase_quantity > 0),
  purchase_unit text NOT NULL,
  conversion numeric(14,6) NOT NULL CHECK(conversion > 0),
  expected_package_cost_cents bigint CHECK(expected_package_cost_cents IS NULL OR expected_package_cost_cents >= 0),
  received_purchase_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK(received_purchase_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS purchase_order_item_id text REFERENCES purchase_order_items(id);
CREATE INDEX IF NOT EXISTS purchase_orders_unit_date_idx ON purchase_orders(unit_id,ordered_on DESC);
CREATE INDEX IF NOT EXISTS purchase_order_items_order_idx ON purchase_order_items(order_id);
