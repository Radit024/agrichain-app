"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { generatePublicId } from "@/modules/public-id";
import { ActionError, computeChainBatchKey } from "./errors";
import type { DbAdapter } from "./invitations";
import type { Session } from "../auth/session";

/**
 * Mutasi batch (IMPLEMENTATION-PLAN §7.3, K14): validasi penuh di server,
 * tulis intent `chainSyncStatus=PENDING` + idempotency key; tx ditandatangani
 * embedded wallet pengguna (client) lalu receipt dikonfirmasi/direkonsiliasi.
 */

export const registerBatchSchema = z.object({
  categoryId: z.string().uuid(),
  profileId: z.string().uuid(),
  batchCode: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9-]+$/, "HURUF BESAR/angka/strip"),
  custodianWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

/** chainBatchKey — diimpor dari errors.ts untuk konsistensi; re-export tidak
 * diperbolehkan di file "use server". Gunakan computeChainBatchKey langsung. */

export interface RegisterBatchResult {
  batchId: string;
  publicId: string;
  chainBatchKey: string;
  idempotencyKey: string;
  profileSnapshot: unknown;
}

/**
 * Mendaftarkan batch: role PRODUCER_ADMIN/FACTORY_STAFF, org konsisten,
 * profil milik org, public_id unik (retry collision), snapshot profil disimpan.
 */
export async function registerBatch(
  input: unknown,
  db: DbAdapter,
  session: Session,
): Promise<RegisterBatchResult> {
  const parsed = registerBatchSchema.safeParse(input);
  if (!parsed.success) throw new ActionError("INPUT_INVALID");

  const { categoryId, profileId, batchCode, custodianWallet } = parsed.data;
  if (!session.memberships.some((m) => m.role === "PRODUCER_ADMIN" || m.role === "FACTORY_STAFF")) {
    throw new ActionError("ROLE_REQUIRED");
  }
  if (!session.user.mfaVerified) throw new ActionError("MFA_REQUIRED");

  const orgId = session.memberships.find(
    (m) => m.role === "PRODUCER_ADMIN" || m.role === "FACTORY_STAFF",
  )!.orgId;

  // kategori & profil harus milik org yang sama (K17)
  const cat = await db.query<{ org_id: string }>(
    "select org_id from product_categories where id = $1",
    [categoryId],
  );
  if (cat.length === 0 || cat[0].org_id !== orgId) throw new ActionError("INPUT_INVALID");
  const profile = await db.query<{ category_id: string; is_locked: boolean }>(
    "select category_id, is_locked from monitoring_profiles where id = $1",
    [profileId],
  );
  if (profile.length === 0 || profile[0].category_id !== categoryId) {
    throw new ActionError("INPUT_INVALID");
  }

  // batch_code unik per org
  const dup = await db.query<{ n: number }>(
    "select count(*)::int as n from batches where org_id = $1 and batch_code = $2",
    [orgId, batchCode],
  );
  if (dup[0].n > 0) throw new ActionError("DUPLICATE");

  // snapshot profil (dengan rules) untuk evaluasi stabil
  const rules = await db.query<{
    parameter_code: string;
    unit: string;
    required: boolean;
    min_value_ppm: string | null;
    max_value_ppm: string | null;
    tolerance_seconds: number | null;
    severity: string;
  }>(
    `select r.parameter_code, d.unit, r.required, r.min_value_ppm, r.max_value_ppm,
            r.tolerance_seconds, r.severity
     from profile_parameter_rules r
     join monitoring_parameter_definitions d on d.code = r.parameter_code
     where r.profile_id = $1`,
    [profileId],
  );
  const profileMeta = await db.query<{
    handling_mode: string;
    version: number;
    stale_after_seconds: number;
  }>(
    `select c.handling_mode::text as handling_mode, p.version, p.stale_after_seconds
     from monitoring_profiles p join product_categories c on c.id = p.category_id
     where p.id = $1`,
    [profileId],
  );
  const snapshot = {
    handlingMode: profileMeta[0].handling_mode,
    version: profileMeta[0].version,
    staleAfterSeconds: profileMeta[0].stale_after_seconds,
    rules: rules.map((r) => ({
      code: r.parameter_code,
      unit: r.unit,
      required: r.required,
      min: r.min_value_ppm !== null ? Number(r.min_value_ppm) : undefined,
      max: r.max_value_ppm !== null ? Number(r.max_value_ppm) : undefined,
      toleranceSeconds: r.tolerance_seconds ?? undefined,
      severity: r.severity,
    })),
  };

  // public_id dengan retry collision (K18)
  const batchId = randomUUID();
  let publicId = generatePublicId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db.query<{ n: number }>(
      "select count(*)::int as n from batches where public_id = $1",
      [publicId],
    );
    if (clash[0].n === 0) break;
    publicId = generatePublicId();
  }

  const chainBatchKey = computeChainBatchKey(orgId, batchId);
  const idempotencyKey = `batch-register:${orgId}:${batchCode}`;

  // idempotent: bila pernah dibuat (unik idempotency), kembalikan yang ada
  const existingTx = await db.query<{ batch_id: string }>(
    `select batch_id from transaction_references where idempotency_key = $1`,
    [idempotencyKey],
  );
  if (existingTx.length > 0) {
    const b = await db.query<{
      id: string;
      public_id: string;
      chain_batch_key: string;
      profile_snapshot: unknown;
    }>("select id, public_id, chain_batch_key, profile_snapshot from batches where id = $1", [
      existingTx[0].batch_id,
    ]);
    return {
      batchId: b[0].id,
      publicId: b[0].public_id,
      chainBatchKey: b[0].chain_batch_key,
      idempotencyKey,
      profileSnapshot: b[0].profile_snapshot,
    };
  }

  await db.query(
    `insert into batches (id, org_id, category_id, profile_id, batch_code, public_id,
       custodian_wallet, custodian_org_id, profile_snapshot, chain_sync_status, chain_batch_key)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'PENDING',$10)`,
    [
      batchId,
      orgId,
      categoryId,
      profileId,
      batchCode,
      publicId,
      custodianWallet,
      orgId,
      JSON.stringify(snapshot),
      chainBatchKey,
    ],
  );
  await db.query(
    `insert into transaction_references (batch_id, event_type, idempotency_key, submitted_by)
     values ($1,'BATCH_REGISTERED',$2,$3)`,
    [batchId, idempotencyKey, session.user.id],
  );

  return { batchId, publicId, chainBatchKey, idempotencyKey, profileSnapshot: snapshot };
}
