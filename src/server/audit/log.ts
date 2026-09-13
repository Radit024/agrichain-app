import "server-only";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { DbAdapter } from "../actions/invitations";

/**
 * Audit log correlation-id (IMPLEMENTATION-PLAN §7.2/F2).
 * ATURAN MUTLAK: metadata TIDAK PERNAH memuat kode otorisasi mentah,
 * token, atau secret — pemanggil hanya mengirim kode hasil/safe-fields.
 * actor_hash = sha256(DID) → identitas ter-hash, bukan PII mentah.
 */

export function newCorrelationId(): string {
  return randomUUID();
}

export function hashActor(did: string): string {
  return createHash("sha256").update(did).digest("hex");
}

export async function auditLog(
  db: DbAdapter,
  correlationId: string,
  action: string,
  metadata: Record<string, unknown>,
  actorDid?: string,
): Promise<void> {
  // Defense-in-depth: tolak nilai yang tampak seperti secret
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof v !== "string") continue;
    if (/bearer\s|sk-|privy-secret|private_key/i.test(`${k}=${v}`)) {
      throw new Error(`AUDIT_REJECTED_FIELD:${k}`);
    }
  }
  await db.query(
    `insert into audit_logs (correlation_id, actor_hash, action, metadata)
     values ($1, $2, $3, $4::jsonb)`,
    [correlationId, actorDid ? hashActor(actorDid) : null, action, JSON.stringify(metadata)],
  );
}
