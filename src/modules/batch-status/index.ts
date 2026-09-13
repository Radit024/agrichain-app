import type { CustodyStage, DistributionStatus } from "../shared-types";

export type {
  ConditionStatus,
  DataQualityStatus,
  DistributionStatus,
  CustodyStage,
} from "../shared-types";

export type ActorRole = "PRODUCER_ADMIN" | "FACTORY_STAFF" | "DISTRIBUTOR_ADMIN" | "RETAILER_ADMIN";

export type HandoffError =
  | "STAGE_JUMP"
  | "PENDING_HANDOFF_EXISTS"
  | "NO_PENDING_HANDOFF"
  | "WRONG_SENDER"
  | "WRONG_RECIPIENT"
  | "WRONG_ROLE"
  | "EXPIRED";

/** Role yang sah untuk tiap tahap pengiriman (kustodian asal). */
const SENDER_ROLES: Record<CustodyStage, ActorRole[]> = {
  0: ["PRODUCER_ADMIN", "FACTORY_STAFF"],
  1: ["DISTRIBUTOR_ADMIN"],
  2: [], // stage akhir — tidak ada pengiriman
};

/** Role yang sah untuk menerima di stage tujuan. */
const RECIPIENT_ROLES: Record<CustodyStage, ActorRole[]> = {
  0: [],
  1: ["DISTRIBUTOR_ADMIN"],
  2: ["RETAILER_ADMIN"],
};

export interface HandoffInitiationInput {
  batchId: string;
  currentStage: CustodyStage;
  currentCustodianWallet: string;
  senderWallet: string;
  senderRole: ActorRole;
  recipientWallet: string;
  recipientOrgId: string;
  toStage: CustodyStage;
  expiresAt: Date;
  now?: Date;
}

export interface PendingIntentSnapshot {
  senderWallet: string;
  recipientWallet: string;
  toStage: CustodyStage;
  expiresAt: Date;
  status: "PENDING";
}

export interface HandoffConfirmationInput {
  batchId: string;
  currentStage: CustodyStage;
  pendingIntent: PendingIntentSnapshot | null;
  confirmerWallet: string;
  confirmerRole: ActorRole;
  now?: Date;
}

export interface HandoffCancelInput {
  currentStage: CustodyStage;
  pendingIntent: PendingIntentSnapshot | null;
  senderWallet: string;
}

/**
 * Validasi inisiasi handoff (IMPLEMENTATION-PLAN §3.3):
 * - hanya kustodian saat ini (wallet) dengan role pengirim sah
 * - stage hanya maju +1 (0→1 atau 1→2)
 * - tidak ada pending lain; expiry di masa depan
 */
export function validateHandoffInitiation(input: HandoffInitiationInput): HandoffError | null {
  const now = input.now ?? new Date();
  if (input.currentStage === 2) return "STAGE_JUMP";
  if (input.toStage !== input.currentStage + 1) return "STAGE_JUMP";
  if (input.senderWallet !== input.currentCustodianWallet) return "WRONG_SENDER";
  if (!SENDER_ROLES[input.currentStage].includes(input.senderRole)) return "WRONG_ROLE";
  if (input.expiresAt <= now) return "EXPIRED";
  return null;
}

/** PENDING ganda dicegah oleh partial index DB; modul tetap mengekspos kodenya. */
export function pendingHandoffError(existing: boolean): HandoffError | null {
  return existing ? "PENDING_HANDOFF_EXISTS" : null;
}

/**
 * Validasi konfirmasi handoff: hanya wallet penerima berrole sah;
 * intent harus PENDING dan belum kedaluwarsa. Stage tidak berubah di sini —
 * pemanggil (server action) yang menerapkan transisi setelah validasi lolos.
 */
export function validateHandoffConfirmation(input: HandoffConfirmationInput): HandoffError | null {
  const now = input.now ?? new Date();
  if (!input.pendingIntent) return "NO_PENDING_HANDOFF";
  if (input.pendingIntent.status !== "PENDING") return "NO_PENDING_HANDOFF";
  if (input.pendingIntent.toStage !== input.currentStage + 1) return "STAGE_JUMP";
  if (input.confirmerWallet !== input.pendingIntent.recipientWallet) return "WRONG_RECIPIENT";
  if (!RECIPIENT_ROLES[input.pendingIntent.toStage].includes(input.confirmerRole)) {
    return "WRONG_ROLE";
  }
  if (input.pendingIntent.expiresAt <= now) return "EXPIRED";
  return null;
}

/** Validasi pembatalan: hanya pengirim inisiasi, intent masih PENDING. */
export function validateHandoffCancellation(input: HandoffCancelInput): HandoffError | null {
  if (!input.pendingIntent || input.pendingIntent.status !== "PENDING") {
    return "NO_PENDING_HANDOFF";
  }
  if (input.senderWallet !== input.pendingIntent.senderWallet) return "WRONG_SENDER";
  return null;
}

/**
 * Transisi status distribusi setelah konfirmasi (§3.3):
 * 0→1 → DALAM_DISTRIBUSI; 1→2 → SELESAI.
 */
export function distributionAfterConfirmation(fromStage: CustodyStage): DistributionStatus {
  if (fromStage === 0) return "DALAM_DISTRIBUSI";
  return "SELESAI";
}

/**
 * Invarian §3.3: evaluator kondisi & worker data TIDAK BOLEH mengubah
 * status distribusi. Pemetaan ini menegaskan: satu-satunya jalur perubahan
 * distribusi adalah konfirmasi handoff.
 */
export function canDistributionChange(
  event: "HANDOFF_CONFIRMED" | "EVALUATE_CONDITION" | "DATA_QUALITY_UPDATE",
): boolean {
  return event === "HANDOFF_CONFIRMED";
}
