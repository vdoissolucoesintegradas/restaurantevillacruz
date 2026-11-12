-- Campos opcionais: registros históricos continuam sem informação, nunca inventados.
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_location text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_conditions text;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS source_document text;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS counterparty text;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS balance_delta numeric(14,3);
-- Somente tipos cujo sentido já é inequívoco podem ser preenchidos retroativamente.
UPDATE stock_movements SET balance_delta=CASE WHEN movement_type='inbound' THEN quantity ELSE -quantity END
 WHERE balance_delta IS NULL AND movement_type IN ('inbound','outbound','waste','courtesy','consumption');
CREATE OR REPLACE FUNCTION stock_movement_delta() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.balance_delta IS NULL AND NEW.movement_type IN ('inbound','outbound','waste','courtesy','consumption') THEN
  NEW.balance_delta := CASE WHEN NEW.movement_type='inbound' THEN NEW.quantity ELSE -NEW.quantity END;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stock_movement_delta_insert ON stock_movements;
CREATE TRIGGER stock_movement_delta_insert BEFORE INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION stock_movement_delta();
CREATE INDEX IF NOT EXISTS stock_movements_product_history ON stock_movements(unit_id,product_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS audit_entity_history ON audit_log(unit_id,entity_type,entity_id,created_at DESC);
