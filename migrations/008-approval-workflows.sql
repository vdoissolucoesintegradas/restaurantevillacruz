CREATE TABLE IF NOT EXISTS approval_requests (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  entity_type text NOT NULL CHECK (entity_type IN ('expense','stock_adjustment')),
  entity_id text,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by text NOT NULL REFERENCES users(id),
  decided_by text REFERENCES users(id),
  decision_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS approval_requests_unit_status_idx ON approval_requests(unit_id,status,requested_at DESC);
