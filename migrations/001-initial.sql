CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_units (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','owner','finance','operations','auditor')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_units (
  user_id text NOT NULL REFERENCES users(id),
  unit_id text NOT NULL REFERENCES business_units(id),
  PRIMARY KEY (user_id, unit_id)
);
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense','stock')),
  dre_group text CHECK (dre_group IN ('deduction','cmv','personnel','operating','administrative','occupancy','financial','other')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, name, kind)
);
CREATE TABLE IF NOT EXISTS app_settings (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, setting_key, effective_from)
);
CREATE TABLE IF NOT EXISTS sales (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  sale_date date NOT NULL,
  channel text NOT NULL DEFAULT 'Salão',
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  target_cents bigint,
  notes text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft','confirmed','void')),
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  name text NOT NULL,
  sku text,
  category_id text REFERENCES categories(id),
  base_unit text NOT NULL DEFAULT 'unidade',
  minimum_quantity numeric(14,3) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, sku)
);
CREATE TABLE IF NOT EXISTS stock_lots (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  product_id text NOT NULL REFERENCES products(id),
  lot_code text,
  supplier text,
  received_on date NOT NULL,
  expires_on date,
  quantity_received numeric(14,3) NOT NULL CHECK (quantity_received > 0),
  quantity_remaining numeric(14,3) NOT NULL CHECK (quantity_remaining >= 0),
  unit_cost_cents bigint NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  source_document text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  product_id text NOT NULL REFERENCES products(id),
  lot_id text REFERENCES stock_lots(id),
  movement_type text NOT NULL CHECK (movement_type IN ('inbound','outbound','adjustment','waste','courtesy','consumption','reversal')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  reason text,
  reference text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  supplier text NOT NULL,
  document_number text,
  issue_date date NOT NULL,
  accrual_date date NOT NULL,
  category_id text REFERENCES categories(id),
  description text NOT NULL,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  due_date date,
  payment_method text,
  nature text,
  installment_count integer NOT NULL DEFAULT 1 CHECK (installment_count > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled','review')),
  notes text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS expense_installments (
  id text PRIMARY KEY,
  expense_id text NOT NULL REFERENCES expenses(id),
  installment_number integer NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  due_date date,
  paid_cents bigint NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  UNIQUE(expense_id, installment_number)
);
CREATE TABLE IF NOT EXISTS expense_payments (
  id text PRIMARY KEY,
  expense_id text NOT NULL REFERENCES expenses(id),
  installment_id text NOT NULL REFERENCES expense_installments(id),
  paid_on date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  payment_method text,
  responsible text NOT NULL,
  paid_from_store boolean NOT NULL DEFAULT false,
  cash_movement_id text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cash_sessions (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  shift_name text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_cents bigint NOT NULL CHECK (opening_cents >= 0),
  opened_by text NOT NULL REFERENCES users(id),
  closed_at timestamptz,
  expected_cents bigint,
  counted_cents bigint,
  difference_cents bigint,
  close_reason text,
  closed_by text REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS cash_movements (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  session_id text REFERENCES cash_sessions(id),
  expense_id text REFERENCES expenses(id),
  movement_type text NOT NULL CHECK (movement_type IN ('opening','inflow','outflow','reversal')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  category text NOT NULL,
  description text NOT NULL,
  payment_method text,
  responsible text,
  notes text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attachments (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  entity_type text NOT NULL CHECK (entity_type IN ('expense','cash','sale')),
  entity_id text NOT NULL,
  original_name text NOT NULL,
  stored_name text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY,
  unit_id text REFERENCES business_units(id),
  user_id text REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS saved_reports (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  owner_id text NOT NULL REFERENCES users(id),
  name text NOT NULL,
  report_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS import_batches (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  user_id text NOT NULL REFERENCES users(id),
  source_name text NOT NULL,
  sheet_name text NOT NULL,
  import_type text NOT NULL CHECK (import_type IN ('sales','expenses','products')),
  headers jsonb NOT NULL,
  rows_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','partial','cancelled')),
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS sales_unit_date_idx ON sales(unit_id, sale_date);
CREATE INDEX IF NOT EXISTS expenses_unit_accrual_idx ON expenses(unit_id, accrual_date);
CREATE INDEX IF NOT EXISTS expenses_due_idx ON expenses(unit_id, due_date) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS expense_payments_expense_idx ON expense_payments(expense_id, paid_on);
CREATE INDEX IF NOT EXISTS lots_expiry_idx ON stock_lots(unit_id, expires_on) WHERE quantity_remaining > 0;
CREATE INDEX IF NOT EXISTS stock_movements_unit_created_idx ON stock_movements(unit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cash_movements_unit_created_idx ON cash_movements(unit_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS cash_one_open_session_per_unit_idx ON cash_sessions(unit_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS audit_unit_created_idx ON audit_log(unit_id, created_at DESC);
