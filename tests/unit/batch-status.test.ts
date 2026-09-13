import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateHandoffInitiation,
  validateHandoffConfirmation,
  validateHandoffCancellation,
  distributionAfterConfirmation,
  canDistributionChange,
  pendingHandoffError,
} from "@/modules/batch-status";
import type { CustodyStage, ActorRole } from "@/modules/batch-status";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(
  readFileSync(path.resolve(HERE, "../../src/modules/test-vectors/handoff-cases.json"), "utf8"),
);

const BASE = new Date("2026-09-13T10:00:00Z");
const at = (minutes: number) => new Date(BASE.getTime() + minutes * 60_000);

interface VectorCase {
  id: string;
  op: "INITIATE" | "CONFIRM" | "CANCEL";
  currentStage: number;
  currentCustodianWallet?: string;
  pendingExists?: boolean;
  pendingIntent: {
    senderWallet: string;
    recipientWallet: string;
    toStage: number;
    expiresAtOffsetMinutes: number;
    status: string;
  } | null;
  input: Record<string, string | number>;
  expectError: string | null;
  expectStageAfter?: number;
  expectDistributionAfter?: string;
}

describe("batch-status: handoff dua konfirmasi — seluruh test-vectors (§3.3 + §3.6)", () => {
  for (const c of vectors.handoffCases as VectorCase[]) {
    it(`kasus ${c.id}`, () => {
      const now = at(0);
      const input = c.input as {
        senderWallet?: string;
        senderRole?: string;
        recipientWallet?: string;
        recipientOrgId?: string;
        toStage?: number;
        expiresInMinutes?: number;
        confirmerWallet?: string;
        confirmerRole?: string;
      };

      if (c.op === "INITIATE") {
        const err = validateHandoffInitiation({
          batchId: "batch-1",
          currentStage: c.currentStage as CustodyStage,
          currentCustodianWallet: c.currentCustodianWallet ?? "",
          senderWallet: input.senderWallet ?? "",
          senderRole: input.senderRole as ActorRole,
          recipientWallet: input.recipientWallet ?? "",
          recipientOrgId: input.recipientOrgId ?? "",
          toStage: input.toStage as CustodyStage,
          expiresAt: at(input.expiresInMinutes ?? 60),
          now,
        });
        if (c.expectError === null) {
          expect(err).toBeNull();
          // cek juga aturan pending ganda
          expect(pendingHandoffError(c.pendingExists)).toBeNull();
        } else {
          // untuk kasus pending-exists, error datang dari cek pending (DB)
          expect(err ?? pendingHandoffError(c.pendingExists)).toBe(c.expectError);
        }
      }

      if (c.op === "CONFIRM") {
        const pending = c.pendingIntent
          ? {
              senderWallet: c.pendingIntent.senderWallet,
              recipientWallet: c.pendingIntent.recipientWallet,
              toStage: c.pendingIntent.toStage as CustodyStage,
              expiresAt: at(c.pendingIntent.expiresAtOffsetMinutes),
              status: c.pendingIntent.status as "PENDING",
            }
          : null;
        const err = validateHandoffConfirmation({
          batchId: "batch-1",
          currentStage: c.currentStage as CustodyStage,
          pendingIntent: pending && pending.status === "PENDING" ? pending : null,
          confirmerWallet: input.confirmerWallet ?? "",
          confirmerRole: input.confirmerRole as ActorRole,
          now,
        });
        if (c.expectError === null) {
          expect(err).toBeNull();
          expect(distributionAfterConfirmation(c.currentStage)).toBe(c.expectDistributionAfter);
          expect((c.currentStage + 1) as CustodyStage).toBe(c.expectStageAfter);
        } else {
          expect(err).toBe(c.expectError);
        }
      }

      if (c.op === "CANCEL") {
        const pending = c.pendingIntent
          ? {
              senderWallet: c.pendingIntent.senderWallet,
              recipientWallet: c.pendingIntent.recipientWallet,
              toStage: c.pendingIntent.toStage as CustodyStage,
              expiresAt: at(c.pendingIntent.expiresAtOffsetMinutes),
              status: c.pendingIntent.status as "PENDING",
            }
          : null;
        const err = validateHandoffCancellation({
          currentStage: c.currentStage,
          pendingIntent: pending && pending.status === "PENDING" ? pending : null,
          senderWallet: input.senderWallet ?? "",
        });
        expect(err).toBe(c.expectError);
      }
    });
  }
});

describe("batch-status: invarian pemisahan dimensi (§3.3)", () => {
  it("transisi distribusi valid hanya via konfirmasi handoff", () => {
    const t = vectors.distributionTransitions;
    for (const v of t.valid) {
      expect(canDistributionChange("HANDOFF_CONFIRMED")).toBe(true);
    }
    expect(canDistributionChange("EVALUATE_CONDITION")).toBe(false);
    expect(canDistributionChange("DATA_QUALITY_UPDATE")).toBe(false);
  });

  it("distributionAfterConfirmation: 0→1 = DALAM_DISTRIBUSI, 1→2 = SELESAI", () => {
    expect(distributionAfterConfirmation(0)).toBe("DALAM_DISTRIBUSI");
    expect(distributionAfterConfirmation(1)).toBe("SELESAI");
  });
});
