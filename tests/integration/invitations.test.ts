import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, asService } from "../helpers/pglite";
import {
  createInvitation,
  acceptInvitation,
  InviteError,
  pgliteAdapter,
} from "@/server/actions/invitations";
import { verify } from "@node-rs/argon2";

vi.mock("server-only", () => ({}));

let db: PGlite;

const U = {
  org: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  admin: "6fa459ea-ee8a-3ca4-894e-db77e160355e",
};

beforeAll(async () => {
  db = await createTestDb();
  await asService(
    db,
    `insert into orgs (id, name, kind) values ('${U.org}','Produsen A','PRODUCER')`,
  );
  await asService(
    db,
    `insert into app_users (id, privy_did, display_name, status) values
     ('${U.admin}','did:privy:admin','Admin A','ACTIVE')`,
  );
});

afterAll(async () => {
  await db.close();
});

describe("invitations: invite-only activation (§6.2)", () => {
  it("admin membuat undangan → token mentah dikembalikan sekali + hash Argon2id di DB", async () => {
    const invite = await createInvitation(
      {
        email: "new@agrichain.test",
        orgId: U.org,
        role: "FACTORY_STAFF",
        createdByUserId: U.admin,
        ttlHours: 24,
      },
      pgliteAdapter(db),
    );
    expect(invite.rawToken).toBeTruthy();
    const rows = await asService<{ invitation_token_hash: string }>(
      db,
      "select invitation_token_hash from invitations where id = $1",
      [invite.invitationId],
    );
    expect(await verify(rows[0].invitation_token_hash, invite.rawToken)).toBe(true);
    // hash BUKAN token mentah
    expect(rows[0].invitation_token_hash).not.toContain(invite.rawToken);
  });

  it("aktivasi valid → user ACTIVE + membership + undangan terpakai", async () => {
    const invite = await createInvitation(
      {
        email: "aktif@agrichain.test",
        orgId: U.org,
        role: "DISTRIBUTOR_ADMIN",
        createdByUserId: U.admin,
      },
      pgliteAdapter(db),
    );
    const result = await acceptInvitation(
      {
        token: invite.rawToken,
        email: "aktif@agrichain.test",
        privyDid: "did:privy:new-user-1",
        displayName: "Petugas Baru",
      },
      pgliteAdapter(db),
    );
    expect(result.orgId).toBe(U.org);
    expect(result.role).toBe("DISTRIBUTOR_ADMIN");

    const user = await asService<{ status: string }>(
      db,
      "select status from app_users where privy_did = $1",
      ["did:privy:new-user-1"],
    );
    expect(user[0].status).toBe("ACTIVE");

    // token sudah terpakai → pakai ulang ditolak
    await expect(
      acceptInvitation(
        {
          token: invite.rawToken,
          email: "aktif@agrichain.test",
          privyDid: "did:privy:new-user-2",
          displayName: "Duplikat",
        },
        pgliteAdapter(db),
      ),
    ).rejects.toMatchObject({ name: "InviteError" });
  });

  it("token salah → InviteError INVALID (tanpa membocorkan ada-tidaknya)", async () => {
    await createInvitation(
      { email: "x@agrichain.test", orgId: U.org, role: "FACTORY_STAFF", createdByUserId: U.admin },
      pgliteAdapter(db),
    );
    await expect(
      acceptInvitation(
        {
          token: "token-yang-salah-banget-1234",
          email: "x@agrichain.test",
          privyDid: "did:privy:user-x",
          displayName: "Petugas X",
        },
        pgliteAdapter(db),
      ),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("undangan kedaluwarsa → EXPIRED", async () => {
    const invite = await createInvitation(
      {
        email: "exp@agrichain.test",
        orgId: U.org,
        role: "FACTORY_STAFF",
        createdByUserId: U.admin,
        ttlHours: 1,
      },
      pgliteAdapter(db),
    );
    // paksa kedaluwarsa
    await asService(
      db,
      "update invitations set expires_at = now() - interval '1 hour' where id = $1",
      [invite.invitationId],
    );
    await expect(
      acceptInvitation(
        {
          token: invite.rawToken,
          email: "exp@agrichain.test",
          privyDid: "did:privy:exp",
          displayName: "Petugas Exp",
        },
        pgliteAdapter(db),
      ),
    ).rejects.toMatchObject({ code: "EXPIRED" });
  });

  it("DID sama mengaktivasi undangan lain → profil diperbarui, tidak duplikat", async () => {
    const i1 = await createInvitation(
      {
        email: "reuse@agrichain.test",
        orgId: U.org,
        role: "RETAILER_ADMIN",
        createdByUserId: U.admin,
      },
      pgliteAdapter(db),
    );
    const r1 = await acceptInvitation(
      {
        token: i1.rawToken,
        email: "reuse@agrichain.test",
        privyDid: "did:privy:reuse",
        displayName: "Reuse",
      },
      pgliteAdapter(db),
    );
    const i2 = await createInvitation(
      {
        email: "reuse2@agrichain.test",
        orgId: U.org,
        role: "FACTORY_STAFF",
        createdByUserId: U.admin,
      },
      pgliteAdapter(db),
    );
    const r2 = await acceptInvitation(
      {
        token: i2.rawToken,
        email: "reuse2@agrichain.test",
        privyDid: "did:privy:reuse",
        displayName: "Reuse",
      },
      pgliteAdapter(db),
    );
    expect(r1.userId).toBe(r2.userId); // satu profil, dua membership
    const n = await asService<{ n: number }>(
      db,
      "select count(*)::int n from memberships where user_id = $1",
      [r1.userId],
    );
    expect(n[0].n).toBe(2);
  });
});
