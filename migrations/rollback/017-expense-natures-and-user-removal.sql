-- Exporte os dados antes: apaga a lista de naturezas (os lançamentos mantêm o texto da natureza)
-- e a marca de usuários excluídos; usuários arquivados continuam inativos.
DROP INDEX IF EXISTS expense_natures_unit_name_idx;
DROP TABLE IF EXISTS expense_natures;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
