-- M2 T1 schema (restored; already applied to the live database).
-- OAuth tokens live in ad_account_tokens: service-role only, never API-readable.

create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null default 'meta',
  external_account_id text,
  account_name text,
  token_expires_at timestamptz,
  scopes text[],
  created_at timestamptz default now()
);

grant select, delete on public.ad_accounts to authenticated;
grant all on public.ad_accounts to service_role;
alter table public.ad_accounts enable row level security;

drop policy if exists "owner reads ad accounts" on public.ad_accounts;
create policy "owner reads ad accounts" on public.ad_accounts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "owner disconnects ad accounts" on public.ad_accounts;
create policy "owner disconnects ad accounts" on public.ad_accounts
  for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.ad_account_tokens (
  ad_account_id uuid primary key references public.ad_accounts on delete cascade,
  oauth_token_encrypted text not null,
  updated_at timestamptz not null default now()
);

grant all on public.ad_account_tokens to service_role;
alter table public.ad_account_tokens enable row level security;

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','review','live','stopped','done')),
  budget_cap_cents int not null check (budget_cap_cents > 0),
  currency text not null default 'usd',
  starts_at timestamptz,
  ends_at timestamptz,
  target_cpa_cents int,
  plan jsonb,
  created_at timestamptz default now()
);

grant select, insert, update on public.tests to authenticated;
grant all on public.tests to service_role;
alter table public.tests enable row level security;

drop policy if exists "owner reads tests" on public.tests;
create policy "owner reads tests" on public.tests
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

drop policy if exists "owner inserts tests" on public.tests;
create policy "owner inserts tests" on public.tests
  for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

drop policy if exists "owner updates tests" on public.tests;
create policy "owner updates tests" on public.tests
  for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests on delete cascade,
  ad_account_id uuid not null references public.ad_accounts on delete restrict,
  platform text not null default 'meta',
  external_campaign_id text,
  external_adset_ids jsonb,
  budget_split_pct int not null default 100 check (budget_split_pct between 0 and 100),
  status text,
  created_at timestamptz default now()
);

grant select on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;

drop policy if exists "owner reads campaigns" on public.campaigns;
create policy "owner reads campaigns" on public.campaigns
  for select to authenticated
  using (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ));

create table if not exists public.ad_variants (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests on delete cascade,
  angle_name text not null,
  headline text not null,
  body text,
  image_url text,
  enabled boolean not null default true
);

grant select, insert, update, delete on public.ad_variants to authenticated;
grant all on public.ad_variants to service_role;
alter table public.ad_variants enable row level security;

drop policy if exists "owner reads variants" on public.ad_variants;
create policy "owner reads variants" on public.ad_variants
  for select to authenticated
  using (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ));

drop policy if exists "owner inserts variants" on public.ad_variants;
create policy "owner inserts variants" on public.ad_variants
  for insert to authenticated
  with check (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ));

drop policy if exists "owner updates variants" on public.ad_variants;
create policy "owner updates variants" on public.ad_variants
  for update to authenticated
  using (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ));

drop policy if exists "owner deletes variants" on public.ad_variants;
create policy "owner deletes variants" on public.ad_variants
  for delete to authenticated
  using (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ));

create table if not exists public.autopilot_actions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests on delete cascade,
  action_type text not null,
  params jsonb,
  human_log text not null,
  executed_at timestamptz not null default now()
);

grant select on public.autopilot_actions to authenticated;
grant all on public.autopilot_actions to service_role;
alter table public.autopilot_actions enable row level security;

drop policy if exists "owner reads autopilot log" on public.autopilot_actions;
create policy "owner reads autopilot log" on public.autopilot_actions
  for select to authenticated
  using (exists (
    select 1 from public.tests t join public.projects p on p.id = t.project_id
    where t.id = test_id and p.user_id = auth.uid()
  ));

create index if not exists ad_accounts_user_id_idx on public.ad_accounts (user_id);
create index if not exists tests_project_id_idx on public.tests (project_id);
create index if not exists campaigns_test_id_idx on public.campaigns (test_id);
create index if not exists ad_variants_test_id_idx on public.ad_variants (test_id);
create index if not exists autopilot_actions_test_id_idx on public.autopilot_actions (test_id);
