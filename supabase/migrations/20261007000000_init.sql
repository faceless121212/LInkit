-- Linkit initial schema
-- All tables are scoped to a single user via user_id and protected by RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- pillars
-- ---------------------------------------------------------------------------
create table public.pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pillars_user_name_unique unique (user_id, name),
  constraint pillars_color_hex check (color ~* '^#[0-9a-f]{6}$')
);

create trigger pillars_set_updated_at
  before update on public.pillars
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  status text not null default 'idea',
  kind text not null default 'single',
  scheduled_at timestamptz,
  published_at timestamptz,
  published_url text,
  pillar_id uuid references public.pillars (id) on delete set null,
  notes text,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_status_check
    check (status in ('idea', 'draft', 'scheduled', 'published', 'cancelled')),
  constraint posts_kind_check check (kind in ('single', 'thread')),
  constraint posts_scheduled_requires_date
    check (status <> 'scheduled' or scheduled_at is not null),
  constraint posts_published_requires_url
    check (status <> 'published' or (published_url is not null and published_at is not null))
);

create index posts_user_status_idx on public.posts (user_id, status);
create index posts_user_scheduled_at_idx on public.posts (user_id, scheduled_at);
create index posts_user_published_at_idx on public.posts (user_id, published_at);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- post_items
-- ---------------------------------------------------------------------------
create table public.post_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  position int not null,
  body text not null default '',
  media_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_items_post_position_unique unique (post_id, position) deferrable initially deferred,
  constraint post_items_position_nonneg check (position >= 0),
  constraint post_items_media_max check (cardinality(media_paths) <= 4)
);

create index post_items_post_id_idx on public.post_items (post_id);

create trigger post_items_set_updated_at
  before update on public.post_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- post_metrics
-- ---------------------------------------------------------------------------
create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  impressions int,
  likes int,
  reposts int,
  replies int,
  bookmarks int,
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- digest_log: one row per Europe/Warsaw calendar day the digest was sent
-- ---------------------------------------------------------------------------
create table public.digest_log (
  day date primary key,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: does the current user own this post?
-- ---------------------------------------------------------------------------
create or replace function public.owns_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id and p.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.pillars enable row level security;
alter table public.posts enable row level security;
alter table public.post_items enable row level security;
alter table public.post_metrics enable row level security;
alter table public.digest_log enable row level security;

create policy "pillars: owner select" on public.pillars
  for select using (auth.uid() = user_id);
create policy "pillars: owner insert" on public.pillars
  for insert with check (auth.uid() = user_id);
create policy "pillars: owner update" on public.pillars
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pillars: owner delete" on public.pillars
  for delete using (auth.uid() = user_id);

create policy "posts: owner select" on public.posts
  for select using (auth.uid() = user_id);
create policy "posts: owner insert" on public.posts
  for insert with check (auth.uid() = user_id);
create policy "posts: owner update" on public.posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts: owner delete" on public.posts
  for delete using (auth.uid() = user_id);

create policy "post_items: owner select" on public.post_items
  for select using (public.owns_post(post_id));
create policy "post_items: owner insert" on public.post_items
  for insert with check (public.owns_post(post_id));
create policy "post_items: owner update" on public.post_items
  for update using (public.owns_post(post_id)) with check (public.owns_post(post_id));
create policy "post_items: owner delete" on public.post_items
  for delete using (public.owns_post(post_id));

create policy "post_metrics: owner select" on public.post_metrics
  for select using (public.owns_post(post_id));
create policy "post_metrics: owner insert" on public.post_metrics
  for insert with check (public.owns_post(post_id));
create policy "post_metrics: owner update" on public.post_metrics
  for update using (public.owns_post(post_id)) with check (public.owns_post(post_id));
create policy "post_metrics: owner delete" on public.post_metrics
  for delete using (public.owns_post(post_id));

-- digest_log is only touched by the cron route using the service role,
-- which bypasses RLS. No policies are created on purpose: regular users
-- cannot read or write it.

-- ---------------------------------------------------------------------------
-- Search: ilike across title, notes and item bodies (chosen over tsvector
-- because bodies live in a separate table and the data set is tiny).
-- ---------------------------------------------------------------------------
create or replace function public.search_posts(q text)
returns setof public.posts
language sql
stable
security invoker
set search_path = public
as $$
  with pattern as (
    select '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' as p
  )
  select p.*
  from public.posts p, pattern
  where p.user_id = auth.uid()
    and (
      p.title ilike pattern.p escape '\'
      or coalesce(p.notes, '') ilike pattern.p escape '\'
      or exists (
        select 1 from public.post_items i
        where i.post_id = p.id and i.body ilike pattern.p escape '\'
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for post media.
-- Object path convention: {user_id}/{post_id}/{item_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

create policy "post-media: owner select" on storage.objects
  for select using (
    bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "post-media: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "post-media: owner update" on storage.objects
  for update using (
    bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "post-media: owner delete" on storage.objects
  for delete using (
    bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
