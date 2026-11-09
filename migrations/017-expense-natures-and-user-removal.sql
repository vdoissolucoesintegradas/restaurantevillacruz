-- Naturezas de despesa: opções da lista "Natureza" no lançamento, gerenciadas em Configurações.
CREATE TABLE IF NOT EXISTS expense_natures (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES business_units(id),
  name text NOT NULL,
  created_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_natures_unit_name_idx ON expense_natures(unit_id, lower(name));

-- As naturezas já digitadas nos lançamentos viram opções da lista, sem duplicar maiúsculas/minúsculas.
INSERT INTO expense_natures(id, unit_id, name)
SELECT gen_random_uuid()::text, unit_id, min(left(btrim(nature), 100))
FROM expenses
WHERE btrim(coalesce(nature, '')) <> ''
GROUP BY unit_id, lower(left(btrim(nature), 100))
ON CONFLICT DO NOTHING;

-- Exclusão de usuários: quem já tem histórico fica arquivado (fora da lista e sem acesso) para preservar a auditoria.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
