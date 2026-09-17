-- Query support for channel and reply pagination

create extension if not exists pg_trgm;

create index if not exists threads_category_visible_activity_idx
  on public.threads (category_id, pinned desc, updated_at desc)
  where deleted_at is null;

create index if not exists posts_thread_visible_created_idx
  on public.posts (thread_id, created_at asc)
  where deleted_at is null;

create index if not exists threads_title_search_idx
  on public.threads using gin (title gin_trgm_ops)
  where deleted_at is null;

create index if not exists threads_body_search_idx
  on public.threads using gin (body gin_trgm_ops)
  where deleted_at is null;
