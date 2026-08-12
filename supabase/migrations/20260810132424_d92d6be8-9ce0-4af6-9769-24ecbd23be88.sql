-- Fixes from M1 security review (restored; already applied to the live database).
-- (1) published pages readable by authenticated users too
-- (2) views/signups may only attach to published pages
-- (3) dedupe signups per page by email (case-insensitive)

drop policy if exists "public can read published pages" on public.landing_pages;
drop policy if exists "anyone can read published pages" on public.landing_pages;
create policy "anyone can read published pages" on public.landing_pages
  for select to anon, authenticated
  using (published = true);

drop policy if exists "anyone can record a view" on public.page_views;
drop policy if exists "record view on published page" on public.page_views;
create policy "record view on published page" on public.page_views
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.landing_pages lp
    where lp.id = landing_page_id and lp.published = true
  ));

drop policy if exists "anyone can sign up" on public.signups;
drop policy if exists "sign up on published page" on public.signups;
create policy "sign up on published page" on public.signups
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.landing_pages lp
    where lp.id = landing_page_id and lp.published = true
  ));

create unique index if not exists signups_page_email_unique
  on public.signups (landing_page_id, lower(email));
