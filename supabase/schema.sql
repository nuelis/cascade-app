-- Cascade: Vendor Breach Cascade Alerting
-- Run this in your Supabase SQL editor to set up the schema.

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  domain text, -- e.g. "anodot.com" — used to match breach feeds
  access_scope text, -- plain-English description of what this vendor can touch
  status text default 'clear', -- 'clear' | 'needs_review' | 'expiring' | 'expired'
  expiry_date date,
  contact_email text, -- vendor's own contact, for auto-chasing renewal
  last_alert_sent_at timestamptz,
  created_at timestamptz default now()
);

create table breach_events (
  id uuid primary key default gen_random_uuid(),
  vendor_domain text not null,
  source text not null, -- e.g. 'hibp', 'ransomware_tracker', 'cve_feed'
  severity text not null, -- 'low' | 'medium' | 'high' | 'critical'
  summary text,
  raw_payload jsonb,
  discovered_at timestamptz default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete cascade,
  breach_event_id uuid references breach_events(id) on delete cascade,
  recommended_action text,
  acknowledged boolean default false,
  created_at timestamptz default now()
);

-- Index for fast domain matching when a new breach event comes in
create index idx_vendors_domain on vendors(domain);
create index idx_breach_events_domain on breach_events(vendor_domain);

-- Row-level security (each company only sees its own data)
alter table vendors enable row level security;
alter table alerts enable row level security;

create policy "Company sees own vendors" on vendors
  for select using (company_id = auth.uid());
create policy "Company sees own alerts" on alerts
  for select using (company_id = auth.uid());
