-- Fixes from M1 security review:

-- (1) published pages readable by authenticated users too (logged-in visitors saw "not live")

-- (2) views/signups may only attach to published pages

-- (3) dedupe signups per page by email (case-insensitive)

-- (1)

drop policy "public can read published pages" on public.landing_pages;

create policy "anyone can read published pages" on public.landing_pages

  for select to anon, authenticated

  using (published = true);

-- (2)

drop policy "anyone can record a view" on public.page_views;

create policy "record view on published page" on public.page_views

  for insert to anon, authenticated

  with check (exists (

    select 1 from public.landing_pages lp

    where lp.id = landing_page_id and lp.published = true

  ));

drop policy "anyone can sign up" on public.signups;

create policy "sign up on published page" on public.signups

  for insert to anon, authenticated

  with check (exists (

    select 1 from public.landing_pages lp

    where lp.id = landing_page_id and lp.published = true

  ));

-- (3)

create unique index if not exists signups_page_email_unique

  on public.signups (landing_page_id, lower(email));
