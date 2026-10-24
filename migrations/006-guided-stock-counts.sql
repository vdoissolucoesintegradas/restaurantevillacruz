CREATE TABLE IF NOT EXISTS stock_counts (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  count_date date NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed')),
  notes text,
  created_by text NOT NULL REFERENCES users(id),
  confirmed_by text NOT NULL REFERENCES users(id),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_count_lines (
  id text PRIMARY KEY,
  count_id text NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  system_quantity numeric(14,3) NOT NULL,
  counted_quantity numeric(14,3) NOT NULL CHECK (counted_quantity >= 0),
  difference_quantity numeric(14,3) NOT NULL,
  UNIQUE(count_id,product_id)
);
CREATE INDEX IF NOT EXISTS stock_counts_unit_date_idx ON stock_counts(unit_id,count_date DESC);
