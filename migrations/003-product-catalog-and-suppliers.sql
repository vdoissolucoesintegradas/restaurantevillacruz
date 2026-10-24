CREATE TABLE IF NOT EXISTS suppliers (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  name text NOT NULL,
  cnpj varchar(14),
  legal_name text,
  trade_name text,
  email text,
  phone text,
  postal_code text,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state char(2),
  business_status text,
  main_activity text,
  activity_code text,
  legal_nature text,
  company_size text,
  share_capital text,
  registered_on text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cnpj IS NULL OR cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_unit_cnpj_unique
  ON suppliers(unit_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS suppliers_unit_name_idx ON suppliers(unit_id, name);

CREATE TABLE IF NOT EXISTS product_catalog_options (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  kind text NOT NULL CHECK (kind IN ('item_type','expiry_alert')),
  value text NOT NULL,
  label text NOT NULL,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, kind, value)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'Ingrediente';
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_unit text NOT NULL DEFAULT 'unidade';
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_alert_days integer NOT NULL DEFAULT 7 CHECK (expiry_alert_days BETWEEN 0 AND 3650);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id text REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS supplier_id text REFERENCES suppliers(id);
CREATE INDEX IF NOT EXISTS products_unit_updated_idx ON products(unit_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS products_supplier_idx ON products(supplier_id);
