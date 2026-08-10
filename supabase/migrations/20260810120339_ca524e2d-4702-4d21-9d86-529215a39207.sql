-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  app_url text,
  category text,
  positioning jsonb,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "own projects select" on public.projects for select to authenticated using (auth.uid() = user_id);
create policy "own projects insert" on public.projects for insert to authenticated with check (auth.uid() = user_id);
create policy "own projects update" on public.projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects delete" on public.projects for delete to authenticated using (auth.uid() = user_id);

-- landing_pages
create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  slug text unique not null,
  content jsonb not null,
  published boolean default false,
  created_at timestamptz default now()
);
grant select on public.landing_pages to anon;
grant select, insert, update, delete on public.landing_pages to authenticated;
grant all on public.landing_pages to service_role;
alter table public.landing_pages enable row level security;

create or replace function public.owns_project(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id = _project_id and p.user_id = auth.uid())
$$;

create or replace function public.owns_landing_page(_lp_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.landing_pages lp join public.projects p on p.id = lp.project_id
    where lp.id = _lp_id and p.user_id = auth.uid()
  )
$$;

create policy "public can read published pages" on public.landing_pages for select to anon using (published = true);
create policy "owner reads own pages" on public.landing_pages for select to authenticated using (public.owns_project(project_id));
create policy "owner inserts pages" on public.landing_pages for insert to authenticated with check (public.owns_project(project_id));
create policy "owner updates pages" on public.landing_pages for update to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owner deletes pages" on public.landing_pages for delete to authenticated using (public.owns_project(project_id));

-- page_views
create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages on delete cascade,
  utm_source text,
  utm_campaign text,
  utm_content text,
  created_at timestamptz default now()
);
grant insert on public.page_views to anon;
grant select, insert on public.page_views to authenticated;
grant all on public.page_views to service_role;
alter table public.page_views enable row level security;
create policy "anyone can record a view" on public.page_views for insert to anon, authenticated with check (true);
create policy "owner reads views" on public.page_views for select to authenticated using (public.owns_landing_page(landing_page_id));

-- signups
create table public.signups (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages on delete cascade,
  email text not null,
  utm_source text,
  utm_campaign text,
  utm_content text,
  created_at timestamptz default now()
);
grant insert on public.signups to anon;
grant select, insert on public.signups to authenticated;
grant all on public.signups to service_role;
alter table public.signups enable row level security;
create policy "anyone can sign up" on public.signups for insert to anon, authenticated with check (true);
create policy "owner reads signups" on public.signups for select to authenticated using (public.owns_landing_page(landing_page_id));

create index on public.projects (user_id);
create index on public.landing_pages (project_id);
create index on public.page_views (landing_page_id);
create index on public.signups (landing_page_id);