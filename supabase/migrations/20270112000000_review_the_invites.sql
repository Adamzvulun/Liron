-- A review of invite links before v1.2.0 (report §4dx). Applies to dev on merge and to prod on
-- release, right after the two invite migrations (ADR 0018).

-- 1. Only a brand-new project's first account becomes an inviter. Before, the trigger fired
--    whenever the inviters list was empty, so removing Adam's row (or his account) would hand
--    invite rights to the next account made by hand. The same fix 20261221000000 made for the
--    licence trigger.
create or replace function public.first_account_invites() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id <> new.id)
     and not exists (select 1 from public.inviters) then
    insert into public.inviters (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.first_account_invites() from public, anon, authenticated;

-- 2. The join page shows the inviter's name cleaned the way the Fellowship shows every name
--    (shown_name): no hidden direction marks or control characters from before the names check.
create or replace function public.invite_from(p_code text) returns text
language sql stable security definer set search_path = '' as $$
  select nullif(public.shown_name(p.display_name), '')
  from public.invites i
  join public.profiles p on p.id = i.made_by
  where i.code_hash = public.invite_hash(p_code) and i.used_at is null and i.expires_at > now()
$$;
revoke execute on function public.invite_from(text) from public, anon, authenticated;
grant execute on function public.invite_from(text) to service_role;

-- 3. Two links made at once can't both slip under the cap: one inviter's links are made one
--    at a time.
create or replace function public.make_invite() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  code text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if uid is null or not exists (select 1 from public.inviters where user_id = uid) then
    raise exception 'not an inviter' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('make_invite:' || uid::text));
  if (select count(*) from public.invites
      where made_by = uid and used_at is null and expires_at > now())
     >= public.open_invites_max() then
    raise exception 'too many open invites' using errcode = 'P0001', hint = 'full';
  end if;
  insert into public.invites (code_hash, made_by, expires_at)
    values (public.invite_hash(code), uid, now() + make_interval(days => public.invite_days()));
  return code;
end;
$$;
revoke execute on function public.make_invite() from public, anon;
grant execute on function public.make_invite() to authenticated;

-- 4. The limits fix their search path, like every other function (20270108000000 §7).
alter function public.invite_days() set search_path = '';
alter function public.open_invites_max() set search_path = '';
