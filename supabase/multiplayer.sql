-- OpenGames Realtime room registry and authorization.
-- Applied to the existing Supabase Auth project; no service-role key is used by the browser.

create table if not exists public.opengames_multiplayer_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  game_id text not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null check (visibility in ('public', 'password')),
  password_hash text,
  room_mode text not null check (room_mode in ('shared', 'co-op', 'versus', 'teams')),
  team_count smallint check (team_count between 2 and 4),
  max_players smallint check (max_players is null or max_players between 2 and 100),
  room_kind text not null default 'player' check (room_kind in ('player', 'creator', 'global')),
  persistent boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists opengames_multiplayer_global_game_idx
  on public.opengames_multiplayer_rooms(game_id) where room_kind = 'global' and status = 'open';
create index if not exists opengames_multiplayer_public_list_idx
  on public.opengames_multiplayer_rooms(game_id, status, visibility, last_active_at desc);
create index if not exists opengames_multiplayer_rooms_host_idx
  on public.opengames_multiplayer_rooms(host_id);

create table if not exists public.opengames_multiplayer_members (
  room_id uuid not null references public.opengames_multiplayer_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  lease_expires_at timestamptz not null default (now() + interval '2 minutes'),
  primary key (room_id, user_id)
);
create index if not exists opengames_multiplayer_member_lease_idx
  on public.opengames_multiplayer_members(room_id, lease_expires_at);
create index if not exists opengames_multiplayer_members_user_idx
  on public.opengames_multiplayer_members(user_id);

alter table public.opengames_multiplayer_rooms enable row level security;
alter table public.opengames_multiplayer_members enable row level security;
revoke all on public.opengames_multiplayer_rooms from anon, authenticated;
revoke all on public.opengames_multiplayer_members from anon, authenticated;
grant select on public.opengames_multiplayer_rooms to authenticated;
grant select on public.opengames_multiplayer_members to authenticated;

drop policy if exists "OpenGames members read joined rooms" on public.opengames_multiplayer_rooms;
create policy "OpenGames members read joined rooms" on public.opengames_multiplayer_rooms
for select to authenticated using (
  host_id = (select auth.uid()) or exists (
    select 1 from public.opengames_multiplayer_members m
    where m.room_id = id and m.user_id = (select auth.uid()) and m.lease_expires_at > now()
  )
);

drop policy if exists "OpenGames members read own memberships" on public.opengames_multiplayer_members;
create policy "OpenGames members read own memberships" on public.opengames_multiplayer_members
for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.opengames_cleanup_multiplayer()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.opengames_multiplayer_members where lease_expires_at <= now();
  update public.opengames_multiplayer_rooms r set status = 'closed', closed_at = now()
  where r.status = 'open' and not r.persistent and r.last_active_at < now() - interval '10 minutes';
  delete from public.opengames_multiplayer_rooms where status = 'closed' and closed_at < now() - interval '7 days';
end;
$$;

create or replace function public.opengames_create_multiplayer_room(
  p_game_id text, p_visibility text, p_password text, p_mode text,
  p_team_count integer, p_max_players integer, p_persistent boolean default false,
  p_room_kind text default 'player'
)
returns table(room_id uuid, room_topic text, room_code text, visibility text, room_mode text, team_count integer, max_players integer, persistent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_id uuid := gen_random_uuid(); v_code text; v_attempt integer := 0;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.opengames_cleanup_multiplayer();
  if coalesce(length(trim(p_game_id)), 0) < 1 or length(p_game_id) > 80 then raise exception 'INVALID_GAME'; end if;
  if p_visibility not in ('public', 'password') then raise exception 'INVALID_VISIBILITY'; end if;
  if p_visibility = 'password' and (coalesce(length(p_password), 0) < 4 or length(p_password) > 32) then raise exception 'INVALID_PASSWORD'; end if;
  if p_mode not in ('shared', 'co-op', 'versus', 'teams') then raise exception 'INVALID_MODE'; end if;
  if p_mode = 'teams' and (p_team_count is null or p_team_count < 2 or p_team_count > 4) then raise exception 'INVALID_TEAMS'; end if;
  if p_max_players is not null and (p_max_players < 2 or p_max_players > 100) then raise exception 'INVALID_MAX_PLAYERS'; end if;
  if p_room_kind <> 'player' or p_persistent then raise exception 'MANAGED_ROOM_REQUIRES_PLATFORM_VERIFICATION'; end if;
  if (select count(*) from public.opengames_multiplayer_rooms where host_id = v_user and status = 'open') >= 5 then raise exception 'ROOM_LIMIT'; end if;
  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.opengames_multiplayer_rooms where code = v_code);
    if v_attempt > 8 then raise exception 'CODE_GENERATION_FAILED'; end if;
  end loop;
  insert into public.opengames_multiplayer_rooms(id, code, game_id, host_id, visibility, password_hash, room_mode, team_count, max_players, room_kind, persistent)
  values (v_id, v_code, trim(p_game_id), v_user, p_visibility,
    case when p_visibility = 'password' then extensions.crypt(p_password, extensions.gen_salt('bf')) else null end,
    p_mode, case when p_mode = 'teams' then p_team_count else null end, p_max_players, p_room_kind, p_persistent);
  insert into public.opengames_multiplayer_members(room_id, user_id) values (v_id, v_user);
  return query select v_id, 'opengames:room:' || v_id::text, v_code, p_visibility, p_mode,
    case when p_mode = 'teams' then p_team_count else null end, p_max_players, p_persistent;
end;
$$;

create or replace function public.opengames_join_multiplayer_room(p_game_id text, p_code text, p_password text default null)
returns table(room_id uuid, room_topic text, room_code text, visibility text, room_mode text, team_count integer, max_players integer, persistent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_room public.opengames_multiplayer_rooms%rowtype; v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.opengames_cleanup_multiplayer();
  select * into v_room from public.opengames_multiplayer_rooms r
    where r.code = upper(trim(p_code)) and r.game_id = p_game_id and r.status = 'open' for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not v_room.persistent and v_room.last_active_at < now() - interval '10 minutes' then raise exception 'ROOM_EXPIRED'; end if;
  if v_room.visibility = 'password' and (p_password is null or extensions.crypt(p_password, v_room.password_hash) <> v_room.password_hash) then raise exception 'WRONG_PASSWORD'; end if;
  select count(*) into v_count from public.opengames_multiplayer_members m where m.room_id = v_room.id and m.lease_expires_at > now() and m.user_id <> v_user;
  if v_room.max_players is not null and v_count >= v_room.max_players then raise exception 'ROOM_FULL'; end if;
  insert into public.opengames_multiplayer_members(room_id, user_id, lease_expires_at)
    values (v_room.id, v_user, now() + interval '2 minutes')
    on conflict on constraint opengames_multiplayer_members_pkey do update set lease_expires_at = excluded.lease_expires_at;
  update public.opengames_multiplayer_rooms set last_active_at = now() where id = v_room.id;
  return query select v_room.id, 'opengames:room:' || v_room.id::text, v_room.code, v_room.visibility, v_room.room_mode,
    v_room.team_count::integer, v_room.max_players::integer, v_room.persistent;
end;
$$;

create or replace function public.opengames_join_global_multiplayer(p_game_id text, p_mode text, p_max_players integer default null)
returns table(room_id uuid, room_topic text, room_code text, visibility text, room_mode text, team_count integer, max_players integer, persistent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_room public.opengames_multiplayer_rooms%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode not in ('shared', 'co-op', 'versus', 'teams') then raise exception 'INVALID_MODE'; end if;
  if p_max_players is not null and (p_max_players < 2 or p_max_players > 100) then raise exception 'INVALID_MAX_PLAYERS'; end if;
  select * into v_room from public.opengames_multiplayer_rooms r where r.game_id = p_game_id and r.room_kind = 'global' and r.status = 'open' limit 1 for update;
  if not found then
    insert into public.opengames_multiplayer_rooms(code, game_id, host_id, visibility, room_mode, max_players, room_kind, persistent)
      values (null, p_game_id, v_user, 'public', p_mode, p_max_players, 'global', true) returning * into v_room;
  end if;
  insert into public.opengames_multiplayer_members(room_id, user_id, lease_expires_at)
    values (v_room.id, v_user, now() + interval '2 minutes')
    on conflict on constraint opengames_multiplayer_members_pkey do update set lease_expires_at = excluded.lease_expires_at;
  update public.opengames_multiplayer_rooms set last_active_at = now() where id = v_room.id;
  return query select v_room.id, 'opengames:room:' || v_room.id::text, null::text, v_room.visibility, v_room.room_mode,
    v_room.team_count::integer, v_room.max_players::integer, true;
end;
$$;

create or replace function public.opengames_managed_multiplayer_room(
  p_user_id uuid, p_game_id text, p_action text, p_visibility text,
  p_password text, p_mode text, p_team_count integer, p_max_players integer
)
returns table(room_id uuid, room_topic text, room_code text, visibility text, room_mode text, team_count integer, max_players integer, persistent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_room public.opengames_multiplayer_rooms%rowtype; v_id uuid := gen_random_uuid(); v_code text; v_attempt integer := 0;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then raise exception 'INVALID_USER'; end if;
  if coalesce(length(trim(p_game_id)), 0) < 1 or length(p_game_id) > 80 then raise exception 'INVALID_GAME'; end if;
  if p_action not in ('creator-room', 'global') then raise exception 'INVALID_ACTION'; end if;
  if p_mode not in ('shared', 'co-op', 'versus', 'teams') then raise exception 'INVALID_MODE'; end if;
  if p_mode = 'teams' and (p_team_count is null or p_team_count < 2 or p_team_count > 4) then raise exception 'INVALID_TEAMS'; end if;
  if p_max_players is not null and (p_max_players < 2 or p_max_players > 100) then raise exception 'INVALID_MAX_PLAYERS'; end if;
  perform public.opengames_cleanup_multiplayer();
  if p_action = 'global' then
    select * into v_room from public.opengames_multiplayer_rooms r where r.game_id = p_game_id and r.room_kind = 'global' and r.status = 'open' limit 1 for update;
    if not found then
      insert into public.opengames_multiplayer_rooms(code, game_id, host_id, visibility, room_mode, team_count, max_players, room_kind, persistent)
      values (null, p_game_id, p_user_id, 'public', p_mode, case when p_mode = 'teams' then p_team_count else null end, p_max_players, 'global', true) returning * into v_room;
    end if;
  else
    if p_visibility not in ('public', 'password') then raise exception 'INVALID_VISIBILITY'; end if;
    if p_visibility = 'password' and (coalesce(length(p_password), 0) < 4 or length(p_password) > 32) then raise exception 'INVALID_PASSWORD'; end if;
    if (select count(*) from public.opengames_multiplayer_rooms where host_id = p_user_id and room_kind = 'creator' and status = 'open') >= 5 then raise exception 'ROOM_LIMIT'; end if;
    loop
      v_attempt := v_attempt + 1;
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      exit when not exists (select 1 from public.opengames_multiplayer_rooms where code = v_code);
      if v_attempt > 8 then raise exception 'CODE_GENERATION_FAILED'; end if;
    end loop;
    insert into public.opengames_multiplayer_rooms(id, code, game_id, host_id, visibility, password_hash, room_mode, team_count, max_players, room_kind, persistent)
    values (v_id, v_code, p_game_id, p_user_id, p_visibility,
      case when p_visibility = 'password' then extensions.crypt(p_password, extensions.gen_salt('bf')) else null end,
      p_mode, case when p_mode = 'teams' then p_team_count else null end, p_max_players, 'creator', true) returning * into v_room;
  end if;
  insert into public.opengames_multiplayer_members(room_id, user_id, lease_expires_at)
    values (v_room.id, p_user_id, now() + interval '2 minutes')
    on conflict on constraint opengames_multiplayer_members_pkey do update set lease_expires_at = excluded.lease_expires_at;
  update public.opengames_multiplayer_rooms set last_active_at = now() where id = v_room.id;
  return query select v_room.id, 'opengames:room:' || v_room.id::text, v_room.code, v_room.visibility, v_room.room_mode,
    v_room.team_count::integer, v_room.max_players::integer, true;
end;
$$;

create or replace function public.opengames_list_multiplayer_rooms(p_game_id text)
returns table(room_code text, room_mode text, team_count integer, max_players integer, player_count bigint, persistent boolean, creator_managed boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.opengames_cleanup_multiplayer();
  return query select r.code, r.room_mode, r.team_count::integer, r.max_players::integer,
    (select count(*) from public.opengames_multiplayer_members m where m.room_id = r.id and m.lease_expires_at > now()),
    r.persistent, r.room_kind = 'creator'
  from public.opengames_multiplayer_rooms r
  where r.game_id = p_game_id and r.status = 'open' and r.visibility = 'public' and r.room_kind <> 'global'
    and (r.persistent or r.last_active_at >= now() - interval '10 minutes')
  order by r.persistent desc, r.last_active_at desc limit 50;
end;
$$;

create or replace function public.opengames_touch_multiplayer_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then return false; end if;
  update public.opengames_multiplayer_members set lease_expires_at = now() + interval '2 minutes'
    where room_id = p_room_id and user_id = v_user;
  if not found then return false; end if;
  update public.opengames_multiplayer_rooms set last_active_at = now() where id = p_room_id and status = 'open';
  return found;
end;
$$;

create or replace function public.opengames_leave_multiplayer_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then return; end if;
  delete from public.opengames_multiplayer_members where room_id = p_room_id and user_id = v_user;
  update public.opengames_multiplayer_rooms r set status = 'closed', closed_at = now()
    where r.id = p_room_id and not r.persistent and not exists (
      select 1 from public.opengames_multiplayer_members m where m.room_id = r.id and m.lease_expires_at > now()
    );
end;
$$;

create or replace function public.opengames_close_multiplayer_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  update public.opengames_multiplayer_rooms set status = 'closed', closed_at = now()
    where id = p_room_id and host_id = auth.uid() and status = 'open';
  return found;
end;
$$;

revoke all on function public.opengames_cleanup_multiplayer() from public, anon, authenticated;
revoke all on function public.opengames_create_multiplayer_room(text,text,text,text,integer,integer,boolean,text) from public, anon;
revoke all on function public.opengames_join_multiplayer_room(text,text,text) from public, anon;
revoke all on function public.opengames_join_global_multiplayer(text,text,integer) from public, anon;
revoke all on function public.opengames_managed_multiplayer_room(uuid,text,text,text,text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.opengames_list_multiplayer_rooms(text) from public, anon;
revoke all on function public.opengames_touch_multiplayer_room(uuid) from public, anon;
revoke all on function public.opengames_leave_multiplayer_room(uuid) from public, anon;
revoke all on function public.opengames_close_multiplayer_room(uuid) from public, anon;
grant execute on function public.opengames_create_multiplayer_room(text,text,text,text,integer,integer,boolean,text) to authenticated;
grant execute on function public.opengames_join_multiplayer_room(text,text,text) to authenticated;
revoke execute on function public.opengames_join_global_multiplayer(text,text,integer) from authenticated;
grant execute on function public.opengames_managed_multiplayer_room(uuid,text,text,text,text,text,integer,integer) to service_role;
grant execute on function public.opengames_list_multiplayer_rooms(text) to authenticated;
grant execute on function public.opengames_touch_multiplayer_room(uuid) to authenticated;
grant execute on function public.opengames_leave_multiplayer_room(uuid) to authenticated;
grant execute on function public.opengames_close_multiplayer_room(uuid) to authenticated;

drop policy if exists "OpenGames room members receive realtime" on realtime.messages;
create policy "OpenGames room members receive realtime" on realtime.messages
for select to authenticated using (
  extension in ('broadcast', 'presence') and exists (
    select 1 from public.opengames_multiplayer_members m
    join public.opengames_multiplayer_rooms r on r.id = m.room_id
    where m.user_id = (select auth.uid()) and m.lease_expires_at > now() and r.status = 'open'
      and ('opengames:room:' || r.id::text) = (select realtime.topic())
  )
);

drop policy if exists "OpenGames room members send realtime" on realtime.messages;
create policy "OpenGames room members send realtime" on realtime.messages
for insert to authenticated with check (
  extension in ('broadcast', 'presence') and exists (
    select 1 from public.opengames_multiplayer_members m
    join public.opengames_multiplayer_rooms r on r.id = m.room_id
    where m.user_id = (select auth.uid()) and m.lease_expires_at > now() and r.status = 'open'
      and ('opengames:room:' || r.id::text) = (select realtime.topic())
  )
);
