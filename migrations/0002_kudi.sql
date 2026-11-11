create table if not exists kudi_profiles (
  user_id text primary key,
  display_name text not null default '',
  handle text not null default '',
  country text not null default 'NG',
  phone text not null default '',
  phone_status text not null default 'unverified',
  identity_status text not null default 'not_started',
  created_at timestamptz not null default now()
);

create table if not exists kudi_payments (
  id text primary key,
  user_id text not null,
  provider text not null default 'paypal_sandbox',
  status text not null,
  usd_cents integer not null,
  title text not null default '',
  ledger_id text,
  created_at timestamptz not null default now()
);

create index if not exists kudi_payments_user_idx on kudi_payments (user_id);

create table if not exists kudi_ledger (
  id text primary key,
  user_id text not null,
  payment_id text,
  kind text not null,
  status text not null,
  ccy text not null,
  minor integer not null,
  direction text not null,
  title text not null,
  note text not null default '',
  idempotency_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists kudi_ledger_idem_idx on kudi_ledger (user_id, idempotency_key);
create index if not exists kudi_ledger_user_idx on kudi_ledger (user_id, created_at desc);
