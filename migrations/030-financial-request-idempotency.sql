-- Additive request ledger; existing financial records are preserved.
CREATE TABLE IF NOT EXISTS financial_requests (
 unit_id text NOT NULL REFERENCES business_units(id),
 request_key text NOT NULL,
 operation text NOT NULL,
 fingerprint text NOT NULL,
 response jsonb,
 created_by text NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(unit_id,request_key)
);
