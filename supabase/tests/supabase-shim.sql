-- Test-only stand-in for what a Supabase project already has: the API roles, auth.users and
-- auth.uid(). Supabase's auth.uid() reads the signed-in user's id from the request's JWT; here
-- the tests set it with set_config('request.jwt.claim.sub', ...). Never applied to a real project.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
-- Supabase's auth.jwt() returns the request's JWT claims; tests set them with
-- set_config('request.jwt.claims', ...) when they need one (e.g. is_anonymous).
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Supabase Storage's tables, reduced to what our migrations touch. RLS is on, as in Supabase.
create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
  name text not null
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select on storage.objects to anon, authenticated;
