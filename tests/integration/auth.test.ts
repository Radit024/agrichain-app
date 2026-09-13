import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, asService } from "../helpers/pglite";

/**
 * Integration test auth (IMPLEMENTATION-PLAN §6.4) — mock di batas Privy (K11).
 * Token valid/expired/invalid + IDOR/BOLA + invite flow.
 */

const DID_OK = "did:privy:integration:user-a";
const DID_OTHER = "did:privy:integration:user-b";

// Mock boundary Privy (K11) — module asli menolak jalan tanpa env.
vi.mock("@/server/auth/privy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth/privy")>();
  return {
    ...actual,
    extractBearerToken: actual.extractBearerToken,
    PrivyAuthError: actual.PrivyAuthError,
    verifyPrivyAccessToken: vi.fn(async (token: string) => {
      if (token === "token-valid-user-a") {
        return { did: DID_OK, email: "a@agrichain.test" };
      }
      if (token === "token-valid-user-b") {
        return { did: DID_OTHER, email: "b@agrichain.test" };
      }
      if (token === "token-expired") {
        throw new actual.PrivyAuthError("SESSION_EXPIRED");
      }
      throw new actual.PrivyAuthError("SESSION_INVALID");
    }),
  };
});

// server-only guard membuat error di vitest → mock kosongkan efeknya
vi.mock("server-only", () => ({}));

it("exports the Privy login control", async () => {
  const loginControl = await import("@/components/auth/privy-login-button");
  expect(loginControl.PrivyLoginButton).toBeTypeOf("function");
});

import {
  requireSession,
  requireRole,
  assertBatchOrg,
  assertMfa,
  AuthError,
} from "@/server/auth/session";
import type { UserDirectory } from "@/server/auth/session";

let db: PGlite;

const U = {
  orgA: "aaaaaaaa-0000-0000-0000-000000000001",
  orgB: "aaaaaaaa-0000-0000-0000-000000000002",
  userA: "bbbbbbbb-0000-0000-0000-000000000001",
  userB: "bbbbbbbb-0000-0000-0000-000000000002",
  catA: "cccccccc-0000-0000-0000-000000000001",
  profileA: "dddddddd-0000-0000-0000-000000000001",
  batchA: "eeeeeeee-0000-0000-0000-000000000001",
  batchB: "eeeeeeee-0000-0000-0000-000000000002",
} as const;

function directory(): UserDirectory {
  return {
    findUserByDid: async (did) => {
      const rows = await asService<{
        id: string;
        privy_did: string;
        display_name: string;
        email: string | null;
        wallet_address: string | null;
        mfa_verified: boolean;
        status: string;
      }>(
        db,
        "select id, privy_did, display_name, email, wallet_address, mfa_verified, status from app_users where privy_did = $1",
        [did],
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        did: r.privy_did,
        displayName: r.display_name,
        email: r.email,
        walletAddress: r.wallet_address,
        mfaVerified: r.mfa_verified,
        status: r.status as "PENDING_INVITE" | "ACTIVE" | "REVOKED",
      };
    },
    findMemberships: async (userId) => {
      return asService(
        db,
        `select m.org_id as "orgId", o.name as "orgName", m.role
         from memberships m join orgs o on o.id = m.org_id where m.user_id = $1`,
        [userId],
      ) as Promise<import("@/server/auth/session").Membership[]>;
    },
  };
}

beforeAll(async () => {
  db = await createTestDb();
  // seed minimal: 2 org, user A (PRODUCER_ADMIN orgA, MFA ok), user B (RETAILER_ADMIN orgB)
  await asService(
    db,
    `insert into orgs (id, name, kind) values
    ('${U.orgA}','Produsen A','PRODUCER'), ('${U.orgB}','Retailer B','RETAILER')`,
  );
  await asService(
    db,
    `insert into app_users (id, privy_did, display_name, email, mfa_verified, status) values
     ('${U.userA}','${DID_OK}','User A','a@agrichain.test',true,'ACTIVE'),
     ('${U.userB}','${DID_OTHER}','User B','b@agrichain.test',true,'ACTIVE')`,
  );
  await asService(
    db,
    `insert into memberships (user_id, org_id, role) values
     ('${U.userA}','${U.orgA}','PRODUCER_ADMIN'),
     ('${U.userB}','${U.orgB}','RETAILER_ADMIN')`,
  );
  // batch milik orgA & orgB (untuk IDOR)
  await asService(
    db,
    `insert into product_categories (id, org_id, name, handling_mode) values
     ('${U.catA}','${U.orgA}','Kategori A','COLD_CHAIN')`,
  );
  await asService(
    db,
    `insert into monitoring_profiles (id, category_id, version, stale_after_seconds) values
     ('${U.profileA}','${U.catA}',1,900)`,
  );
  const snap = JSON.stringify({
    handlingMode: "COLD_CHAIN",
    version: 1,
    staleAfterSeconds: 900,
    rules: [],
  });
  await asService(
    db,
    `insert into batches (id, org_id, category_id, profile_id, batch_code, public_id,
       profile_snapshot, chain_batch_key) values
     ('${U.batchA}','${U.orgA}','${U.catA}','${U.profileA}','B-A','AAAA1111BBBB2222CCCC' || '3333',
      '${snap}'::jsonb, 'ck-a'),
     ('${U.batchB}','${U.orgB}','${U.catA}','${U.profileA}','B-B','AAAA1111BBBB2222CCCC' || '4444',
      '${snap}'::jsonb, 'ck-b') on conflict do nothing`,
  );
});

afterAll(async () => {
  await db.close();
});

describe("auth: token & session (§6.4)", () => {
  it("token valid → session + role benar", async () => {
    const s = await requireSession("Bearer token-valid-user-a", directory());
    expect(s.user.displayName).toBe("User A");
    expect(s.memberships[0].role).toBe("PRODUCER_ADMIN");
  });

  it("token expired/invalid/tanpa header → AuthError SESSION_INVALID", async () => {
    await expect(requireSession("Bearer token-expired", directory())).rejects.toMatchObject({
      code: "SESSION_INVALID",
    });
    await expect(requireSession("Bearer token-salah", directory())).rejects.toBeInstanceOf(
      AuthError,
    );
    await expect(requireSession(null, directory())).rejects.toMatchObject({
      code: "SESSION_INVALID",
    });
  });

  it("DID tidak dikenal → NO_ACCESS (bukan user internal)", async () => {
    // token valid Privy tapi DID tidak ada di app_users
    const dir = directory();
    await expect(
      requireSession("Bearer token-valid-user-a", {
        ...dir,
        findUserByDid: async () => null,
      }),
    ).rejects.toMatchObject({ code: "NO_ACCESS" });
  });

  it("requireRole: role salah → ROLE_REQUIRED", async () => {
    await expect(
      requireRole("Bearer token-valid-user-b", directory(), ["PRODUCER_ADMIN"]),
    ).rejects.toMatchObject({ code: "ROLE_REQUIRED" });
    const s = await requireRole("Bearer token-valid-user-a", directory(), ["PRODUCER_ADMIN"]);
    expect(s.user.id).toBe(U.userA);
  });
});

describe("auth: IDOR/BOLA (§6.4)", () => {
  it("user org A membaca batch org B → BATCH_FORBIDDEN meski tahu ID", async () => {
    const s = await requireSession("Bearer token-valid-user-a", directory());
    expect(() => assertBatchOrg(U.orgB, s)).toThrowError(AuthError);
    // batch sendiri OK
    expect(() => assertBatchOrg(U.orgA, s)).not.toThrow();
  });

  it("public_id/ID batch tidak membuka akses lintas org", async () => {
    const s = await requireSession("Bearer token-valid-user-b", directory());
    // user B (orgB) mencoba batch orgA
    expect(() => assertBatchOrg(U.orgA, s)).toThrowError(AuthError);
  });
});

describe("auth: MFA (§6.3)", () => {
  it("assertMfa menolak bila belum diverifikasi", async () => {
    const dir = directory();
    const s = await requireSession("Bearer token-valid-user-a", dir);
    expect(() => assertMfa(s)).not.toThrow(); // userA mfa_verified=true
  });
  it("user tanpa MFA → MFA_REQUIRED", async () => {
    await asService(db, "update app_users set mfa_verified = false where id = $1", [U.userA]);
    const s = await requireSession("Bearer token-valid-user-a", directory());
    expect(() => assertMfa(s)).toThrowError(AuthError);
    await asService(db, "update app_users set mfa_verified = true where id = $1", [U.userA]);
  });
});
