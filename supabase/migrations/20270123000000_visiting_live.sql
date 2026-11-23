-- Waymark: visiting together, live (task 9.1, #482; the-home.md §17, ADR 0056). Applies to dev
-- on merge and to prod on release (ADR 0018).
--
-- Friends in one house see each other walk, over a private Realtime channel per friendship named
-- `visit:<low id>:<high id>`, beside the wire's `wire:<low id>:<high id>` (ADR 0046). The same two
-- friends may use it, so the wire's check takes the new name too, and its two policies on
-- `realtime.messages` cover both. Broadcast only; nothing is stored.

create or replace function public.may_use_wire(p_topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  parts text[];
  low uuid;
  high uuid;
begin
  if uid is null or p_topic is null
     or p_topic !~ '^(wire|visit):[0-9a-f-]{36}:[0-9a-f-]{36}$' then
    return false;
  end if;
  parts := string_to_array(p_topic, ':');
  low := parts[2]::uuid;
  high := parts[3]::uuid;
  return low < high and uid in (low, high) and public.are_friends(low, high);
exception when invalid_text_representation then
  return false;
end;
$$;
revoke execute on function public.may_use_wire(text) from public, anon;
grant execute on function public.may_use_wire(text) to authenticated;
