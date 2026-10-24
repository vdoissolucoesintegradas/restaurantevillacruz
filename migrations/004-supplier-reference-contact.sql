ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reference_contact_name text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reference_contact_role text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reference_contact_phone text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reference_contact_email text;
