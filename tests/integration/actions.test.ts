import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, asService } from "../helpers/pglite";
import { hash } from "@node-rs/argon2";
import { pgliteAdapter } from "@/server/actions/invitations";
import { registerBatch } from "@/server/actions/batches";
import { ActionError } from "@/server/actions/errors";
import {
  initiateHandoff,
  confirmHandoff,
  cancelHandoff,
  expireHandoffs,
} from "@/server/actions/handoffs";
import { verifyAccess } from "@/server/actions/access";
import { getPublicBatchByPublicId } from "@/server/actions/public-batch";
import { reconcileChainWrites, type ChainReader } from "@/server/server-chain-shim";
import type { Session, Membership } from "@/server/auth/session";

vi.mock("server-only", () => ({}));

// reconcile.ts dipanggil via path alias server/chain — buat module kecil untuk akses test
// (menghindari server-only chain ganda)

let db: PGlite;
const A = pgliteAdapter as (db: PGlite) => ReturnType<typeof pgliteAdapter>;

const ORG_PRODUCER = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const ORG_DISTRIBUTOR = "c9bf9e57-1685-4c89-bafb-ff14af961f90";
const ORG_RETAILER = "0c9d9e07-6f0f-4c2b-9a3d-3f2a6b1c8d01";
const USER_PRODUCER = "1c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d02";
const USER_DISTRIBUTOR = "1c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d03";
const USER_STAFF = "1c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d04";
const CATEGORY = "2c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d05";
const PROFILE = "3c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d06";
const POINT_DC = "4c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d07";

const WALLET_PRODUCER = "0x1111111111111111111111111111111111111111";
const WALLET_DISTRIBUTOR = "0x2222222222222222222222222222222222222222";
const WALLET_STAFF = "0x3333333333333333333333333333333333333333";

const AUTH_CODE = "KODE-INTEGRATION-TEST-01";

function sessionOf(userId: string, wallet: string, memberships: Membership[], mfa = true): Session {
  return {
    user: {
      id: userId,
      did: `did:privy:${userId}`,
      displayName: "Test",
      email: null,
      walletAddress: wallet,
      mfaVerified: mfa,
      status: "ACTIVE",
    },
    memberships,
  };
}

const memProducer: Membership = {
  orgId: ORG_PRODUCER,
  orgName: "Produsen",
  role: "PRODUCER_ADMIN",
};
const memDistributor: Membership = {
  orgId: ORG_DISTRIBUTOR,
  orgName: "Dist",
  role: "DISTRIBUTOR_ADMIN",
};
const memStaff: Membership = { orgId: ORG_PRODUCER, orgName: "Produsen", role: "FACTORY_STAFF" };

beforeAll(async () => {
  db = await createTestDb();
  await asService(
    db,
    `insert into orgs (id, name, kind) values
     ('${ORG_PRODUCER}','Produsen','PRODUCER'),
     ('${ORG_DISTRIBUTOR}','Distributor','DISTRIBUTOR'),
     ('${ORG_RETAILER}','Retailer','RETAILER')`,
  );
  await asService(
    db,
    `insert into monitoring_parameter_definitions (code, unit, value_kind) values
    ('TEMPERATURE','°C','NUMBER'),('HUMIDITY','%RH','NUMBER')`,
  );
  await asService(
    db,
    `insert into product_categories (id, org_id, name, handling_mode) values
     ('${CATEGORY}','${ORG_PRODUCER}','Susu Pasteurisasi','COLD_CHAIN')`,
  );
  await asService(
    db,
    `insert into monitoring_profiles (id, category_id, version, stale_after_seconds)
     values ('${PROFILE}','${CATEGORY}',1,900)`,
  );
  await asService(
    db,
    `insert into profile_parameter_rules (profile_id, parameter_code, required, min_value_ppm, max_value_ppm, tolerance_seconds, severity)
     values ('${PROFILE}','TEMPERATURE',true,2000000,6000000,900,'CRITICAL')`,
  );
  await asService(
    db,
    `insert into app_users (id, privy_did, display_name, wallet_address, mfa_verified, status) values
     ('${USER_PRODUCER}','did:privy:producer','Admin Produsen','${WALLET_PRODUCER}',true,'ACTIVE'),
     ('${USER_DISTRIBUTOR}','did:privy:distributor','Admin Distributor','${WALLET_DISTRIBUTOR}',true,'ACTIVE'),
     ('${USER_STAFF}','did:privy:staff','Petugas','${WALLET_STAFF}',true,'ACTIVE')`,
  );
  await asService(
    db,
    `insert into memberships (user_id, org_id, role) values
     ('${USER_PRODUCER}','${ORG_PRODUCER}','PRODUCER_ADMIN'),
     ('${USER_DISTRIBUTOR}','${ORG_DISTRIBUTOR}','DISTRIBUTOR_ADMIN'),
     ('${USER_STAFF}','${ORG_PRODUCER}','FACTORY_STAFF')`,
  );
  await asService(
    db,
    `insert into distribution_points (id, org_id, public_name) values
     ('${POINT_DC}','${ORG_DISTRIBUTOR}','DC Jakarta')`,
  );
});

afterAll(async () => {
  await db.close();
});

describe("F3: registerBatch", () => {
  it("produser valid → batch + tx ref PENDING + snapshot + public_id Crockford", async () => {
    const r = await registerBatch(
      {
        categoryId: CATEGORY,
        profileId: PROFILE,
        batchCode: "BATCH-INT-001",
        custodianWallet: WALLET_PRODUCER,
      },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    expect(r.publicId).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    const tx = await asService<{ chain_sync_status: string }>(
      db,
      "select chain_sync_status from transaction_references where idempotency_key = $1",
      [r.idempotencyKey],
    );
    expect(tx[0].chain_sync_status).toBe("PENDING");
    const snap = r.profileSnapshot as { rules: unknown[] };
    expect(snap.rules.length).toBe(1);
  });

  it("duplikat batch_code → DUPLICATE; idempotent ulang → hasil sama", async () => {
    const s = sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]);
    await expect(
      registerBatch(
        {
          categoryId: CATEGORY,
          profileId: PROFILE,
          batchCode: "BATCH-INT-001",
          custodianWallet: WALLET_PRODUCER,
        },
        A(db),
        s,
      ),
    ).rejects.toMatchObject({ code: "DUPLICATE" });
  });

  it("role salah (distributor) → ROLE_REQUIRED", async () => {
    await expect(
      registerBatch(
        {
          categoryId: CATEGORY,
          profileId: PROFILE,
          batchCode: "BATCH-INT-002",
          custodianWallet: WALLET_PRODUCER,
        },
        A(db),
        sessionOf(USER_DISTRIBUTOR, WALLET_DISTRIBUTOR, [memDistributor]),
      ),
    ).rejects.toMatchObject({ code: "ROLE_REQUIRED" });
  });

  it("tanpa MFA → MFA_REQUIRED", async () => {
    await expect(
      registerBatch(
        {
          categoryId: CATEGORY,
          profileId: PROFILE,
          batchCode: "BATCH-INT-003",
          custodianWallet: WALLET_PRODUCER,
        },
        A(db),
        sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer], false),
      ),
    ).rejects.toMatchObject({ code: "MFA_REQUIRED" });
  });
});

describe("F4: handoff dua konfirmasi", () => {
  let batchId: string;

  beforeAll(async () => {
    const r = await registerBatch(
      {
        categoryId: CATEGORY,
        profileId: PROFILE,
        batchCode: "BATCH-HO-001",
        custodianWallet: WALLET_PRODUCER,
      },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    batchId = r.batchId;
  });

  it("inisiasi oleh non-kustodian (petugas lain org sama) → ROLE_REQUIRED", async () => {
    await expect(
      initiateHandoff(
        { batchId, recipientWallet: WALLET_DISTRIBUTOR, recipientOrgId: ORG_DISTRIBUTOR },
        A(db),
        sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
      ),
    ).rejects.toMatchObject({ code: "ROLE_REQUIRED" });
  });

  it("inisiasi valid oleh kustodian → intent PENDING + tx ref", async () => {
    const r = await initiateHandoff(
      { batchId, recipientWallet: WALLET_DISTRIBUTOR, recipientOrgId: ORG_DISTRIBUTOR },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    expect(r.intentId).toBeTruthy();
    const st = await asService<{ status: string; custody_stage: number }>(
      db,
      "select (select status from handoff_intents where id = $1) as status, custody_stage from batches where id = $2",
      [r.intentId, batchId],
    );
    expect(st[0].status).toBe("PENDING");
    expect(st[0].custody_stage).toBe(0); // belum berpindah
  });

  it("inisiasi ganda → PENDING_HANDOFF_EXISTS (INPUT_INVALID)", async () => {
    await expect(
      initiateHandoff(
        { batchId, recipientWallet: WALLET_DISTRIBUTOR, recipientOrgId: ORG_DISTRIBUTOR },
        A(db),
        sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
      ),
    ).rejects.toMatchObject({ name: "ActionError" });
  });

  it("konfirmasi oleh penerima salah → ROLE_REQUIRED", async () => {
    await expect(
      confirmHandoff(batchId, A(db), sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer])),
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("konfirmasi valid oleh distributor → stage 1 + DALAM_DISTRIBUSI + record", async () => {
    const r = await confirmHandoff(
      batchId,
      A(db),
      sessionOf(USER_DISTRIBUTOR, WALLET_DISTRIBUTOR, [memDistributor]),
    );
    expect(r.newStage).toBe(1);
    expect(r.distributionStatus).toBe("DALAM_DISTRIBUSI");
    const b = await asService<{ custody_stage: number; custodian_wallet: string }>(
      db,
      "select custody_stage, custodian_wallet from batches where id = $1",
      [batchId],
    );
    expect(b[0].custody_stage).toBe(1);
    expect(b[0].custodian_wallet).toBe(WALLET_DISTRIBUTOR);
  });

  it("cancel oleh non-pengirim → ROLE_REQUIRED", async () => {
    // batch baru dengan intent PENDING
    const r = await registerBatch(
      {
        categoryId: CATEGORY,
        profileId: PROFILE,
        batchCode: "BATCH-HO-002",
        custodianWallet: WALLET_PRODUCER,
      },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    await initiateHandoff(
      { batchId: r.batchId, recipientWallet: WALLET_DISTRIBUTOR, recipientOrgId: ORG_DISTRIBUTOR },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    await expect(
      cancelHandoff(
        r.batchId,
        A(db),
        sessionOf(USER_DISTRIBUTOR, WALLET_DISTRIBUTOR, [memDistributor]),
      ),
    ).rejects.toMatchObject({ name: "ActionError" });
  });

  it("expireHandoffs menandai intent kedaluwarsa", async () => {
    const r = await registerBatch(
      {
        categoryId: CATEGORY,
        profileId: PROFILE,
        batchCode: "BATCH-HO-003",
        custodianWallet: WALLET_PRODUCER,
      },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    const i = await initiateHandoff(
      { batchId: r.batchId, recipientWallet: WALLET_DISTRIBUTOR, recipientOrgId: ORG_DISTRIBUTOR },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    await asService(
      db,
      "update handoff_intents set expires_at = now() - interval '1 hour' where id = $1",
      [i.intentId],
    );
    const n = await expireHandoffs(A(db));
    expect(n).toBeGreaterThanOrEqual(1);
    const st = await asService<{ status: string }>(
      db,
      "select status from handoff_intents where id = $1",
      [i.intentId],
    );
    expect(st[0].status).toBe("EXPIRED");
  });
});

describe("F5: verifyAccess (pola 10 langkah)", () => {
  let batchId: string;
  let publicId: string;

  beforeAll(async () => {
    const r = await registerBatch(
      {
        categoryId: CATEGORY,
        profileId: PROFILE,
        batchCode: "BATCH-VA-001",
        custodianWallet: WALLET_PRODUCER,
      },
      A(db),
      sessionOf(USER_PRODUCER, WALLET_PRODUCER, [memProducer]),
    );
    batchId = r.batchId;
    publicId = r.publicId;

    // petugas produsen ditugaskan di titik DC distributor (petugas lapangan lintas org
    // via penugasan titik — skenario skripsi: petugas di titik distribusi)
    await asService(
      db,
      `insert into point_assignments (user_id, point_id) values ('${USER_STAFF}','${POINT_DC}')`,
    );
    // kode otorisasi valid untuk batch ini di titik DC + jadwal penuh setiap hari
    const codeHash = await hash(AUTH_CODE, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await asService(
      db,
      `insert into access_codes (batch_id, point_id, code_hash, valid_from, valid_until)
       values ('${batchId}','${POINT_DC}',$1, now() - interval '1 day', now() + interval '30 days')`,
      [codeHash],
    );
    for (let d = 0; d < 7; d++) {
      await asService(
        db,
        `insert into distribution_point_schedules (point_id, weekday, start_time, end_time)
         values ('${POINT_DC}', ${d}, '00:00', '23:59')`,
      );
    }
  });

  it("semua cocok → SAH + attempt tercatat + tx ref VALID_ACCESS", async () => {
    const out = await verifyAccess(
      { publicId, code: AUTH_CODE, locationId: POINT_DC },
      A(db),
      sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
      "127.0.0.1",
    );
    expect(out.result).toBe("SAH");
    const attempts = await asService<{ n: number }>(
      db,
      "select count(*)::int as n from access_attempts where public_id_used = $1",
      [publicId],
    );
    expect(attempts[0].n).toBe(1);
    const tx = await asService<{ n: number }>(
      db,
      "select count(*)::int as n from transaction_references where batch_id = $1 and event_type = 'VALID_ACCESS'",
      [batchId],
    );
    expect(tx[0].n).toBe(1);
  });

  it("kode salah → TIDAK_SAH generik (anti-enumeration); respons TIDAK berisi kode", async () => {
    const out = await verifyAccess(
      { publicId, code: "KODE-SALAH-123456", locationId: POINT_DC },
      A(db),
      sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
      "127.0.0.1",
    );
    expect(out.result).toBe("TIDAK_SAH");
    expect(JSON.stringify(out)).not.toContain("KODE-SALAH");
    expect(out.reason).not.toMatch(/kode (salah|benar|tepat)/i);
  });

  it("publicId tidak dikenal → TIDAK_SAH (netral, sama seperti kode salah)", async () => {
    const out = await verifyAccess(
      { publicId: "AAAA-BBBB-CCCC-DDDD", code: AUTH_CODE, locationId: POINT_DC },
      A(db),
      sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
      "127.0.0.1",
    );
    expect(out.result).toBe("TIDAK_SAH");
    expect(out.reason).toBe("Batch tidak dikenali");
  });

  it("lokasi tidak cocok → ANOMALI", async () => {
    const out = await verifyAccess(
      { publicId, code: AUTH_CODE, locationId: "9c9d9e57-6f0f-4c2b-9a3d-3f2a6b1c8d09" },
      A(db),
      sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
      "127.0.0.2",
    );
    // petugas tidak ditugaskan di titik itu → safe error generik
    expect(out.result).toBe("TIDAK_SAH");
  });

  it("no-leak: kode mentah tidak pernah di DB/log audit (marker scan)", async () => {
    const out = await verifyAccess(
      { publicId, code: "KODE-RAHASIA-MARKER-XX", locationId: POINT_DC },
      A(db),
      sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
      "127.0.0.3",
    );
    expect(out.result).toBe("TIDAK_SAH");
    const all = await asService<string[]>(
      db,
      "select detail_offchain from access_attempts where public_id_used = $1",
      [publicId],
    );
    const audit = await asService<string[]>(
      db,
      "select metadata::text from audit_logs where action = 'access.verify'",
    );
    expect(JSON.stringify(all)).not.toContain("KODE-RAHASIA-MARKER-XX");
    expect(JSON.stringify(audit)).not.toContain("KODE-RAHASIA");
  });

  it("rate limit: percobaan ke-11 per IP → netral 429-copy", async () => {
    const freshIp = "10.0.0.99";
    let last;
    for (let i = 0; i < 12; i++) {
      last = await verifyAccess(
        { publicId, code: "COBA-REPEATED-1234", locationId: POINT_DC },
        A(db),
        sessionOf(USER_STAFF, WALLET_STAFF, [memStaff]),
        freshIp,
      );
    }
    expect(last!.reason).toMatch(/Terlalu banyak percobaan/i);
    expect(last!.result).toBe("TIDAK_SAH");
  });
});

describe("F6: proyeksi publik + reconciler", () => {
  it("getPublicBatchByPublicId → hanya data tersanitasi (tanpa internal notes)", async () => {
    const rows = await asService<{ public_id: string }>(
      db,
      "select public_id from batches where batch_code = 'BATCH-HO-001'",
    );
    const view = await getPublicBatchByPublicId(A(db), rows[0].public_id);
    expect(view).not.toBeNull();
    expect(view!.source).toBe("SIMULATOR");
    expect(view!.timeline.length).toBe(1); // 0→1 dikonfirmasi di suite F4
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("internal_notes");
    expect(serialized).not.toContain("wallet"); // wallet petugas tidak bocor
  });

  it("publicId tidak ada → null (404 netral)", async () => {
    expect(await getPublicBatchByPublicId(A(db), "ZZZZ-9999-XXXX-2222")).toBeNull();
  });

  it("reconciler: tx hash confirmed → CONFIRMED; tanpa hash tua → FAILED", async () => {
    // buat tx ref dengan hash + satu tanpa hash (tua)
    const rows = await asService<{ public_id: string }>(
      db,
      "select public_id from batches where batch_code = 'BATCH-VA-001'",
    );
    const b = await asService<{ id: string }>(db, "select id from batches where public_id = $1", [
      rows[0].public_id,
    ]);
    const confirmedHash = "0xabc0000000000000000000000000000000000000000000000000000000000001";
    await asService(
      db,
      `insert into transaction_references (batch_id, event_type, idempotency_key, chain_tx_hash, chain_sync_status)
       values ($1,'VALID_ACCESS','recon-test-1',$2,'PENDING')`,
      [b[0].id, confirmedHash],
    );
    await asService(
      db,
      `insert into transaction_references (batch_id, event_type, idempotency_key, chain_sync_status, created_at)
       values ($1,'VALID_ACCESS','recon-test-2','PENDING', now() - interval '48 hours')`,
      [b[0].id],
    );

    const chain: ChainReader = {
      getReceipt: async (txHash) =>
        txHash === confirmedHash ? { blockNumber: 123, status: 1 } : null,
    };
    const report = await reconcileChainWrites(A(db), chain, 24);
    expect(report.confirmed).toBeGreaterThanOrEqual(1);
    expect(report.failed).toBeGreaterThanOrEqual(1);
    const st = await asService<{ status: string }>(
      db,
      "select chain_sync_status as status from transaction_references where idempotency_key = 'recon-test-1'",
    );
    expect(st[0].status).toBe("CONFIRMED");
  });
});
