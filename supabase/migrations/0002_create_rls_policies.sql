-- 0002_create_rls_policies.sql

-- Helper function to get the current user's company_id
CREATE OR REPLACE FUNCTION current_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id_val UUID;
BEGIN
  SELECT company_id INTO company_id_val FROM public.profiles WHERE id = auth.uid();
  RETURN company_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for companies
CREATE POLICY "Users can see their own company"
ON public.companies FOR SELECT
USING (id = current_user_company_id());

CREATE POLICY "Allow authenticated users to create a company"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- RLS Policies for products
CREATE POLICY "Users can view their own company's products"
ON public.products FOR SELECT
USING (company_id = current_user_company_id());

CREATE POLICY "Users can add products to their own company"
ON public.products FOR INSERT
WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "Users can update their own company's products"
ON public.products FOR UPDATE
USING (company_id = current_user_company_id());

CREATE POLICY "Users can delete their own company's products"
ON public.products FOR DELETE
USING (company_id = current_user_company_id());

-- RLS Policies for sales
CREATE POLICY "Users can view their own company's sales"
ON public.sales FOR SELECT
USING (company_id = current_user_company_id());

CREATE POLICY "Users can add sales to their own company"
ON public.sales FOR INSERT
WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "Users can update their own company's sales"
ON public.sales FOR UPDATE
USING (company_id = current_user_company_id());

CREATE POLICY "Users can delete their own company's sales"
ON public.sales FOR DELETE
USING (company_id = current_user_company_id());

-- RLS Policies for sale_items (relies on sales table)
CREATE POLICY "Users can view their own company's sale items"
ON public.sale_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    WHERE s.id = sale_items.sale_id AND s.company_id = current_user_company_id()
  )
);

CREATE POLICY "Users can add sale items to their own company"
ON public.sale_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales s
    WHERE s.id = sale_items.sale_id AND s.company_id = current_user_company_id()
  )
);

-- RLS Policies for stock_batches
CREATE POLICY "Users can view their own company's stock batches"
ON public.stock_batches FOR SELECT
USING (company_id = current_user_company_id());

CREATE POLICY "Users can add stock batches to their own company"
ON public.stock_batches FOR INSERT
WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "Users can update their own company's stock batches"
ON public.stock_batches FOR UPDATE
USING (company_id = current_user_company_id());

CREATE POLICY "Users can delete their own company's stock batches"
ON public.stock_batches FOR DELETE
USING (company_id = current_user_company_id());

-- RLS Policies for product_price_history
CREATE POLICY "Users can view their own company's price history"
ON public.product_price_history FOR SELECT
USING (company_id = current_user_company_id());

CREATE POLICY "Users can add price history to their own company"
ON public.product_price_history FOR INSERT
WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "Users can update their own company's price history"
ON public.product_price_history FOR UPDATE
USING (company_id = current_user_company_id())
WITH CHECK (company_id = current_user_company_id());

-- RLS Policies for schedules
CREATE POLICY "Users can view their own company's schedules"
ON public.schedules FOR SELECT
USING (company_id = current_user_company_id());

CREATE POLICY "Users can add schedules to their own company"
ON public.schedules FOR INSERT
WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "Users can update their own company's schedules"
ON public.schedules FOR UPDATE
USING (company_id = current_user_company_id())
WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "Users can delete their own company's schedules"
ON public.schedules FOR DELETE
USING (company_id = current_user_company_id());

-- RLS Policies for stock_movements
CREATE POLICY "Users can view their own company's stock movements"
ON public.stock_movements FOR SELECT
USING (company_id = current_user_company_id());

CREATE POLICY "Users can add stock movements to their own company"
ON public.stock_movements FOR INSERT
WITH CHECK (company_id = current_user_company_id());
