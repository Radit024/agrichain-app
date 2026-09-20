import "server-only";
import type { DbAdapter } from "../actions/invitations";

export interface UserRoleItem {
  id: string;
  privyDid: string;
  displayName: string;
  email: string | null;
  walletAddress: string | null;
  status: "PENDING_INVITE" | "ACTIVE" | "REVOKED";
  mfaVerified: boolean;
  createdAt: string;
  memberships: Array<{
    id: string;
    orgId: string;
    orgName: string;
    orgKind: string;
    role:
      | "PRODUCER_ADMIN"
      | "FACTORY_STAFF"
      | "DISTRIBUTOR_ADMIN"
      | "RETAILER_ADMIN"
      | "CONTRACT_ADMIN";
  }>;
}

export interface UserRoleMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  revokedUsers: number;
}

export interface OrganizationOption {
  id: string;
  name: string;
  kind: "PRODUCER" | "DISTRIBUTOR" | "RETAILER";
}

export async function listAllOrganizations(db: DbAdapter): Promise<OrganizationOption[]> {
  const rows = await db.query<{ id: string; name: string; kind: string }>(
    `select id, name, kind from orgs order by name asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as OrganizationOption["kind"],
  }));
}

export async function listAllUsersWithRoles(
  db: DbAdapter,
): Promise<{ users: UserRoleItem[]; metrics: UserRoleMetrics }> {
  const usersRows = await db.query<{
    id: string;
    privy_did: string;
    display_name: string;
    email: string | null;
    wallet_address: string | null;
    status: "PENDING_INVITE" | "ACTIVE" | "REVOKED";
    mfa_verified: boolean;
    created_at: string;
  }>(
    `select id, privy_did, display_name, email, wallet_address, status, mfa_verified, created_at
     from app_users
     order by created_at desc`,
  );

  const membershipsRows = await db.query<{
    id: string;
    user_id: string;
    org_id: string;
    org_name: string;
    org_kind: string;
    role:
      | "PRODUCER_ADMIN"
      | "FACTORY_STAFF"
      | "DISTRIBUTOR_ADMIN"
      | "RETAILER_ADMIN"
      | "CONTRACT_ADMIN";
  }>(
    `select m.id, m.user_id, m.org_id, o.name as org_name, o.kind as org_kind, m.role
     from memberships m
     join orgs o on o.id = m.org_id
     order by o.name asc, m.role asc`,
  );

  const userMap = new Map<string, UserRoleItem>();

  for (const u of usersRows) {
    userMap.set(u.id, {
      id: u.id,
      privyDid: u.privy_did,
      displayName: u.display_name,
      email: u.email,
      walletAddress: u.wallet_address,
      status: u.status,
      mfaVerified: u.mfa_verified,
      createdAt: u.created_at,
      memberships: [],
    });
  }

  for (const m of membershipsRows) {
    const user = userMap.get(m.user_id);
    if (user) {
      user.memberships.push({
        id: m.id,
        orgId: m.org_id,
        orgName: m.org_name,
        orgKind: m.org_kind,
        role: m.role,
      });
    }
  }

  const users = Array.from(userMap.values());

  const metrics: UserRoleMetrics = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "ACTIVE").length,
    pendingUsers: users.filter((u) => u.status === "PENDING_INVITE").length,
    revokedUsers: users.filter((u) => u.status === "REVOKED").length,
  };

  return { users, metrics };
}
