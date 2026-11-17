-- Waymark: copyrighted content behind login (issue #23, ADR 0023, ADR 0011).
-- Text lives in these tables and audio in the private-media bucket. Signed-in users can read
-- them; logged-out visitors can't. Only the content upload workflow (with the project's secret
-- key) writes them; the app never does.

create table public.content_items (
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  item_id text not null check (char_length(item_id) between 1 and 128),
  source text not null,
  type text not null,
  data jsonb not null,
  media jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (subject_id, item_id)
);

create table public.content_lessons (
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  lesson_id text not null check (char_length(lesson_id) between 1 and 128),
  source text not null,
  title text not null,
  position integer not null,
  items text[] not null,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (subject_id, lesson_id)
);

create index content_items_source on public.content_items (subject_id, source);
create index content_lessons_source on public.content_lessons (subject_id, source);

create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();
create trigger content_lessons_touch before update on public.content_lessons
  for each row execute function public.touch_updated_at();

alter table public.content_items enable row level security;
alter table public.content_lessons enable row level security;

create policy "signed-in users read content" on public.content_items for select to authenticated
  using (true);
create policy "signed-in users read lessons" on public.content_lessons for select to authenticated
  using (true);

revoke all on public.content_items, public.content_lessons from anon, authenticated;
grant select on public.content_items, public.content_lessons to authenticated;

-- Audio: a private bucket (no public URLs), readable by signed-in users only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('private-media', 'private-media', false, 5242880, array['audio/mpeg'])
  on conflict (id) do nothing;

create policy "signed-in users read private media" on storage.objects for select to authenticated
  using (bucket_id = 'private-media');
