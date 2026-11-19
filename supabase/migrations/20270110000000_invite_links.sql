-- Waymark: invite links (ADR 0052, Adam 2026-11-19: "so I won't need to do anything except
-- sending the person a link"). Applies to dev on merge and to prod on release (ADR 0018).
--
-- An inviter makes a link in Settings. Whoever opens it chooses their own email and password,
-- and the server function api/join.ts makes the account with Supabase's admin API, so no email
-- is sent and sign-ups stay off (ADR 0016). The new player and the inviter are friends at once.
--
-- Only the code's SHA-256 is kept: the link itself is shown once, to the inviter. A code is
-- 244 random bits, works once, and expires after 7 days.

---------------------------------------------------------------------------------------------
-- 1. Who may invite: the project's first account (Adam), and anyone added here by hand.
---------------------------------------------------------------------------------------------
create table public.inviters (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.inviters enable row level security;
revoke all on public.inviters from anon, authenticated;

insert into public.inviters (user_id)
  select id from auth.users order by created_at, id limit 1
  on conflict do nothing;

-- On a project with no account yet, the first one made becomes the inviter.
create function public.first_account_invites() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.inviters (user_id)
    select new.id where not exists (select 1 from public.inviters)
    on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.first_account_invites() from public, anon, authenticated;
create trigger first_account_invites after insert on auth.users
  for each row execute function public.first_account_invites();

---------------------------------------------------------------------------------------------
-- 2. The links
---------------------------------------------------------------------------------------------
create table public.invites (
  code_hash text primary key,
  made_by uuid not null references auth.users (id) on delete cascade,
  made_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);
create index invites_made_by on public.invites (made_by);
alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;

create function public.invite_days() returns integer language sql immutable as $$ select 7 $$;
create function public.open_invites_max() returns integer language sql immutable as $$ select 20 $$;

create function public.invite_hash(p_code text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(lower(trim(coalesce(p_code, ''))), 'UTF8')), 'hex')
$$;

-- Whether the signed-in player may make links (Settings shows the button only then).
create function public.can_invite() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.inviters where user_id = auth.uid())
$$;

-- Makes a link's code and keeps only its hash. Refuses anyone who isn't an inviter, and a 21st
-- link still open.
create function public.make_invite() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  code text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if uid is null or not exists (select 1 from public.inviters where user_id = uid) then
    raise exception 'not an inviter' using errcode = '42501';
  end if;
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

-- Whether a link can still be used, for the join page (through api/join.ts: a visitor who isn't
-- signed in calls no function of ours). Says nothing else about it.
create function public.invite_open(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.invites
    where code_hash = public.invite_hash(p_code) and used_at is null and expires_at > now()
  )
$$;

---------------------------------------------------------------------------------------------
-- 3. Using a link: only the server (api/join.ts, with the secret key) calls these.
---------------------------------------------------------------------------------------------
-- Takes the link, so two people can't use it at once. Answers its inviter, or null.
create function public.claim_invite(p_code text) returns uuid
language sql volatile security definer set search_path = '' as $$
  update public.invites set used_at = now()
    where code_hash = public.invite_hash(p_code) and used_at is null and expires_at > now()
    returning made_by
$$;

-- Gives the link back when the account couldn't be made (an email already taken, say).
create function public.release_invite(p_code text) returns void
language sql volatile security definer set search_path = '' as $$
  update public.invites set used_at = null
    where code_hash = public.invite_hash(p_code) and used_by is null
$$;

-- Records who joined, and makes them and the inviter friends (unless either already has the
-- most friends allowed: then they can still ask each other later).
create function public.finish_invite(p_code text, p_user uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  inviter uuid;
begin
  update public.invites set used_by = p_user
    where code_hash = public.invite_hash(p_code) and used_at is not null and used_by is null
    returning made_by into inviter;
  if inviter is null or inviter = p_user then
    return;
  end if;
  if public.friend_count(inviter) < public.friends_max()
     and public.friend_count(p_user) < public.friends_max() then
    insert into public.friendships (low, high, asked_by, accepted_at)
      values (least(inviter, p_user), greatest(inviter, p_user), inviter, now())
      on conflict (low, high) do update set accepted_at = coalesce(public.friendships.accepted_at, now());
  end if;
end;
$$;

revoke execute on function public.invite_hash(text) from public, anon, authenticated;
revoke execute on function public.claim_invite(text) from public, anon, authenticated;
revoke execute on function public.release_invite(text) from public, anon, authenticated;
revoke execute on function public.finish_invite(text, uuid) from public, anon, authenticated;
revoke execute on function public.invite_open(text) from public, anon, authenticated;
revoke execute on function public.invite_days() from public, anon, authenticated;
revoke execute on function public.open_invites_max() from public, anon, authenticated;
revoke execute on function public.make_invite() from public, anon;
revoke execute on function public.can_invite() from public, anon;
grant execute on function public.make_invite(), public.can_invite() to authenticated;
grant execute on function public.invite_open(text), public.claim_invite(text),
  public.release_invite(text), public.finish_invite(text, uuid) to service_role;
