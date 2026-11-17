CREATE TABLE launch_responsibles (
 id text PRIMARY KEY,
 unit_id text NOT NULL REFERENCES business_units(id),
 name text NOT NULL,
 job_role text NOT NULL,
 UNIQUE(unit_id,name,job_role)
);
ALTER TABLE expenses ADD COLUMN responsible_name text, ADD COLUMN responsible_role text;
ALTER TABLE cash_sessions ADD COLUMN responsible_name text, ADD COLUMN responsible_role text;
ALTER TABLE cash_movements ADD COLUMN responsible_role text;
