-- Waymark: profile, wallet, daily activity and per-subject progress (issue #17, ADR 0017).
-- Every table belongs to one user, and row-level security lets a signed-in user read and write
-- only their own rows. Apply with the Supabase SQL editor (docs/process/SUPABASE.md, "Migrations").

-- Keeps updated_at current on every update.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profile: who you are in the city.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  title text not null default 'Traveller' check (char_length(title) <= 40),
  avatar jsonb not null default '{}'::jsonb, -- shape is defined by the avatar epic (E5)
  daily_goal_minutes integer not null default 15 check (daily_goal_minutes between 5 and 240),
  time_zone text not null default 'UTC' check (char_length(time_zone) <= 64), -- IANA name, set by the app
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wallet: XP and currencies. The level is derived from XP by the level curve (#19), not stored.
create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  gold integer not null default 0 check (gold >= 0),
  gems integer not null default 0 check (gems >= 0),
  updated_at timestamptz not null default now()
);

-- One row per user per local day (in the profile's time zone). The streak is derived from these
-- rows: consecutive days whose minutes reach the daily goal (#20).
create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  minutes integer not null default 0 check (minutes between 0 and 1440),
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Per-subject progress. `state` belongs to the subject module (ADR 0003); the platform never reads it.
create table public.subject_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  xp bigint not null default 0 check (xp >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger wallets_touch before update on public.wallets
  for each row execute function public.touch_updated_at();
create trigger daily_activity_touch before update on public.daily_activity
  for each row execute function public.touch_updated_at();
create trigger subject_progress_touch before update on public.subject_progress
  for each row execute function public.touch_updated_at();

-- Row-level security: your own rows only. No delete policy: rows go when the account goes.
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.daily_activity enable row level security;
alter table public.subject_progress enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "own profile: create" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own wallet: read" on public.wallets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own wallet: create" on public.wallets for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own wallet: update" on public.wallets for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own activity: read" on public.daily_activity for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own activity: create" on public.daily_activity for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own activity: update" on public.daily_activity for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own progress: read" on public.subject_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own progress: create" on public.subject_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own progress: update" on public.subject_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Table access for the Data API: signed-in users only; logged-out visitors get nothing.
revoke all on public.profiles, public.wallets, public.daily_activity, public.subject_progress
  from anon, authenticated;
grant select, insert, update on public.profiles, public.wallets, public.daily_activity,
  public.subject_progress to authenticated;

-- New accounts get a profile and an empty wallet.
create function public.create_player_rows() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.create_player_rows() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_player_rows();

-- Accounts that existed before this migration (Adam's) get theirs too.
insert into public.profiles (id) select id from auth.users on conflict do nothing;
insert into public.wallets (user_id) select id from auth.users on conflict do nothing;
