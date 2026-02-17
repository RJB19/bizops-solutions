-- 0004_add_notes_to_stock_movements.sql

ALTER TABLE public.stock_movements
ADD COLUMN notes TEXT;

COMMENT ON COLUMN public.stock_movements.notes IS 'Stores additional notes or comments for a stock movement, providing more context for adjustments.';
