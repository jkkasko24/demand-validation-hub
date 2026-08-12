alter table public.tests drop constraint if exists tests_status_check;
alter table public.tests add constraint tests_status_check
  check (status in ('draft','review','launching','live','attention','stopped','done'));