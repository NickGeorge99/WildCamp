-- Notification preferences table
create table notification_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  digest_enabled boolean not null default false,
  last_digest_sent_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "Users can read own prefs"
  on notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own prefs"
  on notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prefs"
  on notification_preferences for update
  using (auth.uid() = user_id);

-- Haversine distance function (miles)
create or replace function haversine_miles(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable as $$
  select 3958.8 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lng2 - lng1) / 2) ^ 2
  ))
$$;

-- updated_at column and trigger on spots
alter table spots add column if not exists updated_at timestamptz default now();

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger spots_set_updated_at
  before update on spots
  for each row execute function set_updated_at();

-- Index for digest queries
create index if not exists idx_spots_created_at on spots (created_at);

-- RPC function for nearby new spots (used by digest cron)
create or replace function get_nearby_new_spots(
  p_user_id uuid,
  p_since timestamptz,
  p_radius_miles float8
)
returns table (
  id uuid,
  name text,
  vehicle_type text,
  lat float8,
  lng float8,
  share_token text,
  images text[],
  created_at timestamptz,
  distance_miles float8
) language sql security definer as $$
  select distinct on (s.id)
    s.id, s.name, s.vehicle_type, s.lat, s.lng, s.share_token, s.images, s.created_at,
    haversine_miles(my.lat, my.lng, s.lat, s.lng) as distance_miles
  from spots s,
    (select distinct sp.lat, sp.lng from spots sp where sp.user_id = p_user_id) as my
  where s.is_public = true
    and s.user_id != p_user_id
    and s.created_at > p_since
    and haversine_miles(my.lat, my.lng, s.lat, s.lng) < p_radius_miles
  order by s.id, haversine_miles(my.lat, my.lng, s.lat, s.lng)
$$;
