/**
 * Klasifikasi akses digital (IMPLEMENTATION-PLAN §3.4) — murni, tanpa I/O.
 * Matriks dari access-matrix.json; publicReason aman untuk ditampilkan,
 * internalDetail hanya untuk log server (tidak pernah ke UI/chain).
 * Fungsi TIDAK PERNAH menerima kode otorisasi mentah.
 */

export type AccessResult = "SAH" | "TIDAK_SAH" | "ANOMALI";

export interface AccessCheckInput {
  batchExists: boolean;
  codeHashMatches: boolean; // hasil Argon2id verify di server
  withinSchedule: boolean;
  locationMatches: boolean;
  batchNotPaused: boolean;
}

export interface AccessOutcome {
  result: AccessResult;
  publicReason: string;
  internalDetail: string; // hanya log server — JANGAN ke UI/chain
}

export function classifyAccess(input: AccessCheckInput): AccessOutcome {
  // 1. Batch tidak dikenal → TIDAK_SAH (netral, tanpa bedakan "tak ada vs salah kode")
  if (!input.batchExists) {
    return {
      result: "TIDAK_SAH",
      publicReason: "Batch tidak dikenali",
      internalDetail: "BATCH_NOT_FOUND",
    };
  }

  // 2. Kode tidak cocok → TIDAK_SAH generik (anti-enumeration)
  if (!input.codeHashMatches) {
    return {
      result: "TIDAK_SAH",
      publicReason: "Verifikasi tidak berhasil. Periksa kode dan batch yang dipindai.",
      internalDetail: "CODE_HASH_MISMATCH",
    };
  }

  // 3. Batch paused → TIDAK_SAH
  if (!input.batchNotPaused) {
    return {
      result: "TIDAK_SAH",
      publicReason: "Pencatatan ditunda",
      internalDetail: "BATCH_PAUSED",
    };
  }

  // 4. Kode valid tapi jadwal/lokasi tidak sesuai → ANOMALI
  if (!input.withinSchedule && !input.locationMatches) {
    return {
      result: "ANOMALI",
      publicReason: "Periksa jadwal dan lokasi",
      internalDetail: "SCHEDULE_AND_LOCATION_MISMATCH",
    };
  }
  if (!input.withinSchedule) {
    return {
      result: "ANOMALI",
      publicReason: "Periksa jadwal",
      internalDetail: "SCHEDULE_MISMATCH",
    };
  }
  if (!input.locationMatches) {
    return {
      result: "ANOMALI",
      publicReason: "Periksa lokasi",
      internalDetail: "LOCATION_MISMATCH",
    };
  }

  // 5. Semua cocok → SAH
  return {
    result: "SAH",
    publicReason: "Akses terverifikasi",
    internalDetail: "ALL_MATCH",
  };
}
