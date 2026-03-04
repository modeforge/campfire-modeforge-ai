-- Campfire RSVP submissions table
create table if not exists public.campfire_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null,
  email text not null,
  guest_count integer not null default 1,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.campfire_rsvps enable row level security;

-- No public read policies. Server action uses service_role key for inserts.
-- Admin reads also use service_role key.

-- Indexes for common queries
create index if not exists idx_campfire_rsvps_event_slug
  on public.campfire_rsvps (event_slug);

create index if not exists idx_campfire_rsvps_created_at
  on public.campfire_rsvps (created_at desc);
