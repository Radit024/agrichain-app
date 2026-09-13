import "server-only";
import type { DbAdapter } from "../actions/invitations";

/**
 * Rekonsiliasi chain writes (IMPLEMENTATION-PLAN §7.3, K14):
 * worker membaca transaction_references PENDING; untuk tiap baris yang
 * punya tx hash, cek receipt (interface ChainReader injectable) → CONFIRMED.
 * Tanpa tx hash (client mati sebelum kirim) → biarkan PENDING hingga
 * batas usia, lalu FAILED (transaksi baru diperlukan, bukan re-send buta).
 */

export interface ChainReader {
  /** Mengembalikan receipt bila tx sudah di-mining; null bila belum ada. */
  getReceipt(txHash: string): Promise<{ blockNumber: number; status: number | null } | null>;
  /** Production reader also checks that logs match the expected ledger event. */
  verifyReceipt?: (
    reference: { eventType: string; chainBatchKey: string },
    receipt: unknown,
  ) => boolean;
}

export interface ReconcileReport {
  confirmed: number;
  stillPending: number;
  failed: number;
}

export async function reconcileChainWrites(
  db: DbAdapter,
  chain: ChainReader,
  maxAgeHours = 24,
): Promise<ReconcileReport> {
  const pending = await db.query<{
    id: string;
    chain_tx_hash: string | null;
    created_at: string;
    event_type: string;
    chain_batch_key: string;
  }>(
    `select tr.id, tr.chain_tx_hash, tr.created_at, tr.event_type, b.chain_batch_key
     from transaction_references tr join batches b on b.id = tr.batch_id
     where tr.chain_sync_status = 'PENDING'`,
  );

  const report: ReconcileReport = { confirmed: 0, stillPending: 0, failed: 0 };

  for (const ref of pending) {
    if (!ref.chain_tx_hash) {
      const ageH = (Date.now() - new Date(ref.created_at).getTime()) / 3600_000;
      if (ageH > maxAgeHours) {
        await db.query(
          `update transaction_references set chain_sync_status = 'FAILED',
             error_detail = 'NO_TX_HASH_TIMEOUT', updated_at = now() where id = $1`,
          [ref.id],
        );
        report.failed++;
      } else {
        report.stillPending++;
      }
      continue;
    }
    const receipt = await chain.getReceipt(ref.chain_tx_hash);
    if (receipt) {
      if (
        receipt.status === 1 &&
        (!chain.verifyReceipt ||
          chain.verifyReceipt(
            { eventType: ref.event_type, chainBatchKey: ref.chain_batch_key },
            receipt,
          ))
      ) {
        await db.query(
          `update transaction_references set chain_sync_status = 'CONFIRMED',
             chain_block = $2, receipt_confirmed_at = now(), updated_at = now() where id = $1`,
          [ref.id, receipt.blockNumber],
        );
        await db.query(
          `update batches b set chain_sync_status = 'CONFIRMED', updated_at = now()
           from transaction_references tr where tr.id = $1 and tr.batch_id = b.id and tr.event_type = 'BATCH_REGISTERED'`,
          [ref.id],
        );
        await db.query(
          `update handoff_intents h set chain_sync_status = 'CONFIRMED'
           from transaction_references tr where tr.id = $1 and tr.intent_id = h.id`,
          [ref.id],
        );
        report.confirmed++;
      } else {
        await db.query(
          `update transaction_references set chain_sync_status = 'FAILED',
             error_detail = 'REVERTED_ON_CHAIN', updated_at = now() where id = $1`,
          [ref.id],
        );
        await db.query(
          `update batches b set chain_sync_status = 'FAILED', updated_at = now()
           from transaction_references tr where tr.id = $1 and tr.batch_id = b.id and tr.event_type = 'BATCH_REGISTERED'`,
          [ref.id],
        );
        await db.query(
          `update handoff_intents h set chain_sync_status = 'FAILED'
           from transaction_references tr where tr.id = $1 and tr.intent_id = h.id`,
          [ref.id],
        );
        report.failed++;
      }
    } else {
      report.stillPending++;
    }
  }
  return report;
}
