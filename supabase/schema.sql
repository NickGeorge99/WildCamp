create table if not exists spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  notes text default '',
  vehicle_type text not null default 'any' check (vehicle_type in ('any', '4wd', 'hike-in')),
  is_public boolean not null default true,
  lat float8 not null,
  lng float8 not null,
  created_at timestamptz default now()
);

alter table spots enable row level security;

-- Anyone can see public spots
create policy "Read public spots" on spots
  for select using (is_public = true);

-- Users can see their own private spots
create policy "Read own spots" on spots
  for select using (auth.uid() = user_id);

-- Users can insert their own spots
create policy "Insert own spots" on spots
  for insert with check (auth.uid() = user_id);

-- Users can update their own spots
create policy "Update own spots" on spots
  for update using (auth.uid() = user_id);

-- Users can delete their own spots
create policy "Delete own spots" on spots
  for delete using (auth.uid() = user_id);
