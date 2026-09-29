import "server-only";
import type { DbAdapter } from "../actions/invitations";

/**
 * Proyeksi data publik untuk halaman QR (IMPLEMENTATION-PLAN §4.2/F6, K16):
 * hanya kolom tersanitasi; TANPA lokasi presis, identitas petugas, catatan
 * internal, kode, atau metadata organisasi. Sumber: server_public_batch_projection.
 */

export interface PublicBatchView {
  publicId: string;
  distributionStatus: "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI";
  conditionStatus: "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK";
  dataQualityStatus: "AVAILABLE" | "DATA_UNAVAILABLE";
  custodyStage: number;
  categoryName: string;
  paused: boolean;
  createdAt: string;
  /** Timeline tersanitasi: hanya titik publik + waktu (tanpa alamat/kontak). */
  timeline: Array<{
    fromStage: number;
    toStage: number;
    confirmedAt: string;
  }>;
  chainTxHash?: string | null;
  source: "SIMULATOR"; // label wajib (PRD)
}

export async function getPublicBatchByPublicId(
  db: DbAdapter,
  publicId: string,
): Promise<PublicBatchView | null> {
  const rows = await db.query<{
    public_id: string;
    distribution_status: string;
    condition_status: string;
    data_quality_status: string;
    custody_stage: number;
    category_name: string;
    paused: boolean;
    created_at: string;
  }>(
    `select public_id, distribution_status, condition_status, data_quality_status,
            custody_stage, category_name, paused, created_at
     from server_public_batch_projection where public_id = $1`,
    [publicId],
  );
  const b = rows[0] ?? null;
  if (!b) return null;

  const timeline = await db.query<{ from_stage: number; to_stage: number; confirmed_at: string }>(
    `select from_stage, to_stage, confirmed_at from handoff_records
     where batch_id = (select id from batches where public_id = $1)
     order by confirmed_at asc`,
    [publicId],
  );

  const txRow = await db.query<{ chain_tx_hash: string | null }>(
    `select chain_tx_hash from transaction_references
     where batch_id = (select id from batches where public_id = $1)
       and chain_tx_hash is not null
     order by created_at desc limit 1`,
    [publicId],
  );

  return {
    publicId: b.public_id,
    distributionStatus: b.distribution_status as PublicBatchView["distributionStatus"],
    conditionStatus: b.condition_status as PublicBatchView["conditionStatus"],
    dataQualityStatus: b.data_quality_status as PublicBatchView["dataQualityStatus"],
    custodyStage: b.custody_stage,
    categoryName: b.category_name,
    paused: b.paused,
    createdAt: b.created_at,
    timeline: timeline.map((t) => ({
      fromStage: t.from_stage,
      toStage: t.to_stage,
      confirmedAt: t.confirmed_at,
    })),
    chainTxHash: txRow[0]?.chain_tx_hash ?? null,
    source: "SIMULATOR",
  };
}
