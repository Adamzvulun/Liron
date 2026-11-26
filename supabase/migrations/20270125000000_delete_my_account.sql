-- Waymark: take your data and leave (task 10.2, #500). Applies to dev on merge and to prod on
-- release (ADR 0018).
--
-- delete_my_account() removes the caller's login. Every per-player table references
-- auth.users (id) with on delete cascade, so their rows go with it: progress, reviews, chats,
-- notes, the room, friendships, feed lines, challenges, gifts and the invite links they made. A
-- link they used keeps its row (used_by is set null). Friends lose the pair and nothing else.
-- Final: there is no undo. supabase/tests/delete-account.test.ts checks the cascade.

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
