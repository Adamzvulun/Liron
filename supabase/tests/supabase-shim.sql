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
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
