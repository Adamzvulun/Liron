-- Invite links say who sent them (ADR 0052): the join page reads "Adam invited you to Waymark."
-- The inviter's chosen name, while the link can still be used; null when they have none or the
-- link is used or expired. The inviter chose to send it, so the name goes only to whoever holds
-- the link, and only through api/join.ts, like invite_open.
create function public.invite_from(p_code text) returns text
language sql stable security definer set search_path = '' as $$
  select nullif(btrim(p.display_name), '')
  from public.invites i
  join public.profiles p on p.id = i.made_by
  where i.code_hash = public.invite_hash(p_code) and i.used_at is null and i.expires_at > now()
$$;

revoke execute on function public.invite_from(text) from public, anon, authenticated;
grant execute on function public.invite_from(text) to service_role;
