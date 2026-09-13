"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  validateHandoffInitiation,
  validateHandoffConfirmation,
  validateHandoffCancellation,
  distributionAfterConfirmation,
} from "@/modules/batch-status";
import type { DbAdapter } from "./invitations";
import type { Session } from "../auth/session";
import { ActionError } from "./errors";

/**
 * Serah-terima dua konfirmasi (IMPLEMENTATION-PLAN §7.3, K7/K14):
 * initiate (pengirim) → PENDING intent + tx ref; confirm (penerima) → stage
 * pindah + handoff_records; cancel (pengirim); expire oleh cron.
 */

const initiateSchema = z.object({
  batchId: z.string().uuid(),
  recipientWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  recipientOrgId: z.string().uuid(),
  expiresInHours: z.number().int().min(1).max(72).default(48),
});

interface BatchRow {
  id: string;
  org_id: string;
  custody_stage: number;
  custodian_wallet: string | null;
  distribution_status: string;
  paused: boolean;
  batch_code: string;
}

async function getBatch(db: DbAdapter, batchId: string): Promise<BatchRow | null> {
  const rows = await db.query<BatchRow>(
    `select id, org_id, custody_stage, custodian_wallet, distribution_status, paused, batch_code
     from batches where id = $1`,
    [batchId],
  );
  return rows[0] ?? null;
}

/** Sender role sah per stage (harus sinkron modul batch-status). */
function senderRoleForStage(session: Session, stage: number): boolean {
  const roles = session.memberships.map((m) => m.role);
  if (stage === 0) return roles.some((r) => r === "PRODUCER_ADMIN" || r === "FACTORY_STAFF");
  if (stage === 1) return roles.some((r) => r === "DISTRIBUTOR_ADMIN");
  return false;
}

export interface HandoffIntentResult {
  intentId: string;
  idempotencyKey: string;
  expiresAt: Date;
}

/** Pengirim (kustodian) menginisiasi handoff ke stage berikutnya. */
export async function initiateHandoff(
  input: unknown,
  db: DbAdapter,
  session: Session,
): Promise<HandoffIntentResult> {
  const parsed = initiateSchema.safeParse(input);
  if (!parsed.success) throw new ActionError("INPUT_INVALID");
  if (!session.user.mfaVerified) throw new ActionError("MFA_REQUIRED");
  const { batchId, recipientWallet, recipientOrgId, expiresInHours } = parsed.data;

  const batch = await getBatch(db, batchId);
  if (!batch) throw new ActionError("NOT_FOUND");
  if (batch.paused) throw new ActionError("PAUSED");
  // IDOR: batch harus milik org membership user
  if (!session.memberships.some((m) => m.orgId === batch.org_id)) {
    throw new ActionError("BATCH_FORBIDDEN");
  }

  const err = validateHandoffInitiation({
    batchId,
    currentStage: batch.custody_stage as 0 | 1 | 2,
    currentCustodianWallet: batch.custodian_wallet ?? "",
    senderWallet: session.user.walletAddress ?? "",
    senderRole: senderRoleForStage(session, batch.custody_stage)
      ? (session.memberships[0].role as never)
      : ("OUTSIDER" as never),
    recipientWallet,
    recipientOrgId,
    toStage: (batch.custody_stage + 1) as 1 | 2,
    expiresAt: new Date(Date.now() + expiresInHours * 3600_000),
  });
  // WRONG_SENDER bila wallet user ≠ kustodian
  if (err === "WRONG_ROLE" || err === "STAGE_JUMP" || err === "EXPIRED") {
    throw new ActionError("INPUT_INVALID");
  }
  if (err) throw new ActionError("ROLE_REQUIRED");

  // wallet user harus = kustodian (two-party: inisiator = pemilik saat ini)
  if ((batch.custodian_wallet ?? "") !== (session.user.walletAddress ?? "")) {
    throw new ActionError("ROLE_REQUIRED");
  }

  // satu intent PENDING per batch (partial index DB juga menjaga)
  const active = await db.query<{ n: number }>(
    "select count(*)::int as n from handoff_intents where batch_id = $1 and status = 'PENDING'",
    [batchId],
  );
  if (active[0].n > 0) throw new ActionError("INPUT_INVALID"); // PENDING_HANDOFF_EXISTS

  const intentId = randomUUID();
  const idempotencyKey = `handoff-init:${batchId}:${batch.custody_stage}`;
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000);

  await db.query(
    `insert into handoff_intents
       (id, batch_id, from_stage, to_stage, sender_user_id, sender_wallet,
        recipient_wallet, recipient_org_id, status, idempotency_key, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,$10)
     on conflict (idempotency_key) do nothing`,
    [
      intentId,
      batchId,
      batch.custody_stage,
      batch.custody_stage + 1,
      session.user.id,
      session.user.walletAddress ?? "",
      recipientWallet,
      recipientOrgId,
      idempotencyKey,
      expiresAt.toISOString(),
    ],
  );
  await db.query(
    `insert into transaction_references (batch_id, intent_id, event_type, idempotency_key, submitted_by)
     values ($1,$2,'HANDOFF_INITIATED',$3,$4)`,
    [batchId, intentId, idempotencyKey, session.user.id],
  );
  return { intentId, idempotencyKey, expiresAt };
}

export interface ConfirmResult {
  intentId: string;
  newStage: number;
  distributionStatus: string;
}

/** Penerima menkonfirmasi → stage & kustodian berpindah, record tersimpan. */
export async function confirmHandoff(
  batchId: string,
  db: DbAdapter,
  session: Session,
): Promise<ConfirmResult> {
  if (!session.user.mfaVerified) throw new ActionError("MFA_REQUIRED");
  const batch = await getBatch(db, batchId);
  if (!batch) throw new ActionError("NOT_FOUND");

  const intents = await db.query<{
    id: string;
    sender_wallet: string;
    recipient_wallet: string;
    to_stage: number;
    expires_at: string;
    status: string;
  }>(
    `select id, sender_wallet, recipient_wallet, to_stage, expires_at, status
     from handoff_intents where batch_id = $1 and status = 'PENDING'
     order by initiated_at desc limit 1`,
    [batchId],
  );
  const intent = intents[0] ?? null;

  const err = validateHandoffConfirmation({
    batchId,
    currentStage: batch.custody_stage as 0 | 1 | 2,
    pendingIntent: intent
      ? {
          senderWallet: intent.sender_wallet,
          recipientWallet: intent.recipient_wallet,
          toStage: intent.to_stage as 0 | 1 | 2,
          expiresAt: new Date(intent.expires_at),
          status: "PENDING",
        }
      : null,
    confirmerWallet: session.user.walletAddress ?? "",
    confirmerRole: session.memberships[0]?.role as never,
  });
  if (err === "EXPIRED") {
    await db.query("update handoff_intents set status = 'EXPIRED' where id = $1", [intent!.id]);
    throw new ActionError("INPUT_INVALID");
  }
  if (err) throw new ActionError("ROLE_REQUIRED");
  if (!intent) throw new ActionError("NOT_FOUND");

  const newStage = intent.to_stage;
  const dist = distributionAfterConfirmation(batch.custody_stage as 0 | 1);
  const recipientOrgId = (
    await db.query<{ recipient_org_id: string }>(
      "select recipient_org_id from handoff_intents where id = $1",
      [intent.id],
    )
  )[0].recipient_org_id;

  // transisi atomik: intent CONFIRMED + batch stage/kustodian + handoff_records
  await db.query(
    `update handoff_intents set status = 'CONFIRMED', confirmed_at = now() where id = $1`,
    [intent.id],
  );
  await db.query(
    `update batches set custody_stage = $2, custodian_wallet = $3, custodian_org_id = $4,
       distribution_status = $5, updated_at = now()
     where id = $1`,
    [batchId, newStage, intent.recipient_wallet, recipientOrgId, dist],
  );
  await db.query(
    `insert into handoff_records (batch_id, intent_id, from_stage, to_stage, sender_wallet, recipient_wallet)
     values ($1,$2,$3,$4,$5,$6)`,
    [
      batchId,
      intent.id,
      batch.custody_stage,
      newStage,
      intent.sender_wallet,
      intent.recipient_wallet,
    ],
  );
  await db.query(
    `insert into transaction_references (batch_id, intent_id, event_type, idempotency_key, submitted_by)
     values ($1,$2,'HANDOFF_CONFIRMED',$3,$4)`,
    [batchId, intent.id, `handoff-confirm:${intent.id}`, session.user.id],
  );
  return { intentId: intent.id, newStage, distributionStatus: dist };
}

/** Pengirim membatalkan intent PENDING. */
export async function cancelHandoff(
  batchId: string,
  db: DbAdapter,
  session: Session,
): Promise<void> {
  const intents = await db.query<{
    id: string;
    sender_wallet: string;
    status: string;
  }>(
    `select id, sender_wallet, status from handoff_intents
     where batch_id = $1 and status = 'PENDING' order by initiated_at desc limit 1`,
    [batchId],
  );
  const intent = intents[0] ?? null;
  const err = validateHandoffCancellation({
    currentStage: 0,
    pendingIntent: intent
      ? {
          senderWallet: intent.sender_wallet,
          recipientWallet: "",
          toStage: 1,
          expiresAt: new Date(),
          status: "PENDING",
        }
      : null,
    senderWallet: session.user.walletAddress ?? "",
  });
  if (err) throw new ActionError("ROLE_REQUIRED");
  await db.query(
    "update handoff_intents set status = 'CANCELLED', cancelled_at = now() where id = $1",
    [intent!.id],
  );
  await db.query(
    `insert into transaction_references (batch_id, intent_id, event_type, idempotency_key, submitted_by)
     values ($1,$2,'HANDOFF_CANCELLED',$3,$4)`,
    [batchId, intent!.id, `handoff-cancel:${intent!.id}`, session.user.id],
  );
}

/** Cron: tandai intent PENDING lewat expiry → EXPIRED (job terjadwal). */
export async function expireHandoffs(db: DbAdapter): Promise<number> {
  const rows = await db.query<{ id: string }>(
    `update handoff_intents set status = 'EXPIRED'
     where status = 'PENDING' and expires_at <= now()
     returning id`,
  );
  return rows.length;
}
