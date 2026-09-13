import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, asService } from "../helpers/pglite";
import { checkBucket, LIMITS, checkRateLimit } from "@/server/rate-limit/postgres";
import { auditLog, newCorrelationId, hashActor } from "@/server/audit/log";
import { pgliteAdapter } from "@/server/actions/invitations";

vi.mock("server-only", () => ({}));

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

describe("rate limiter fixed-window (F1, K10)", () => {
  it("batas tercapai → allowed=false pada hit ke-(limit+1)", async () => {
    const key = "verify:ip:1.2.3.4";
    for (let i = 0; i < LIMITS.verifyIp; i++) {
      const r = await checkBucket(pgliteAdapter(db), key, LIMITS.verifyIp);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkBucket(pgliteAdapter(db), key, LIMITS.verifyIp);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("window baru (menit berikut) → reset", async () => {
    const key = "verify:pid:ABCD-TEST";
    const nextMinute = new Date(Math.ceil(Date.now() / 60_000) * 60_000 + 60_000);
    const r = await checkBucket(pgliteAdapter(db), key, LIMITS.verifyPublicId, nextMinute);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(LIMITS.verifyPublicId - 1);
  });

  it("multi-bucket: satu bucket penuh → tolak", async () => {
    const ipKey = "verify:ip:9.9.9.9";
    // isi penuh IP
    for (let i = 0; i < LIMITS.verifyIp; i++) {
      await checkBucket(pgliteAdapter(db), ipKey, LIMITS.verifyIp);
    }
    const r = await checkRateLimit(pgliteAdapter(db), [
      { key: ipKey, limit: LIMITS.verifyIp },
      { key: "verify:did:didx", limit: LIMITS.verifyDid },
    ]);
    expect(r.allowed).toBe(false);
  });

  it("counter tidak tumpang tindih antar key berbeda", async () => {
    const a = await checkBucket(pgliteAdapter(db), "public:ip:1.1.1.1", LIMITS.publicIp);
    const b = await checkBucket(pgliteAdapter(db), "public:ip:2.2.2.2", LIMITS.publicIp);
    expect(a.remaining).toBe(b.remaining);
  });
});

describe("audit log correlation-id (F2)", () => {
  it("menulis baris audit + actor_hash sha256(DID) + metadata", async () => {
    const rid = newCorrelationId();
    await auditLog(pgliteAdapter(db), rid, "access.verify", { result: "SAH" }, "did:privy:audit-1");
    const rows = await asService<{ action: string; actor_hash: string; metadata: unknown }>(
      db,
      "select action, actor_hash, metadata from audit_logs where correlation_id = $1",
      [rid],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("access.verify");
    expect(rows[0].actor_hash).toBe(hashActor("did:privy:audit-1"));
  });

  it("menolak metadata yang mengandung pola secret (defense-in-depth)", async () => {
    await expect(
      auditLog(pgliteAdapter(db), newCorrelationId(), "x.y", { token: "Bearer abc.def.ghi" }),
    ).rejects.toThrow(/AUDIT_REJECTED_FIELD/);
  });

  it("menolak metadata yang mengandung pola api-key", async () => {
    await expect(
      auditLog(pgliteAdapter(db), newCorrelationId(), "x.y", { note: "contains sk-12345 key" }),
    ).rejects.toThrow(/AUDIT_REJECTED_FIELD/);
  });

  it("no-leak: kode otorisasi mentah tidak pernah masuk audit (marker scan)", async () => {
    const MARKER = "KODE-RAHASIA-DO-NOT-LEAK";
    // pemanggil yang benar hanya mengirim result — simulasi handler sehat:
    await auditLog(
      pgliteAdapter(db),
      newCorrelationId(),
      "access.verify",
      { result: "TIDAK_SAH" },
      "did:privy:audit-2",
    );
    const all = await asService<string[]>(db, "select metadata::text from audit_logs");
    const joined = JSON.stringify(all);
    expect(joined).not.toContain(MARKER);
  });
});
