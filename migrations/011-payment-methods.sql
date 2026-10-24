CREATE TABLE IF NOT EXISTS payment_methods (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 60),
  fee_applicable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_unit_name_idx
  ON payment_methods(unit_id, lower(name));

INSERT INTO payment_methods(id, unit_id, name, fee_applicable)
SELECT gen_random_uuid()::text, u.id, p.name, p.fee_applicable
FROM business_units u
CROSS JOIN (VALUES
  ('Dinheiro', false),
  ('Pix', false),
  ('Cartão de crédito', true),
  ('Cartão de débito', true),
  ('Cartão alimentação', true)
) AS p(name, fee_applicable)
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods existing
  WHERE existing.unit_id=u.id AND lower(existing.name)=lower(p.name)
);
