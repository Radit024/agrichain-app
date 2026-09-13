import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAccess } from "@/modules/access-verification";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(
  readFileSync(path.resolve(HERE, "../../src/modules/test-vectors/access-matrix.json"), "utf8"),
);

const MARKER = "TEST-CODE-DO-NOT-LEAK";

interface VectorCase {
  id: string;
  input: {
    batchExists: boolean;
    codeHashMatches: boolean;
    withinSchedule: boolean;
    locationMatches: boolean;
    batchNotPaused: boolean;
  };
  expect: { result: string; reason: string };
}

describe("access-verification: matriks lengkap (§3.4 + §3.6)", () => {
  for (const c of vectors.cases as VectorCase[]) {
    it(`kasus ${c.id} → ${c.expect.result}`, () => {
      const outcome = classifyAccess({
        batchExists: c.input.batchExists,
        codeHashMatches: c.input.codeHashMatches,
        withinSchedule: c.input.withinSchedule,
        locationMatches: c.input.locationMatches,
        batchNotPaused: c.input.batchNotPaused,
      });
      expect(outcome.result).toBe(c.expect.result);
      expect(outcome.publicReason).toBe(c.expect.reason);
    });
  }
});

describe("access-verification: invariant keamanan (§3.4)", () => {
  it("publicReason tidak pernah menyatakan validitas kode", () => {
    const outcomes = [
      classifyAccess({
        batchExists: false,
        codeHashMatches: false,
        withinSchedule: false,
        locationMatches: false,
        batchNotPaused: false,
      }),
      classifyAccess({
        batchExists: true,
        codeHashMatches: false,
        withinSchedule: true,
        locationMatches: true,
        batchNotPaused: true,
      }),
    ];
    for (const o of outcomes) {
      expect(o.publicReason).not.toMatch(/kode (salah|benar|tepat)/i);
    }
  });

  it("internalDetail tidak pernah menerima/menyimpan kode mentah", () => {
    // fungsi murni boolean — tidak ada parameter string kode; pastikan signature aman
    const input = {
      batchExists: true,
      codeHashMatches: true,
      withinSchedule: true,
      locationMatches: true,
      batchNotPaused: true,
    };
    const o = classifyAccess(input);
    // internalDetail hanya kode klasifikasi internal
    expect([
      "ALL_MATCH",
      "BATCH_NOT_FOUND",
      "CODE_HASH_MISMATCH",
      "BATCH_PAUSED",
      "SCHEDULE_MISMATCH",
      "LOCATION_MISMATCH",
      "SCHEDULE_AND_LOCATION_MISMATCH",
    ]).toContain(o.internalDetail);
    expect(o.internalDetail).not.toContain(MARKER);
  });

  it("deterministik: input sama → hasil sama", () => {
    const input = {
      batchExists: true,
      codeHashMatches: true,
      withinSchedule: false,
      locationMatches: true,
      batchNotPaused: true,
    };
    expect(classifyAccess(input)).toEqual(classifyAccess(input));
  });
});
