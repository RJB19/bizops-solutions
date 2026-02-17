-- 0001_add_company_id_and_rls.sql

-- 1. Add company_id to tables
ALTER TABLE public.products
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.sales
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.stock_batches
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.product_price_history
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.schedules
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.stock_movements
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Enable RLS on all company-specific tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
