-- SoftSin Studios message-board guardrails
-- Run this migration in the Supabase SQL Editor before enabling member uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-images',
  'board-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Board images are publicly readable" on storage.objects;
create policy "Board images are publicly readable"
on storage.objects for select
using (bucket_id = 'board-images');

drop policy if exists "Members upload their own board images" on storage.objects;
create policy "Members upload their own board images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'board-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members delete their own board images" on storage.objects;
create policy "Members delete their own board images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'board-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.enforce_board_content_guardrails()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := 'member';
  actor_created_at timestamptz;
  submitted_text text;
  link_count integer;
  image_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select coalesce(p.role, 'member')
    into actor_role
  from public.profiles p
  where p.id = actor_id;

  if new.author_id <> actor_id and actor_role not in ('moderator', 'admin') then
    raise exception 'A member cannot post as another user.' using errcode = '42501';
  end if;

  if tg_table_name = 'threads' then
    if char_length(trim(new.title)) < 3 or char_length(new.title) > 140 then
      raise exception 'Thread titles must contain 3 to 140 characters.';
    end if;
    submitted_text := concat_ws(E'\n', new.title, new.body);
  else
    submitted_text := new.body;
  end if;

  if char_length(trim(coalesce(new.body, ''))) < 1 or char_length(new.body) > 20000 then
    raise exception 'Post bodies must contain 1 to 20000 characters.';
  end if;

  if submitted_text ~* '\]\(\s*(javascript|data|vbscript):' then
    raise exception 'Only HTTP and HTTPS links are allowed.';
  end if;

  select count(*) into link_count
  from regexp_matches(submitted_text, 'https?://[^[:space:])]+', 'gi');

  select count(*) into image_count
  from regexp_matches(submitted_text, '!\[[^]]*\]\(https?://[^[:space:])]+\)', 'gi');

  if link_count > 10 or image_count > 4 then
    raise exception 'A post may contain at most 10 links and 4 images.';
  end if;

  if tg_op = 'INSERT' and actor_role not in ('moderator', 'admin') then
    select created_at into actor_created_at from auth.users where id = actor_id;

    if actor_created_at > now() - interval '24 hours' and link_count > 2 then
      raise exception 'New members may include at most 2 links per post.';
    end if;

    if tg_table_name = 'threads' then
      if exists (
        select 1 from public.threads
        where author_id = actor_id and created_at > now() - interval '60 seconds'
      ) then
        raise exception 'Please wait before creating another thread.';
      end if;

      if (select count(*) from public.threads where author_id = actor_id and created_at > now() - interval '1 hour') >= 5 then
        raise exception 'Thread creation limit reached. Try again later.';
      end if;
    else
      if exists (
        select 1 from public.posts
        where author_id = actor_id and created_at > now() - interval '15 seconds'
      ) then
        raise exception 'Please wait before posting another reply.';
      end if;

      if (select count(*) from public.posts where author_id = actor_id and created_at > now() - interval '1 hour') >= 30 then
        raise exception 'Reply limit reached. Try again later.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_thread_guardrails on public.threads;
create trigger enforce_thread_guardrails
before insert or update of title, body, author_id on public.threads
for each row execute function public.enforce_board_content_guardrails();

drop trigger if exists enforce_post_guardrails on public.posts;
create trigger enforce_post_guardrails
before insert or update of body, author_id on public.posts
for each row execute function public.enforce_board_content_guardrails();

