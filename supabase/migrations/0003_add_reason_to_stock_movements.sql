-- 0003_add_reason_to_stock_movements.sql

ALTER TABLE public.stock_movements
ADD COLUMN reason TEXT;

COMMENT ON COLUMN public.stock_movements.reason IS 'Stores the reason for a stock movement, such as Damaged, Lost/Stolen, Physical Count Correction, or Returned Item.';
