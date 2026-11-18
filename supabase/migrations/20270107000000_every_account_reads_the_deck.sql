-- Friends learn from the deck (ADR 0050, task 2.1). Every account reads the Lingualism deck, with
-- no step from Adam: Waymark is invite-only (ADR 0016), so "every account" and "the friends Adam
-- invited" are the same people.
--
-- What doesn't change: the deck is still read only through is_content_licensee(), which refuses
-- anonymous sessions and logged-out visitors; content_licensees is still written only by the
-- database and the secret key. A row deleted by hand still takes the deck away from that account
-- (the game says so plainly: the safety net in ADR 0050 §3).

-- 1. Each new account becomes a licensee as it is created. This replaces "only the first account
-- ever" (20261104120000, hardened in 20261221000000).
drop trigger if exists on_auth_user_created_licensee on auth.users;
drop function if exists public.first_account_is_licensee();

create or replace function public.every_account_is_licensee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.content_licensees (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.every_account_is_licensee() from public, anon, authenticated;
create trigger on_auth_user_created_licensee after insert on auth.users
  for each row execute function public.every_account_is_licensee();

-- 2. The backfill: every account that exists now (a friend made before this release) becomes one.
insert into public.content_licensees (user_id) select id from auth.users on conflict do nothing;
