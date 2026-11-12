CREATE TABLE IF NOT EXISTS bank_reconciliations (
 id text PRIMARY KEY,
 unit_id text NOT NULL REFERENCES business_units(id),
 account_id text NOT NULL REFERENCES bank_accounts(id),
 as_of date NOT NULL,
 observed_cents bigint NOT NULL,
 ledger_cents bigint NOT NULL,
 difference_cents bigint NOT NULL,
 source_document text NOT NULL,
 notes text,
 created_by text NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (difference_cents=observed_cents-ledger_cents)
);
CREATE INDEX IF NOT EXISTS bank_reconciliations_history ON bank_reconciliations(unit_id,created_at DESC);
