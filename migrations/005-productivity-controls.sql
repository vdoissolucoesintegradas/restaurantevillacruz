ALTER TABLE products ADD COLUMN IF NOT EXISTS target_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (target_quantity >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_lead_days integer NOT NULL DEFAULT 0 CHECK (supplier_lead_days BETWEEN 0 AND 365);

CREATE TABLE IF NOT EXISTS operational_tasks (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  task_date date NOT NULL,
  task_key text NOT NULL,
  title text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('abertura','fechamento','avulsa')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  assigned_to text,
  completed_by text REFERENCES users(id),
  completed_at timestamptz,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, task_date, task_key)
);
CREATE INDEX IF NOT EXISTS operational_tasks_unit_date_idx ON operational_tasks(unit_id,task_date,status);

CREATE TABLE IF NOT EXISTS budget_plans (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  month_start date NOT NULL,
  category_id text NOT NULL REFERENCES categories(id),
  planned_cents bigint NOT NULL CHECK (planned_cents >= 0),
  created_by text NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id,month_start,category_id)
);

CREATE TABLE IF NOT EXISTS period_closures (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  month_start date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_by text REFERENCES users(id),
  closed_at timestamptz,
  reopened_by text REFERENCES users(id),
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id,month_start)
);
