import "server-only";

import { getDbAdapter } from "@/server/db/adapter";
import type { Membership, Session, UserDirectory } from "./session";

/** Single database-backed directory for routes, layouts, and server actions. */
export const appUserDirectory: UserDirectory = {
  async findUserByDid(did: string): Promise<Session["user"] | null> {
    const db = await getDbAdapter();
    const rows = await db.query<{
      id: string;
      privy_did: string;
      display_name: string;
      email: string | null;
      wallet_address: string | null;
      mfa_verified: boolean;
      status: Session["user"]["status"];
    }>(
      `select id, privy_did, display_name, email, wallet_address, mfa_verified, status
       from app_users where privy_did = $1`,
      [did],
    );
    const user = rows[0];
    return user
      ? {
          id: user.id,
          did: user.privy_did,
          displayName: user.display_name,
          email: user.email,
          walletAddress: user.wallet_address,
          mfaVerified: user.mfa_verified,
          status: user.status,
        }
      : null;
  },
  async findMemberships(userId: string): Promise<Membership[]> {
    const db = await getDbAdapter();
    const rows = await db.query<{ org_id: string; org_name: string; role: Membership["role"] }>(
      `select m.org_id, o.name as org_name, m.role
       from memberships m join orgs o on o.id = m.org_id where m.user_id = $1`,
      [userId],
    );
    return rows.map((row) => ({ orgId: row.org_id, orgName: row.org_name, role: row.role }));
  },
};
