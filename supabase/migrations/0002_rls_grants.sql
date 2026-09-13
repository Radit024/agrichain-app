-- ============================================================
-- AGRICHAIN MIGRATION 002 — RLS, grants minimum, proyeksi server (K16)
-- RLS diaktifkan pada SEMUA tabel; seluruh akses anon/authenticated
-- di-revoke. Route Handler membaca lewat service-role (bypass RLS)
-- setelah verifikasi Privy + rate limit. View = security_invoker,
-- tanpa grant anon/authenticated.
-- ============================================================

-- RLS enable pada semua tabel aplikasi
alter table orgs enable row level security;
alter table product_categories enable row level security;
alter table monitoring_parameter_definitions enable row level security;
alter table monitoring_profiles enable row level security;
alter table profile_parameter_rules enable row level security;
alter table app_users enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table distribution_points enable row level security;
alter table distribution_point_schedules enable row level security;
alter table point_assignments enable row level security;
alter table batches enable row level security;
alter table handoff_intents enable row level security;
alter table handoff_records enable row level security;
alter table access_codes enable row level security;
alter table condition_readings enable row level security;
alter table condition_measurements enable row level security;
alter table condition_evaluations enable row level security;
alter table access_attempts enable row level security;
alter table anchor_digests enable row level security;
alter table transaction_references enable row level security;
alter table rate_limit_counters enable row level security;
alter table audit_logs enable row level security;

-- Tanpa policy → RLS default deny untuk semua role non-superuser/non-owner.
-- Grants: cabang seluruh hak anon/authenticated (K16).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Proyeksi publik server-side (bukan anon): hanya untuk dibaca service-role
-- dan di-join ulang saat membangun respons /api/public/batch/[publicId].
create view server_public_batch_projection
with (security_invoker = true) as
select
  b.public_id,
  b.distribution_status,
  b.condition_status,
  b.data_quality_status,
  b.custody_stage,
  c.name as category_name,
  b.paused,
  b.created_at
from batches b
join product_categories c on c.id = b.category_id;

revoke all on server_public_batch_projection from anon, authenticated, public;
