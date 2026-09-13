-- ============================================================
-- AGRICHAIN MIGRATION 001 — skema inti (IMPLEMENTATION-PLAN §4.0 + §4.0.1)
-- Urutan pembuatan menghormati FK (lihat plan §4.0.1 urutan migrasi).
-- Semua tabel RLS-enabled; grants anon/authenticated di-revoke (K16).
-- ============================================================

-- ============ 1. enum ============
create type handling_mode as enum ('COLD_CHAIN', 'NON_COLD_CHAIN');

-- ============ 2. orgs ============
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('PRODUCER','DISTRIBUTOR','RETAILER')),
  created_at timestamptz not null default now()
);

-- ============ 3. product_categories ============
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  name text not null,
  handling_mode handling_mode not null,
  created_at timestamptz not null default now(),
  unique (id, org_id)
);

-- ============ 4. monitoring_parameter_definitions ============
create table monitoring_parameter_definitions (
  code text primary key,
  unit text not null,
  value_kind text not null,
  check (code in ('TEMPERATURE','HUMIDITY','SHOCK_LEVEL','DOOR_OPEN_DURATION'))
);

-- ============ 5. monitoring_profiles ============
create table monitoring_profiles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references product_categories(id),
  version int not null,
  is_locked boolean not null default false,
  stale_after_seconds int not null,
  unique (category_id, version)
);

-- ============ 6. profile_parameter_rules ============
create table profile_parameter_rules (
  profile_id uuid not null references monitoring_profiles(id) on delete cascade,
  parameter_code text not null references monitoring_parameter_definitions(code),
  required boolean not null default false,
  min_value_ppm bigint,
  max_value_ppm bigint,
  tolerance_seconds int,
  severity text not null check (severity in ('CRITICAL','WARNING','CONTEXT')),
  primary key (profile_id, parameter_code)
);

-- ============ 7. app_users ============
create table app_users (
  id uuid primary key default gen_random_uuid(),
  privy_did text not null unique,
  display_name text not null,
  email text,
  wallet_address text unique,
  status text not null default 'PENDING_INVITE'
    check (status in ('PENDING_INVITE','ACTIVE','REVOKED')),
  mfa_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ 8. memberships ============
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete restrict,
  role text not null check (role in ('PRODUCER_ADMIN','FACTORY_STAFF','DISTRIBUTOR_ADMIN','RETAILER_ADMIN','CONTRACT_ADMIN')),
  created_at timestamptz not null default now(),
  unique (user_id, org_id, role)
);
create index memberships_user_idx on memberships(user_id);
create index memberships_org_idx on memberships(org_id);

-- ============ 9. invitations ============
create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  org_id uuid not null references orgs(id) on delete cascade,
  role text not null check (role in ('PRODUCER_ADMIN','FACTORY_STAFF','DISTRIBUTOR_ADMIN','RETAILER_ADMIN','CONTRACT_ADMIN')),
  invitation_token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  unique (email, org_id, role)
);
create index invitations_email_idx on invitations(email);

-- ============ 10. distribution_points ============
create table distribution_points (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  public_name text not null,
  internal_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ 11. distribution_point_schedules ============
create table distribution_point_schedules (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references distribution_points(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  unique (point_id, weekday, start_time)
);

-- ============ 12. point_assignments (P4) ============
create table point_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  point_id uuid not null references distribution_points(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, point_id)
);
create index point_assignments_point_idx on point_assignments(point_id);

-- ============ 13. batches (P3: paused + custodian) ============
create table batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  category_id uuid not null references product_categories(id),
  profile_id uuid not null references monitoring_profiles(id),
  batch_code text not null,
  public_id text not null unique,
  distribution_status text not null default 'DIDAFTARKAN'
    check (distribution_status in ('DIDAFTARKAN','DALAM_DISTRIBUSI','SELESAI')),
  condition_status text not null default 'NOT_EVALUATED'
    check (condition_status in ('NOT_EVALUATED','COMPLIANT','AT_RISK')),
  data_quality_status text not null default 'AVAILABLE'
    check (data_quality_status in ('AVAILABLE','DATA_UNAVAILABLE')),
  custody_stage int not null default 0 check (custody_stage between 0 and 2),
  custodian_wallet text,
  custodian_org_id uuid references orgs(id),
  paused boolean not null default false,
  profile_snapshot jsonb not null,
  chain_sync_status text not null default 'PENDING'
    check (chain_sync_status in ('PENDING','CONFIRMED','FAILED')),
  chain_batch_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, batch_code)
);
create index batches_org_idx on batches(org_id, created_at desc);
create index batches_public_idx on batches(public_id);

-- ============ 14. handoff_intents (K7, P2) ============
create table handoff_intents (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  from_stage int not null check (from_stage between 0 and 2),
  to_stage int not null check (to_stage between 0 and 2),
  sender_user_id uuid not null references app_users(id),
  sender_wallet text not null,
  recipient_wallet text not null,
  recipient_org_id uuid not null references orgs(id),
  status text not null default 'PENDING'
    check (status in ('PENDING','CONFIRMED','CANCELLED','EXPIRED')),
  idempotency_key text not null unique,
  chain_sync_status text not null default 'PENDING'
    check (chain_sync_status in ('PENDING','CONFIRMED','FAILED')),
  initiated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  cancelled_at timestamptz
);
-- Satu intent PENDING aktif per batch (partial; riwayat CONFIRMED/CANCELLED/EXPIRED
-- boleh menumpuk — feed HandoffTimeline). Full unique di batch_id TIDAK dipakai
-- karena akan memblokir serah-terima kedua (stage 1→2).
create unique index handoff_intents_one_active_uq
  on handoff_intents(batch_id) where status = 'PENDING';
create index handoff_intents_recipient_idx on handoff_intents(recipient_wallet, status);
create index handoff_intents_sync_idx on handoff_intents(chain_sync_status)
  where chain_sync_status = 'PENDING';

-- ============ 15. handoff_records ============
create table handoff_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  intent_id uuid not null references handoff_intents(id) on delete restrict,
  from_stage int not null,
  to_stage int not null,
  sender_wallet text not null,
  recipient_wallet text not null,
  confirmed_at timestamptz not null default now()
);
create index handoff_records_batch_idx on handoff_records(batch_id, confirmed_at desc);

-- ============ 16. access_codes ============
create table access_codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  point_id uuid not null references distribution_points(id) on delete cascade,
  code_hash text not null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  created_at timestamptz not null default now(),
  check (valid_until > valid_from)
);
create index access_codes_batch_idx on access_codes(batch_id, valid_until);

-- ============ 17. condition_readings ============
create table condition_readings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  source text not null check (source = 'SIMULATOR'),
  scenario text not null,
  idempotency_key text not null unique,
  checkpoint_id uuid references distribution_points(id),
  door_state text check (door_state in ('OPEN','CLOSED')),
  cooling_state text check (cooling_state in ('ON','OFF','FAULT')),
  device_health text not null check (device_health in ('ONLINE','STALE','OFFLINE')),
  read_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index condition_readings_batch_source_time_uq
  on condition_readings(batch_id, source, read_at);
create index condition_readings_batch_idx on condition_readings(batch_id, read_at desc);

-- ============ 18. condition_measurements ============
create table condition_measurements (
  reading_id uuid not null references condition_readings(id) on delete cascade,
  parameter_code text not null references monitoring_parameter_definitions(code),
  value_ppm bigint not null,
  primary key (reading_id, parameter_code)
);

-- ============ 19. condition_evaluations ============
create table condition_evaluations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id),
  reading_id uuid references condition_readings(id),
  condition_status text not null check (condition_status in ('COMPLIANT','AT_RISK')),
  data_quality_status text not null check (data_quality_status in ('AVAILABLE','DATA_UNAVAILABLE')),
  reasons jsonb not null,
  operational_alerts jsonb not null,
  created_at timestamptz not null default now()
);
create index condition_evaluations_batch_idx on condition_evaluations(batch_id, created_at desc);

-- ============ 20. access_attempts (PRD story 21) ============
create table access_attempts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete set null,
  public_id_used text not null,
  point_id uuid references distribution_points(id),
  actor_user_id uuid references app_users(id),
  result text not null check (result in ('SAH','TIDAK_SAH','ANOMALI')),
  detail_offchain text not null,
  attempted_at timestamptz not null default now()
);
create index access_attempts_attempted_idx on access_attempts(attempted_at desc);
create index access_attempts_batch_idx on access_attempts(batch_id, attempted_at desc);

-- ============ 21. anchor_digests (K8) ============
create table anchor_digests (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  digest text not null,
  attempt_count int not null,
  tx_hash text,
  chain_sync_status text not null default 'PENDING'
    check (chain_sync_status in ('PENDING','CONFIRMED','FAILED')),
  anchored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (period_start, period_end)
);
create index anchor_digests_pending_idx on anchor_digests(chain_sync_status)
  where chain_sync_status = 'PENDING';

-- ============ 22. transaction_references (K14) ============
create table transaction_references (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete set null,
  intent_id uuid references handoff_intents(id) on delete set null,
  event_type text not null check (event_type in
    ('BATCH_REGISTERED','HANDOFF_INITIATED','HANDOFF_CONFIRMED','HANDOFF_CANCELLED','CONDITION','VALID_ACCESS','DIGEST')),
  idempotency_key text not null unique,
  chain_tx_hash text,
  chain_block bigint,
  chain_sync_status text not null default 'PENDING'
    check (chain_sync_status in ('PENDING','CONFIRMED','FAILED')),
  error_detail text,
  submitted_by uuid references app_users(id),
  receipt_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transaction_references_sync_idx on transaction_references(chain_sync_status)
  where chain_sync_status = 'PENDING';
create unique index transaction_references_tx_uq on transaction_references(chain_tx_hash)
  where chain_tx_hash is not null;

-- ============ 23. rate_limit_counters (K10) ============
create table rate_limit_counters (
  bucket_key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket_key, window_start)
);

-- ============ 24. audit_logs ============
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null,
  actor_hash text,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_correlation_idx on audit_logs(correlation_id);
create index audit_logs_created_idx on audit_logs(created_at desc);
