-- 0006_alter_stock_movements_quantity_to_numeric.sql

ALTER TABLE public.stock_movements
ALTER COLUMN quantity TYPE NUMERIC;
