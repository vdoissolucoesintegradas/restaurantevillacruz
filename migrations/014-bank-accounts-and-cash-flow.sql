CREATE TABLE IF NOT EXISTS bank_accounts (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  bank_name text,
  account_type text NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking','savings','digital','other')),
  opening_cents bigint NOT NULL DEFAULT 0,
  opening_date date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_unit_name_idx
  ON bank_accounts(unit_id, lower(name));

CREATE TABLE IF NOT EXISTS bank_movements (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  account_id text NOT NULL REFERENCES bank_accounts(id),
  occurred_on date NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  kind text NOT NULL CHECK (kind IN ('deposit','withdrawal','transfer','receipt','payment','fee')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  category text,
  description text NOT NULL,
  notes text,
  transfer_id text,
  cash_movement_id text REFERENCES cash_movements(id),
  expense_payment_id text REFERENCES expense_payments(id),
  reverses_id text REFERENCES bank_movements(id),
  reversed_at timestamptz,
  reversed_by text REFERENCES users(id),
  reversal_reason text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_movements_unit_date_idx ON bank_movements(unit_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS bank_movements_account_date_idx ON bank_movements(account_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS bank_movements_transfer_idx ON bank_movements(transfer_id) WHERE transfer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bank_movements_reverses_unique ON bank_movements(reverses_id) WHERE reverses_id IS NOT NULL;
