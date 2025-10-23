-- Create agencies table
create table public.agencies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  phone text,
  email text,
  website text,
  logo_url text,
  created_at timestamp default now()
);

-- Create properties table
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  title text not null,
  description text,
  type text not null, -- casa, departamento, oficina, terreno, etc.
  operation text not null, -- venta, arriendo, subasta
  region_id integer references public.regions(id),
  commune_id integer references public.communes(id),
  price numeric not null,
  surface numeric,
  bedrooms integer,
  bathrooms integer,
  parking integer,
  furnished boolean default false,
  year_built integer,
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create property_images table
create table public.property_images (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade,
  url text not null,
  created_at timestamp default now()
);

-- Create favorites table
create table public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamp default now()
);

-- Enable RLS
alter table public.agencies enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.favorites enable row level security;

-- RLS Policies for agencies
create policy "Users can view all agencies" on public.agencies for select using (true);
create policy "Users can insert their own agency" on public.agencies for insert with check (auth.uid() = user_id);
create policy "Users can update their own agency" on public.agencies for update using (auth.uid() = user_id);

-- RLS Policies for properties
create policy "Users can view all properties" on public.properties for select using (true);
create policy "Users can insert their own properties" on public.properties for insert with check (auth.uid() = user_id);
create policy "Users can update their own properties" on public.properties for update using (auth.uid() = user_id);
create policy "Users can delete their own properties" on public.properties for delete using (auth.uid() = user_id);

-- RLS Policies for property_images
create policy "Users can view all property images" on public.property_images for select using (true);
create policy "Users can insert images for their properties" on public.property_images for insert with check (
  exists (select 1 from public.properties where id = property_id and user_id = auth.uid())
);
create policy "Users can update images for their properties" on public.property_images for update using (
  exists (select 1 from public.properties where id = property_id and user_id = auth.uid())
);
create policy "Users can delete images for their properties" on public.property_images for delete using (
  exists (select 1 from public.properties where id = property_id and user_id = auth.uid())
);

-- RLS Policies for favorites
create policy "Users can view their own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can insert their own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete their own favorites" on public.favorites for delete using (auth.uid() = user_id);