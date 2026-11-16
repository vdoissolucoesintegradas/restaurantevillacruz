-- Central de pendencias e fechamento diario gerencial.
-- Estruturas aditivas: nenhum registro operacional preexistente e alterado.
CREATE TABLE IF NOT EXISTS management_pending_items (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  dedupe_key text NOT NULL,
  item_type text NOT NULL,
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('critical','high','normal')),
  title text NOT NULL,
  detail text NOT NULL,
  origin_page text NOT NULL,
  reference_type text,
  reference_id text,
  assigned_to text,
  due_on date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','verified')),
  resolution_note text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_by text REFERENCES users(id),
  resolved_at timestamptz,
  verified_by text REFERENCES users(id),
  verified_at timestamptz,
  UNIQUE(unit_id,dedupe_key)
);
CREATE INDEX IF NOT EXISTS management_pending_items_queue
  ON management_pending_items(unit_id,status,severity,due_on,opened_at);

CREATE TABLE IF NOT EXISTS management_pending_events (
  id text PRIMARY KEY,
  pending_id text NOT NULL REFERENCES management_pending_items(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('opened','reopened','assigned','status_changed','commented')),
  from_status text,
  to_status text,
  note text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS management_pending_events_history
  ON management_pending_events(pending_id,created_at,id);

CREATE TABLE IF NOT EXISTS daily_management_closures (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  business_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('open','closed','closed_with_reservation')),
  reason text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_by text REFERENCES users(id),
  closed_at timestamptz,
  reopened_by text REFERENCES users(id),
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id,business_date)
);
CREATE INDEX IF NOT EXISTS daily_management_closures_history
  ON daily_management_closures(unit_id,business_date DESC);
