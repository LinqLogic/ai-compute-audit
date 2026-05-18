-- ============================================================
-- 001_initial_schema.sql
-- AI Compute Audit — initial multi-tenant schema
--
-- Run this in the Supabase Dashboard SQL Editor.
-- Every table uses org_id for tenant isolation.
-- RLS is enabled on every table — no exceptions.
-- ============================================================

-- ── Helper: read the Clerk org id from the request JWT custom claim ──────────
create or replace function get_clerk_org_id()
returns text
language sql stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'org_id',
    ''
  );
$$;

-- ── Enum ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type plan_type as enum ('free', 'pro', 'enterprise');
exception when duplicate_object then null; end $$;

-- ── organizations ─────────────────────────────────────────────────────────────
create table if not exists organizations (
  id                     uuid primary key default gen_random_uuid(),
  clerk_org_id           text not null unique,
  name                   text not null,
  plan                   plan_type not null default 'free',
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table organizations enable row level security;

create policy "org members can read their org"
  on organizations for select
  using (clerk_org_id = get_clerk_org_id());

create policy "users can create their own org"
  on organizations for insert
  with check (clerk_org_id = get_clerk_org_id());

create policy "org members can update their org"
  on organizations for update
  using (clerk_org_id = get_clerk_org_id());

-- ── imports ───────────────────────────────────────────────────────────────────
create table if not exists imports (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations(id) on delete cascade,
  period_key         text not null,          -- e.g. '2026-04'
  workers_json       jsonb not null default '[]',
  usage_events_json  jsonb not null default '[]',
  rate_cards_json    jsonb not null default '[]',
  row_counts         jsonb not null default '{}',
  created_by         text not null,          -- Clerk user id
  created_at         timestamptz not null default now()
);

create index if not exists imports_org_period on imports(org_id, period_key);

alter table imports enable row level security;

create policy "org members can read imports"
  on imports for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert imports"
  on imports for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── scenarios ─────────────────────────────────────────────────────────────────
create table if not exists scenarios (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  description text,
  config_json jsonb not null default '{}',
  created_by  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists scenarios_org on scenarios(org_id);

alter table scenarios enable row level security;

create policy "org members can read scenarios"
  on scenarios for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert scenarios"
  on scenarios for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can update scenarios"
  on scenarios for update
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can delete scenarios"
  on scenarios for delete
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── audit_log ─────────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  event_type     text not null,
  actor_clerk_id text not null,
  payload        jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists audit_log_org_created on audit_log(org_id, created_at desc);

alter table audit_log enable row level security;

create policy "org members can read audit log"
  on audit_log for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert audit log"
  on audit_log for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── meter_events ──────────────────────────────────────────────────────────────
create table if not exists meter_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  event_type  text not null,       -- e.g. 'import', 'export', 'exception_approved'
  quantity    integer not null default 1,
  period_key  text not null,       -- e.g. '2026-04'
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists meter_events_org_period on meter_events(org_id, period_key, event_type);

alter table meter_events enable row level security;

create policy "org members can read meter events"
  on meter_events for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert meter events"
  on meter_events for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── action_items ──────────────────────────────────────────────────────────────
create table if not exists action_items (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  item_id       text not null,     -- deterministic id from action engine e.g. SS::E-2190
  type          text not null,
  severity      text not null,
  status        text not null default 'open',
  dismissed_by  text,
  dismissed_at  timestamptz,
  period_key    text not null,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, item_id, period_key)
);

create index if not exists action_items_org_period on action_items(org_id, period_key);

alter table action_items enable row level security;

create policy "org members can read action items"
  on action_items for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert action items"
  on action_items for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can update action items"
  on action_items for update
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── exception_overrides ───────────────────────────────────────────────────────
create table if not exists exception_overrides (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  exception_key text not null,
  approved_by   text not null,
  reason        text not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, exception_key)
);

create index if not exists exception_overrides_org on exception_overrides(org_id);

alter table exception_overrides enable row level security;

create policy "org members can read exception overrides"
  on exception_overrides for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert exception overrides"
  on exception_overrides for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can update exception overrides"
  on exception_overrides for update
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can delete exception overrides"
  on exception_overrides for delete
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── close_steps ───────────────────────────────────────────────────────────────
create table if not exists close_steps (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  period_key  text not null,
  step_key    text not null,
  done        boolean not null default false,
  locked_by   text,
  locked_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, period_key, step_key)
);

create index if not exists close_steps_org_period on close_steps(org_id, period_key);

alter table close_steps enable row level security;

create policy "org members can read close steps"
  on close_steps for select
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can insert close steps"
  on close_steps for insert
  with check (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

create policy "org members can update close steps"
  on close_steps for update
  using (org_id in (
    select id from organizations where clerk_org_id = get_clerk_org_id()
  ));

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();

create trigger scenarios_updated_at before update on scenarios
  for each row execute function set_updated_at();

create trigger action_items_updated_at before update on action_items
  for each row execute function set_updated_at();

create trigger close_steps_updated_at before update on close_steps
  for each row execute function set_updated_at();
