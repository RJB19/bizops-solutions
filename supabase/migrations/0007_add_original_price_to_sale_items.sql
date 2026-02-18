ALTER TABLE sale_items
ADD COLUMN original_product_price NUMERIC;

-- Optional: Add a trigger or default value if you want to backfill existing data
-- For existing rows, you might want to set original_product_price to current selling_price
-- UPDATE sale_items SET original_product_price = selling_price WHERE original_product_price IS NULL;

-- Or if you want to ensure it's always populated for new inserts/updates:
-- ALTER TABLE sale_items ALTER COLUMN original_product_price SET NOT NULL;
