ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS business_object text,
  ADD COLUMN IF NOT EXISTS operation_nature text;

CREATE TABLE IF NOT EXISTS daily_breakages (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  breakage_date date NOT NULL,
  quantity_kg numeric(12,3) NOT NULL CHECK (quantity_kg >= 0),
  unit_cost_cents bigint NOT NULL CHECK (unit_cost_cents >= 0),
  notes text,
  responsible text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, breakage_date)
);

CREATE INDEX IF NOT EXISTS daily_breakages_unit_date_idx
  ON daily_breakages(unit_id, breakage_date DESC);
