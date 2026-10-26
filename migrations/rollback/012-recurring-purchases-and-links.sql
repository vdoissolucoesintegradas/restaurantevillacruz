-- Reverse migration 012 only after exporting any recurring templates, orders and linked lots.
-- Dropping the added nullable expense fields and PO tables removes data created by these features.
ALTER TABLE stock_lots DROP COLUMN IF EXISTS purchase_order_item_id;
DROP INDEX IF EXISTS purchase_order_items_order_idx;
DROP INDEX IF EXISTS purchase_orders_unit_date_idx;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP INDEX IF EXISTS expenses_recurrence_instance_unique;
ALTER TABLE expenses DROP COLUMN IF EXISTS recurrence_instance_key;
ALTER TABLE expenses DROP COLUMN IF EXISTS recurrence_template_id;
DROP TABLE IF EXISTS recurring_expense_templates;
