ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS due_status_override text;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_due_status_override_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_due_status_override_check
  CHECK (
    due_status_override IS NULL
    OR due_status_override IN ('X', 'VENCE_HOJE', 'VENCEU')
    OR due_status_override ~ '^DAYS:(?:[1-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|36[0-5])$'
  );
