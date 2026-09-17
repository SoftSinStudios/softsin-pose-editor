-- Thread subscriptions and private in-app reply notifications

create table if not exists public.board_thread_subscriptions (
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.board_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, post_id)
);

create index if not exists board_notifications_user_unread_idx
  on public.board_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.board_thread_subscriptions enable row level security;
alter table public.board_notifications enable row level security;

drop policy if exists "Members manage own thread subscriptions" on public.board_thread_subscriptions;
create policy "Members manage own thread subscriptions"
on public.board_thread_subscriptions for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members view own notifications" on public.board_notifications;
create policy "Members view own notifications"
on public.board_notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Members update own notifications" on public.board_notifications;
create policy "Members update own notifications"
on public.board_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.board_thread_subscriptions from anon, authenticated;
revoke all on public.board_notifications from anon, authenticated;
grant select, insert, delete on public.board_thread_subscriptions to authenticated;
grant select, update (read_at) on public.board_notifications to authenticated;

insert into public.board_thread_subscriptions (thread_id, user_id)
select id, author_id from public.threads
on conflict do nothing;

create or replace function public.subscribe_thread_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.board_thread_subscriptions (thread_id, user_id)
  values (new.id, new.author_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.notify_thread_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.board_notifications (user_id, actor_id, thread_id, post_id)
  select subscription.user_id, new.author_id, new.thread_id, new.id
  from public.board_thread_subscriptions subscription
  where subscription.thread_id = new.thread_id
    and subscription.user_id <> new.author_id
  on conflict (user_id, post_id) do nothing;
  return new;
end;
$$;

drop trigger if exists subscribe_thread_author_after_insert on public.threads;
create trigger subscribe_thread_author_after_insert
after insert on public.threads
for each row execute function public.subscribe_thread_author();

drop trigger if exists notify_thread_subscribers_after_reply on public.posts;
create trigger notify_thread_subscribers_after_reply
after insert on public.posts
for each row execute function public.notify_thread_subscribers();
