import "server-only";
import type { DbAdapter } from "../actions/invitations";

/**
 * Rate limiter fixed-window (IMPLEMENTATION-PLAN §7.1/K10) — tabel
 * rate_limit_counters. Respons 429 netral: tidak membocorkan validitas kode.
 *
 * Limiter per-endpoint:
 * - verify: 10/menit per IP, 20/menit per public_id, 30/menit per DID
 * - public: 60/menit per IP
 */

export const LIMITS = {
  verifyIp: Number(process.env.RATE_VERIFY_PER_MIN ?? 10),
  verifyPublicId: 20,
  verifyDid: 30,
  publicIp: Number(process.env.RATE_PUBLIC_PER_MIN ?? 60),
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Cek & inkremen satu bucket. Fixed window per menit (jam dinding UTC).
 * Atomic: upsert + increment dalam satu statement.
 */
export async function checkBucket(
  db: DbAdapter,
  bucketKey: string,
  limit: number,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const resetAt = new Date(windowStart.getTime() + 60_000);

  const rows = await db.query<{ count: number }>(
    `insert into rate_limit_counters (bucket_key, window_start, count)
     values ($1, $2, 1)
     on conflict (bucket_key, window_start) do update
       set count = rate_limit_counters.count + 1
     returning count`,
    [bucketKey, windowStart.toISOString()],
  );
  const count = rows[0].count;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

/** Cek beberapa bucket sekaligus (IP + DID + public_id) — semua harus lolos. */
export async function checkRateLimit(
  db: DbAdapter,
  buckets: Array<{ key: string; limit: number }>,
): Promise<RateLimitResult> {
  let worst: RateLimitResult | null = null;
  for (const b of buckets) {
    const r = await checkBucket(db, b.key, b.limit);
    if (!r.allowed) return r; // tolak seketika; jangan inkremen sisanya di praktik —
    if (!worst || r.remaining < worst.remaining) worst = r;
  }
  return worst!;
}
