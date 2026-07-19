-- Core schema: agencies, clients, scoped membership, and the content workflow.
-- Every content-bearing table carries client_id and is locked down by RLS so
-- a client login can only ever see rows scoped to their own client.

create extension if not exists "pgcrypto";

-- One row per authenticated user, mirroring auth.users.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- The agency side (e.g. the marketing team). Kept as a table, not a
-- singleton, so more than one agency can use the platform later.
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table agency_members (
  agency_id uuid not null references agencies (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

-- One row per client business (e.g. "Salt & Iron BBQ").
create table clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  name text not null,
  scope_color text not null default '#2C6864',
  created_at timestamptz not null default now()
);

-- Client-side logins, scoped to exactly one client.
create table client_members (
  client_id uuid not null references clients (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

-- Scheduled/approved content (calendar + approvals + grid preview).
create table content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  platform text not null check (platform in ('ig_feed', 'ig_story', 'ig_reel', 'flyer')),
  caption text,
  storage_path text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'changes_requested', 'approved', 'scheduled', 'published')),
  scheduled_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- Raw uploads clients pick favorites from; unliked rows get purged after expiry.
create table proofs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  liked boolean not null default false,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  title text not null,
  platform text not null check (platform in ('zoom', 'google_meet')),
  join_url text not null,
  scheduled_at timestamptz not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  name text not null,
  storage_path text not null,
  status text not null default 'shared' check (status in ('pending_review', 'approved', 'shared')),
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  sender_id uuid references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Helper: does the current user belong to the agency that owns this client?
create or replace function is_agency_member_for_client(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from clients c
    join agency_members am on am.agency_id = c.agency_id
    where c.id = target_client_id
      and am.user_id = auth.uid()
  );
$$;

-- Helper: is the current user a member of this exact client (the client-portal login)?
create or replace function is_client_member(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from client_members cm
    where cm.client_id = target_client_id
      and cm.user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table agencies enable row level security;
alter table agency_members enable row level security;
alter table clients enable row level security;
alter table client_members enable row level security;
alter table content_items enable row level security;
alter table proofs enable row level security;
alter table meetings enable row level security;
alter table files enable row level security;
alter table messages enable row level security;

create policy "read own profile" on profiles for select using (id = auth.uid());

create policy "agency members read their agency" on agencies for select
  using (exists (select 1 from agency_members am where am.agency_id = agencies.id and am.user_id = auth.uid()));

create policy "agency members read their roster" on agency_members for select
  using (exists (select 1 from agency_members am where am.agency_id = agency_members.agency_id and am.user_id = auth.uid()));

create policy "scoped read: clients" on clients for select
  using (
    exists (select 1 from agency_members am where am.agency_id = clients.agency_id and am.user_id = auth.uid())
    or is_client_member(clients.id)
  );

create policy "scoped read: content_items" on content_items for select
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));
create policy "agency writes: content_items" on content_items for insert
  with check (is_agency_member_for_client(client_id));
create policy "scoped update: content_items" on content_items for update
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));

create policy "scoped read: proofs" on proofs for select
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));
create policy "agency writes: proofs" on proofs for insert
  with check (is_agency_member_for_client(client_id));
create policy "scoped update: proofs" on proofs for update
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));

create policy "scoped read: meetings" on meetings for select
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));
create policy "agency writes: meetings" on meetings for insert
  with check (is_agency_member_for_client(client_id));

create policy "scoped read: files" on files for select
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));
create policy "scoped writes: files" on files for insert
  with check (is_agency_member_for_client(client_id) or is_client_member(client_id));

create policy "scoped read: messages" on messages for select
  using (is_agency_member_for_client(client_id) or is_client_member(client_id));
create policy "scoped writes: messages" on messages for insert
  with check (is_agency_member_for_client(client_id) or is_client_member(client_id));
