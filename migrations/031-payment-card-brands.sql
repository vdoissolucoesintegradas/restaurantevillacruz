-- Optional card brand; preserve existing payment history.
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_brand text CHECK (card_brand IS NULL OR length(card_brand) BETWEEN 1 AND 60);
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS card_brand text CHECK (card_brand IS NULL OR length(card_brand) BETWEEN 1 AND 60);
