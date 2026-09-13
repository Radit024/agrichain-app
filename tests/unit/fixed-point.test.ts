import { describe, it, expect } from "vitest";
import { toPPM, ppmToNumber, formatPPM, SCALE } from "@/modules/fixed-point";

describe("fixed-point (§3.1)", () => {
  it("toPPM(2.5) === 2_500_000n", () => {
    expect(toPPM(2.5)).toBe(2_500_000n);
  });

  it("SCALE = 10^6", () => {
    expect(SCALE).toBe(1_000_000n);
  });

  it("round-trip ppmToNumber(toPPM(x)) === x untuk ≤ 6 desimal", () => {
    for (const x of [0, 2, 2.5, -4.25, 40.123456, 999999.999999]) {
      expect(ppmToNumber(toPPM(x))).toBe(x);
    }
  });

  it("toPPM menolak > 6 desimal (anti pembulatan senyap)", () => {
    expect(() => toPPM(0.0000001)).toThrow(/presisi/);
  });

  it("toPPM menolak NaN/Infinity", () => {
    expect(() => toPPM(Number.NaN)).toThrow(/finite/);
    expect(() => toPPM(Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it("formatPPM pakai koma desimal id-ID", () => {
    expect(formatPPM(toPPM(3.5))).toBe("3,5");
    expect(formatPPM(toPPM(2))).toBe("2");
  });

  it("negatif didukung (pelanggaran batas bawah)", () => {
    expect(toPPM(-10.5)).toBe(-10_500_000n);
    expect(ppmToNumber(-10_500_000n)).toBe(-10.5);
  });
});
