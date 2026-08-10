CREATE TABLE public.metric_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  level text NOT NULL,
  external_ref text NOT NULL,
  variant_id uuid REFERENCES public.ad_variants(id) ON DELETE SET NULL,
  stat_date date NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  spend_cents integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, level, external_ref, stat_date)
);

GRANT SELECT ON public.metric_snapshots TO authenticated;
GRANT ALL ON public.metric_snapshots TO service_role;

ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads metric snapshots" ON public.metric_snapshots
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tests t
  JOIN public.projects p ON p.id = t.project_id
  WHERE t.id = metric_snapshots.test_id AND p.user_id = auth.uid()
));

CREATE INDEX metric_snapshots_test_idx ON public.metric_snapshots (test_id, stat_date);