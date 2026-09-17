-- Bans are permanent unless explicitly revoked by staff. They never expire automatically.

update public.board_sanctions
set expires_at = null,
    updated_at = now()
where sanction_type = 'ban'
  and expires_at is not null;

alter table public.board_sanctions
  drop constraint if exists board_bans_are_permanent;

alter table public.board_sanctions
  add constraint board_bans_are_permanent
  check (sanction_type <> 'ban' or expires_at is null);
