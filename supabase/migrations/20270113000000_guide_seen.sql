-- Waymark: what the guide has shown each player (task 6.2, #407; docs/game/the-guide.md §4,
-- ADR 0053). Applies to dev on merge and to prod on release (ADR 0018).
--
-- The ids of the guide's lines a player has been shown (`welcome`, `intro:board`,
-- `card:market`, …), kept on the account so a phone and a laptop agree. Only ids, never text.
-- The player adds to it through `guide_mark`, which appends without losing what another device
-- added meanwhile; the column itself can't be written from the browser.

alter table public.profiles add column guide_seen text[] not null default '{}';
alter table public.profiles add constraint profiles_guide_seen_size
  check (cardinality(guide_seen) <= 300);

-- Players who were here before the guide have found the square already: the welcome counts as
-- seen for anyone with XP. Everyone else, and every new account, starts with an empty list.
update public.profiles p set guide_seen = '{welcome}'
where exists (select 1 from public.wallets w where w.user_id = p.id and w.xp > 0);

-- Adds ids to the signed-in player's list, once each. Refuses an id that isn't short and plain.
create function public.guide_mark(p_ids text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;
  if cardinality(p_ids) > 50
    or exists (select 1 from unnest(p_ids) as i where i is null or i !~ '^[a-z0-9:-]{1,64}$') then
    raise exception 'bad guide id' using errcode = '22023';
  end if;
  update public.profiles p
  set guide_seen = (
    select coalesce(array_agg(distinct i order by i), '{}')
    from unnest(p.guide_seen || p_ids) as i
  )
  where p.id = uid;
end;
$$;
revoke execute on function public.guide_mark(text[]) from public, anon;
grant execute on function public.guide_mark(text[]) to authenticated;
