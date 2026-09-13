import { randomBytes } from "node:crypto";

/**
 * Identitas publik QR (IMPLEMENTATION-PLAN §3.5, K9):
 * Base32 Crockford, 16 karakter, format XXXX-XXXX-XXXX-XXXX.
 * Alfabet tanpa karakter ambigu (I, L, O, U dihapus; 0 tetap — Crockford).
 */

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 32 char, tanpa I L O U

export const PUBLIC_ID_REGEX = /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

export function generatePublicId(): string {
  // 80 bit entropi (16 char × 5 bit) → cukup untuk anti-guessing
  const bytes = randomBytes(10); // 80 bit
  let bits = 0; // akumulator bit (number)
  let value = 0n; // buffer nilai (bigint)
  const chars: string[] = [];
  for (const b of bytes) {
    value = (value << 8n) | BigInt(b);
    bits += 8;
    while (bits >= 5) {
      chars.push(CROCKFORD_ALPHABET[Number((value >> BigInt(bits - 5)) & 31n)]);
      bits -= 5;
    }
  }
  // 80 bit = tepat 16 char base32, tanpa padding
  const id = [
    chars.slice(0, 4).join(""),
    chars.slice(4, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
  ].join("-");
  return id;
}

export function isValidPublicIdFormat(id: string): boolean {
  return PUBLIC_ID_REGEX.test(id);
}

/**
 * Normalisasi input pengguna: upper + trim + rapikan spasi.
 * Mengembalikan null bila ada karakter di luar alfabet Crockford.
 * Sesuai plan §3.5: karakter ambigu I/L/O/U pada input DITOLAK
 * (bukan dimapping) — mencegah salah-baca manual petugas/konsumen.
 */
export function normalizePublicId(input: string): string | null {
  const cleaned = input.trim().toUpperCase();
  // ambil hanya karakter alfanumerik; strip/spasi/format lain dibuang
  const bare = cleaned.replace(/[^0-9A-Z]/g, "");
  if (bare.length !== 16) return null;
  for (const ch of bare) {
    if (!CROCKFORD_ALPHABET.includes(ch)) return null;
  }
  return `${bare.slice(0, 4)}-${bare.slice(4, 8)}-${bare.slice(8, 12)}-${bare.slice(12)}`;
}
