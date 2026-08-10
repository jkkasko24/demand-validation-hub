ALTER TABLE public.ad_accounts ADD COLUMN IF NOT EXISTS external_page_id text;
ALTER TABLE public.ad_accounts ADD COLUMN IF NOT EXISTS page_name text;