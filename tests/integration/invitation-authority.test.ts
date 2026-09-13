import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, asService } from "../helpers/pglite";
import {
  acceptInvitation,
  createManagedInvitation,
  InviteError,
  pgliteAdapter,
  revokeInvitation,
} from "@/server/actions/invitations";
import type { Session } from "@/server/auth/session";

let db: PGlite;
const orgA = "90000000-0000-4000-8000-000000000001";
const orgB = "90000000-0000-4000-8000-000000000002";
const userId = "90000000-0000-4000-8000-000000000003";
const administrator: Session = {
  user: {
    id: userId,
    did: "did:privy:authority",
    displayName: "Admin",
    email: "admin@test",
    walletAddress: null,
    mfaVerified: true,
    status: "ACTIVE",
  },
  memberships: [{ orgId: orgA, orgName: "Org A", role: "PRODUCER_ADMIN" }],
};

beforeAll(async () => {
  db = await createTestDb();
  await asService(
    db,
    `insert into orgs (id, name, kind) values ('${orgA}','Org A','PRODUCER'), ('${orgB}','Org B','DISTRIBUTOR')`,
  );
  await asService(
    db,
    `insert into app_users (id, privy_did, display_name, status) values ('${userId}','did:privy:authority','Admin','ACTIVE')`,
  );
});
afterAll(async () => db.close());

describe("managed invitations", () => {
  it("requires an administrator in the invited organisation", async () => {
    await expect(
      createManagedInvitation(
        { email: "cross@test.local", orgId: orgB, role: "FACTORY_STAFF", ttlHours: 24 },
        pgliteAdapter(db),
        administrator,
      ),
    ).rejects.toBeInstanceOf(InviteError);
  });

  it("revocation makes an otherwise valid token unusable", async () => {
    const invitation = await createManagedInvitation(
      { email: "revoked@test.local", orgId: orgA, role: "FACTORY_STAFF", ttlHours: 24 },
      pgliteAdapter(db),
      administrator,
    );
    await revokeInvitation(invitation.invitationId, pgliteAdapter(db), administrator);
    await expect(
      acceptInvitation(
        {
          token: invitation.rawToken,
          email: "revoked@test.local",
          privyDid: "did:privy:revoked",
          displayName: "Revoked",
        },
        pgliteAdapter(db),
      ),
    ).rejects.toMatchObject({ code: "INVALID" });
  });
});
