/**
 * Bilangan berskala tetap — SCALE 6 (ppm), tanpa float (IMPLEMENTATION-PLAN §3.1).
 * Solidity tidak punya float; seluruh nilai kondisi dikonversi ke bigint PPM.
 */

export const SCALE = 1_000_000n;
export type PPM = bigint; // nilai X diwakili X * 10^6

/**
 * Konversi number → PPM. Menolak nilai NaN/Infinity dan presisi > 6 desimal
 * (mencegah pembulatan senyap yang tidak dapat direproduksi di kontrak).
 */
export function toPPM(whole: number): PPM {
  if (!Number.isFinite(whole)) {
    throw new Error(`toPPM: nilai tidak finite (${whole})`);
  }
  const scaled = whole * 1_000_000;
  if (!Number.isInteger(scaled)) {
    throw new Error(`toPPM: presisi > 6 desimal tidak didukung (${whole})`);
  }
  return BigInt(scaled);
}

/** PPM → number untuk tampilan UI (round-trip eksak untuk ≤ 6 desimal). */
export function ppmToNumber(ppm: PPM): number {
  return Number(ppm) / 1_000_000;
}

/** Format PPM ke string locale Indonesia ("3.5" → "3,5"). */
export function formatPPM(ppm: PPM): string {
  return ppmToNumber(ppm).toLocaleString("id-ID", {
    maximumFractionDigits: 6,
  });
}
