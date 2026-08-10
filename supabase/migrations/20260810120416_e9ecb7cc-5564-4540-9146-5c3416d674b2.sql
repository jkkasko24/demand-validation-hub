drop policy "owner reads own pages" on public.landing_pages;
drop policy "owner inserts pages" on public.landing_pages;
drop policy "owner updates pages" on public.landing_pages;
drop policy "owner deletes pages" on public.landing_pages;
drop policy "owner reads views" on public.page_views;
drop policy "owner reads signups" on public.signups;

drop function if exists public.owns_project(uuid);
drop function if exists public.owns_landing_page(uuid);

create policy "owner reads own pages" on public.landing_pages for select to authenticated
using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "owner inserts pages" on public.landing_pages for insert to authenticated
with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "owner updates pages" on public.landing_pages for update to authenticated
using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "owner deletes pages" on public.landing_pages for delete to authenticated
using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create policy "owner reads views" on public.page_views for select to authenticated
using (exists (
  select 1 from public.landing_pages lp join public.projects p on p.id = lp.project_id
  where lp.id = landing_page_id and p.user_id = auth.uid()
));
create policy "owner reads signups" on public.signups for select to authenticated
using (exists (
  select 1 from public.landing_pages lp join public.projects p on p.id = lp.project_id
  where lp.id = landing_page_id and p.user_id = auth.uid()
));