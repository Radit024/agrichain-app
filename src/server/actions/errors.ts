/**
 * Error & helper aksi server — file NON "use server" (karena "use server"
 * hanya boleh mengekspor async function).
 */

import { createHash } from "node:crypto";

export class ActionError extends Error {
  constructor(
    public code:
      | "INPUT_INVALID"
      | "ROLE_REQUIRED"
      | "BATCH_FORBIDDEN"
      | "DUPLICATE"
      | "NOT_FOUND"
      | "PAUSED"
      | "RATE_LIMITED"
      | "MFA_REQUIRED",
  ) {
    super(code);
    this.name = "ActionError";
  }
}

/** chainBatchKey = hash identitas on-chain (K17: org+batch anti-bentrok). */
export function computeChainBatchKey(orgId: string, batchId: string): string {
  return "0x" + createHash("sha256").update(`${orgId}|${batchId}`).digest("hex");
}
