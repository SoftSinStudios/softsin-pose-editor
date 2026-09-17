-- SoftSin Studios board image ownership and lifecycle tracking

create table if not exists public.board_image_uploads (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.profiles(id) on delete restrict,
  public_url text not null unique,
  storage_path text not null unique,
  original_name text not null default '',
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  thread_id uuid references public.threads(id) on delete restrict,
  post_id uuid references public.posts(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'attached', 'deleted')),
  created_at timestamptz not null default now(),
  attached_at timestamptz,
  deleted_at timestamptz,
  constraint board_image_single_owner check (not (thread_id is not null and post_id is not null)),
  constraint board_image_attachment_state check (
    (status = 'pending' and thread_id is null and post_id is null and attached_at is null and deleted_at is null)
    or (status = 'attached' and (thread_id is not null or post_id is not null) and attached_at is not null and deleted_at is null)
    or (status = 'deleted' and deleted_at is not null)
  )
);

create index if not exists board_image_uploads_pending_idx
  on public.board_image_uploads (created_at) where status = 'pending';
create index if not exists board_image_uploads_thread_idx
  on public.board_image_uploads (thread_id) where thread_id is not null;
create index if not exists board_image_uploads_post_idx
  on public.board_image_uploads (post_id) where post_id is not null;

alter table public.board_image_uploads enable row level security;

drop policy if exists "Members register own board images" on public.board_image_uploads;
create policy "Members register own board images"
on public.board_image_uploads for insert to authenticated
with check (uploader_id = auth.uid() and status = 'pending' and thread_id is null and post_id is null);

drop policy if exists "Members view own board images" on public.board_image_uploads;
create policy "Members view own board images"
on public.board_image_uploads for select to authenticated
using (uploader_id = auth.uid() or public.board_actor_is_staff(auth.uid()));

drop policy if exists "Staff update board images" on public.board_image_uploads;
create policy "Staff update board images"
on public.board_image_uploads for update to authenticated
using (public.board_actor_is_staff(auth.uid()))
with check (public.board_actor_is_staff(auth.uid()));

revoke all on public.board_image_uploads from anon, authenticated;
grant select, insert, update on public.board_image_uploads to authenticated;

create or replace function public.attach_board_images(
  image_urls text[],
  target_thread_id uuid default null,
  target_post_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_author uuid;
  affected integer := 0;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if (target_thread_id is null) = (target_post_id is null) then
    raise exception 'Choose exactly one attachment target.';
  end if;

  if target_thread_id is not null then
    select author_id into target_author from public.threads where id = target_thread_id;
  else
    select author_id into target_author from public.posts where id = target_post_id;
  end if;

  if target_author is distinct from actor_id then
    raise exception 'Images can only be attached to your own new content.' using errcode = '42501';
  end if;

  update public.board_image_uploads
  set status = 'attached',
      thread_id = target_thread_id,
      post_id = target_post_id,
      attached_at = now()
  where uploader_id = actor_id
    and status = 'pending'
    and public_url = any(coalesce(image_urls, array[]::text[]));

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.attach_board_images(text[], uuid, uuid) from public, anon;
grant execute on function public.attach_board_images(text[], uuid, uuid) to authenticated;
