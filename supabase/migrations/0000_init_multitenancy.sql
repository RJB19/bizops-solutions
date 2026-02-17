-- 0000_init_multitenancy.sql

-- 1. Create the companies table
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add company_id to profiles
ALTER TABLE public.profiles
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
