import "server-only";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { classifyAccess } from "@/modules/access-verification";
import { PUBLIC_ID_REGEX } from "@/modules/public-id";
import type { DbAdapter } from "../actions/invitations";
import type { Session } from "../auth/session";
import { checkRateLimit, LIMITS } from "../rate-limit/postgres";
import { auditLog, newCorrelationId } from "../audit/log";

/**
 * Verifikasi akses petugas (IMPLEMENTATION-PLAN §7.2) — pola wajib semua handler:
 * (1) correlation-id + IP rate-limit, (2) Zod, (3) Privy session, (4) rate-limit
 * DID+publicId, (5) point assignment, (6) domain, (7) tulis attempt, (8) SAH →
 * chain ref PENDING, (9) audit TANPA kode mentah, (10) respons aman.
 */

const argon2Params = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
void argon2Params; // verify pakai param tersimpan di hash

const verifyAccessSchema = z.object({
  publicId: z.string().regex(PUBLIC_ID_REGEX),
  code: z.string().min(6).max(128), // tidak pernah dilog/disimpan
  locationId: z.string().uuid(),
});

export interface VerifyAccessResult {
  result: "SAH" | "TIDAK_SAH" | "ANOMALI";
  reason: string; // publicReason — aman untuk petugas
}

/** Respon error aman (anti-enumeration): kode sama untuk semua kegagalan verifikasi. */
export function safeVerifyError(_code?: string): VerifyAccessResult {
  return { result: "TIDAK_SAH", reason: "Verifikasi tidak berhasil. Periksa data dan coba lagi." };
}

export async function verifyAccess(
  input: unknown,
  db: DbAdapter,
  session: Session,
  ip: string,
  opts: { scheduleNow?: Date } = {},
): Promise<VerifyAccessResult> {
  const rid = newCorrelationId();
  const now = opts.scheduleNow ?? new Date();

  // (1) IP limiter awal — netral, tanpa membedakan penyebab
  const ipLimit = await checkRateLimit(db, [{ key: `verify:ip:${ip}`, limit: LIMITS.verifyIp }]);
  if (!ipLimit.allowed) {
    return {
      result: "TIDAK_SAH",
      reason: "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.",
    };
  }

  // (2) Zod
  const parsed = verifyAccessSchema.safeParse(input);
  if (!parsed.success) return safeVerifyError();
  const { publicId, code, locationId } = parsed.data;

  // (3) session sudah diverifikasi pemanggil (Route Handler) — di sini cukup
  // (4) limiter sekunder DID + publicId
  const limits = await checkRateLimit(db, [
    { key: `verify:pid:${publicId}`, limit: LIMITS.verifyPublicId },
    { key: `verify:did:${session.user.did}`, limit: LIMITS.verifyDid },
  ]);
  if (!limits.allowed) {
    return {
      result: "TIDAK_SAH",
      reason: "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.",
    };
  }

  // (5) penugasan titik (P4): user harus ditugaskan di titik verifikasi
  const assignment = await db.query<{ n: number }>(
    `select count(*)::int as n from point_assignments where user_id = $1 and point_id = $2`,
    [session.user.id, locationId],
  );
  if (assignment[0].n === 0) {
    return safeVerifyError();
  }

  // (6) data batch + kode + jadwal + lokasi → domain murni
  const batch = await db.query<{
    id: string;
    paused: boolean;
    org_id: string;
  }>("select id, paused, org_id from batches where public_id = $1", [publicId]);
  const b = batch[0] ?? null;

  const codeRows = b
    ? await db.query<{
        code_hash: string;
        point_id: string;
        valid_until: string;
        valid_from: string;
      }>(
        `select code_hash, point_id, valid_from, valid_until from access_codes
         where batch_id = $1 and valid_until > $2 and valid_from <= $2
         order by valid_until desc limit 1`,
        [b.id, now.toISOString()],
      )
    : [];
  const codeRecord = codeRows[0] ?? null;

  let codeHashMatches = false;
  if (codeRecord) {
    try {
      codeHashMatches = await verify(codeRecord.code_hash, code);
    } catch {
      codeHashMatches = false;
    }
  }

  // jadwal titik: hari+jam sekarang dalam salah satu jendela jadwal
  const scheduleRows = codeRecord
    ? await db.query<{ n: number }>(
        `select count(*)::int as n from distribution_point_schedules
         where point_id = $1 and weekday = extract(dow from $2::timestamptz)
           and start_time <= ($2::timestamptz)::time and end_time >= ($2::timestamptz)::time`,
        [codeRecord.point_id, now.toISOString()],
      )
    : [];
  const withinSchedule = scheduleRows.length > 0 && scheduleRows[0].n > 0;
  const locationMatches = codeRecord ? codeRecord.point_id === locationId : false;

  const outcome = classifyAccess({
    batchExists: !!b,
    codeHashMatches,
    withinSchedule,
    locationMatches,
    batchNotPaused: b ? !b.paused : false,
  });

  // (7) catat SEMUA percobaan (PRD story 21) — detail off-chain
  await db.query(
    `insert into access_attempts (batch_id, public_id_used, point_id, actor_user_id, result, detail_offchain)
     values ($1,$2,$3,$4,$5,$6)`,
    [b?.id ?? null, publicId, locationId, session.user.id, outcome.result, outcome.internalDetail],
  );

  // (8) SAH → siapkan chain write (EVALUATOR menandatangani; K8)
  if (outcome.result === "SAH") {
    await db.query(
      `insert into transaction_references (batch_id, event_type, idempotency_key, submitted_by)
       values ($1,'VALID_ACCESS',$2,$3)
       on conflict (idempotency_key) do nothing`,
      [b!.id, `valid-access:${b!.id}:${rid}`, session.user.id],
    );
  }

  // (9) audit — TANPA kode mentah (auditLog juga menolak pola secret)
  await auditLog(db, rid, "access.verify", { result: outcome.result }, session.user.did);

  // (10) respons hanya publicReason
  return { result: outcome.result, reason: outcome.publicReason };
}
