-- Waymark: the wire, live Morse between friends (task 3.6, #331; ADR 0046). Applies to dev on
-- merge and to prod on release (ADR 0018).
--
-- Two friends key to each other over a private Supabase Realtime channel named
-- `wire:<low id>:<high id>`, the pair's own friendship row. Realtime asks these policies before
-- a player may join, send or hear on a private channel; only the two friends pass. Nothing is
-- stored: Realtime checks a policy by trying a row and rolling it back.
--
-- For the policies to be the only way in, the project's Realtime Settings must have "Allow
-- public access" switched off (Adam's step, RUNNING.md).

-- True when the caller is one of the two players a `wire:` topic names, and they're friends.
create function public.may_use_wire(p_topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  parts text[];
  low uuid;
  high uuid;
begin
  if uid is null or p_topic is null
     or p_topic !~ '^wire:[0-9a-f-]{36}:[0-9a-f-]{36}$' then
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

-- Hearing (and joining) the wire: broadcast only, no presence, no stored messages.
create policy "the wire: friends hear" on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast'
         and public.may_use_wire((select realtime.topic())));

-- Keying on the wire.
create policy "the wire: friends key" on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'broadcast'
              and public.may_use_wire((select realtime.topic())));
