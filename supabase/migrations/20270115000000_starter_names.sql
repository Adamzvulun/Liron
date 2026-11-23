-- Waymark: every new player starts with a name (Adam, 2026-11-22).
-- Applies to dev on merge and to prod on release (ADR 0018).
--
-- A new account used to start with no name, shown as "Traveler". Now it is given a common
-- Arabic name at random from content/core/names.json (kept equal by
-- supabase/tests/names.test.ts), which the player can change at any time. None of the names
-- belongs to a character in the game. Only new accounts: a player who is here already keeps
-- what they have.

create table public.starter_names (
  name text primary key check (name ~ '^[A-Z][a-z]{1,15}$')
);
alter table public.starter_names enable row level security;
revoke all on public.starter_names from anon, authenticated;

insert into public.starter_names (name) values
  ('Abir'),
  ('Adil'),
  ('Aisha'),
  ('Amir'),
  ('Anwar'),
  ('Asma'),
  ('Ayman'),
  ('Basil'),
  ('Dawood'),
  ('Dina'),
  ('Faris'),
  ('Fatin'),
  ('Ghada'),
  ('Ghalia'),
  ('Hamza'),
  ('Hisham'),
  ('Idris'),
  ('Imad'),
  ('Iman'),
  ('Inas'),
  ('Jabir'),
  ('Jumana'),
  ('Lamia'),
  ('Lubna'),
  ('Maha'),
  ('Malik'),
  ('Manal'),
  ('Mansur'),
  ('Mazin'),
  ('Munir'),
  ('Najwa'),
  ('Nasir'),
  ('Nisrin'),
  ('Nizar'),
  ('Qasim'),
  ('Rashid'),
  ('Reem'),
  ('Rima'),
  ('Salma'),
  ('Sana'),
  ('Sawsan'),
  ('Sharif'),
  ('Suha'),
  ('Tawfiq'),
  ('Walid'),
  ('Wasim'),
  ('Yara'),
  ('Yasin'),
  ('Zahra'),
  ('Zaki'),
  ('Zaynab'),
  ('Ziyad');

-- One of the names, at random; '' if the list were ever empty.
create function public.random_starter_name() returns text
language sql volatile security definer set search_path = '' as $$
  select coalesce((select n.name from public.starter_names n order by random() limit 1), '')
$$;
revoke execute on function public.random_starter_name() from public, anon, authenticated;

-- New accounts get a profile with a name, and an empty wallet.
create or replace function public.create_player_rows() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, public.random_starter_name())
  on conflict do nothing;
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.create_player_rows() from public, anon, authenticated;
