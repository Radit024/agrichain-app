import { describe, it, expect } from "vitest";
import {
  generatePublicId,
  isValidPublicIdFormat,
  normalizePublicId,
  PUBLIC_ID_REGEX,
} from "@/modules/public-id";

describe("public-id (§3.5, K9)", () => {
  it("10.000 generasi → unik + match regex + tanpa karakter ambigu", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generatePublicId();
      expect(isValidPublicIdFormat(id)).toBe(true);
      expect(id).not.toMatch(/[ILOU]/);
      seen.add(id);
    }
    expect(seen.size).toBe(10_000);
  });

  it("format: 4 grup dipisah strip, 16 karakter base32", () => {
    const id = generatePublicId();
    expect(id.length).toBe(19); // 16 char + 3 strip
    expect(id.split("-")).toHaveLength(4);
    expect(PUBLIC_ID_REGEX.test(id)).toBe(true);
  });

  it('normalizePublicId("abcd-efgh-ijkl-mnop") → null (I/L/O/U ilegal)', () => {
    // "ijkl" mengandung I,L → ditolak (anti salah-baca manual, plan §3.5)
    expect(normalizePublicId("abcd-efgh-ijkl-mnop")).toBeNull();
  });

  it("input huruf ambigu I/L/O ditolak, bukan dimapping", () => {
    expect(normalizePublicId("i1o0-efgh-jkmn-prst")).toBeNull();
    expect(normalizePublicId("ABCD-EFGH-IJKL-MNOP")).toBeNull();
  });

  it("terima input lowercase + tanpa strip", () => {
    expect(normalizePublicId("ag23-7qxb-kf4m-9r2t")).toBe("AG23-7QXB-KF4M-9R2T");
    expect(normalizePublicId("ag237qxbkf4m9r2t")).toBe("AG23-7QXB-KF4M-9R2T");
  });

  it("tolak karakter di luar alfabet (U, simbol)", () => {
    expect(normalizePublicId("AG23-7QXB-KF4M-9R2U")).toBeNull(); // U ilegal
    expect(normalizePublicId("AG23-7QXB-KF4M-9R2!")).toBeNull();
    expect(normalizePublicId("")).toBeNull();
  });

  it("spasi di tepi/di tengah dirapikan", () => {
    expect(normalizePublicId("  AG23-7QXB KF4M-9R2T ")).toBe("AG23-7QXB-KF4M-9R2T");
  });
});
