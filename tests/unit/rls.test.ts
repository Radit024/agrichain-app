import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, asRole, asService } from "../helpers/pglite";

let db: PGlite;

// Semua tabel aplikasi (§4.0 + §4.0.1) — tanpa rate_limit_counters (infra)
const TABLES = [
  "orgs",
  "product_categories",
  "monitoring_parameter_definitions",
  "monitoring_profiles",
  "profile_parameter_rules",
  "app_users",
  "memberships",
  "invitations",
  "distribution_points",
  "distribution_point_schedules",
  "point_assignments",
  "batches",
  "handoff_intents",
  "handoff_records",
  "access_codes",
  "condition_readings",
  "condition_measurements",
  "condition_evaluations",
  "access_attempts",
  "anchor_digests",
  "transaction_references",
  "rate_limit_counters",
  "audit_logs",
];

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

describe("RLS: role anon & authenticated ditolak dari seluruh tabel (K16)", () => {
  for (const role of ["anon", "authenticated"] as const) {
    describe(`role ${role}`, () => {
      for (const table of TABLES) {
        it(`SELECT ${table} → denied`, async () => {
          await expect(asRole(db, role, `select * from ${table}`)).rejects.toThrow(
            /permission denied/i,
          );
        });
      }
    });
  }

  it("SELECT view server_public_batch_projection → denied untuk anon", async () => {
    await expect(
      asRole(db, "anon", "select * from server_public_batch_projection"),
    ).rejects.toThrow(/permission denied/i);
  });

  it("INSERT batches sebagai anon → denied", async () => {
    await expect(
      asRole(
        db,
        "anon",
        `insert into orgs (id, name, kind) values ('00000000-0000-0000-0000-000000000001','X','PRODUCER')`,
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("service-role (superuser) dapat operasi penuh", () => {
  it("insert org + select kembali", async () => {
    const orgs = await asService(
      db,
      `insert into orgs (id, name, kind)
       values ('00000000-0000-0000-0000-0000000000a1','Pabrik Susu Makmur','PRODUCER')
       returning id, name`,
    );
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe("Pabrik Susu Makmur");
    const count = await asService(db, "select count(*)::int as n from orgs");
    expect(count[0].n).toBe(1);
  });

  it("constraint handling_mode valid (check enum)", async () => {
    await expect(
      asService(
        db,
        `insert into product_categories (id, org_id, name, handling_mode)
         values ('00000000-0000-0000-0000-0000000000b2',
                 '00000000-0000-0000-0000-0000000000a1','Susu Pasteurisasi','INVALID')`,
      ),
    ).rejects.toThrow();
  });

  it("partial unique index: hanya satu handoff intent PENDING per batch", async () => {
    // setup minimal batch
    await asService(
      db,
      `insert into monitoring_parameter_definitions (code, unit, value_kind) values
        ('TEMPERATURE','°C','NUMBER'),
        ('HUMIDITY','%RH','NUMBER')`,
    );
    await asService(
      db,
      `insert into product_categories (id, org_id, name, handling_mode) values
        ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','Susu Pasteurisasi','COLD_CHAIN')`,
    );
    await asService(
      db,
      `insert into monitoring_profiles (id, category_id, version, stale_after_seconds)
       values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000b2',1,900)`,
    );
    await asService(
      db,
      `insert into app_users (id, privy_did, display_name, status)
       values ('00000000-0000-0000-0000-0000000000d1','did:privy:test1','Admin Pabrik','ACTIVE')`,
    );
    await asService(
      db,
      `insert into batches (id, org_id, category_id, profile_id, batch_code, public_id,
         profile_snapshot, chain_batch_key, custodian_wallet, custodian_org_id)
       values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',
               '00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000f1',
               'BATCH-2026-0001','ABCD-2345-6789-WXYZ','{}'::jsonb,'chainkey-1','0xabc','00000000-0000-0000-0000-0000000000a1')`,
    );

    const insertIntent = (key: string, status = "PENDING") =>
      asService(
        db,
        `insert into handoff_intents (batch_id, from_stage, to_stage, sender_user_id,
           sender_wallet, recipient_wallet, recipient_org_id, status, idempotency_key, expires_at)
         values ('00000000-0000-0000-0000-0000000000b1',0,1,'00000000-0000-0000-0000-0000000000d1',
           '0xabc','0xdef','00000000-0000-0000-0000-0000000000a1','${status}','${key}', now() + interval '1 day')`,
      );

    await insertIntent("idem-1");
    // intent PENDING kedua untuk batch sama → ditolak partial index
    await expect(insertIntent("idem-2")).rejects.toThrow(/unique/i);
    // namun setelah status bukan PENDING (CONFIRMED), boleh insert baru
    await insertIntent("idem-3", "CONFIRMED");
    const n = await asService(
      db,
      "select count(*)::int as n from handoff_intents where batch_id = '00000000-0000-0000-0000-0000000000b1'",
    );
    expect(n[0].n).toBe(2);
  });
});
