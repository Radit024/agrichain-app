-- Invitation revocation is explicit so an unused token can be invalidated
-- without deleting audit-relevant invitation metadata.
alter table invitations add column revoked_at timestamptz;
create index invitations_active_idx on invitations (org_id, email)
  where accepted_at is null and revoked_at is null;
