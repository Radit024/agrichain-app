# Laporan Uji Lengkap (Fase L5)

> Tanggal eksekusi otomatis: 14 September 2026. Lingkungan: Windows (PowerShell), Node 24.15.0, PGlite in-process (tanpa Docker), Playwright Chromium headless.

## Ringkasan

| Suite                           | Tool                                | Hasil             |
| ------------------------------- | ----------------------------------- | ----------------- |
| Kontrak (`AgrichainLedger.sol`) | Hardhat 3.16 (EDR in-process)       | **28/28 lulus**   |
| Domain + RLS + integration      | Vitest 5 (PGlite, fork tunggal)     | **150/150 lulus** |
| E2E publik + guard + header     | Playwright (Chromium, `next start`) | **10/10 lulus**   |
| Build produksi                  | `next build` (type check)           | **lulus**         |

## Cakupan otomatis

1. **Kontrak**: registrasi + role (REGISTRAR/DISTRIBUTOR/RETAILER/EVALUATOR), two-party handoff (inisiasi ≠ perpindahan stage; hanya wallet penerima yang konfirmasi; cancel/expiry menolak konfirmasi), `recordCondition` enum NONE-compliant (tanpa nilai parameter), `recordValidAccess` tanpa jalur TIDAK_SAH/ANOMALI, digest idempoten, pause menolak mutasi tetapi membaca tetap OK, marker no-leak kode otorisasi.
2. **Domain (unit)**: fixed-point PPM round-trip + format id-ID; condition-policy (batas inklusif AT_BOUNDARY, toleransi durasi, pemulihan, parameter wajib hilang, stale → DATA_UNAVAILABLE, cold/non-cold, urutan bacaan); batch-status (dua stage valid, lompatan, wallet/role salah, pending ganda, cancel, expiry); access-verification (7 baris matriks; publicReason tanpa bocor); public-id (regex Crockford, 10k unik, I/L/O/U ditolak).
3. **RLS (51 test)**: `anon`/`authenticated` select/insert/update/delete ditolak pada seluruh tabel internal; proyeksi publik hanya server-side.
4. **Integration**: token Privy valid/expired/invalid (mock boundary K11); IDOR/BOLA lintas org; invite create/revoke/accept/expired; registerBatch (snapshot profil, idempotency, chainSyncStatus PENDING); handoff init/confirm/cancel/expire; verifyAccess 10-langkah (rate-limit netral, anti-enumeration, Argon2id, SAH → chain ref); getPublicBatch whitelist kolom; reconciler receipt CONFIRMED/FAILED.
5. **E2E publik**: `/p/{valid}` menampilkan kartu + timeline + "Batasan informasi" + SIMULATOR; `/p/{invalid}` dan format salah → 404 netral identik; guard `/`, `/dashboard`, `/batch` → redirect `/masuk`; API publik hanya field whitelist; security headers (CSP frame-ancestors 'none', X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy camera=(self), HSTS).
6. **Header keamanan (Fase K)**: dipverifikasi via Playwright `request` — lulus.

## Skenario manual (Bruno — `bruno/agrichain/`)

Koleksi: `public-batch-valid` (200 + whitelist), `public-batch-unknown` (404 netral), `verify-access-anti-enumeration` (401 tanpa sesi; tidak membocorkan validitas kode), `health-and-headers` (header keamanan). Jalankan dengan Bruno + environment `local` (host `http://localhost:3000`).

## Eksekusi manual tersisa (protokol tersedia)

| Item                             | Protokol                                           | Target                               | Status            |
| -------------------------------- | -------------------------------------------------- | ------------------------------------ | ----------------- |
| Pemindaian QR multi cahaya/sudut | `docs/tests/qr-protocol.md` (2 lux × 3 sudut × 10) | ≥ 90% berhasil; fallback manual 100% | Siap dieksekusi   |
| Waktu tampil publik              | stopwatch/devtools (cache 30s aktif)               | < 5 detik                            | Siap dieksekusi   |
| TAM                              | `docs/tam/instrument.md` (PEOU+PU, Likert 1–5)     | ≥ 10 responden                       | Siap dieksekusi   |
| Deploy Amoy + grant role         | `contracts/deploy/amoy-deploy.ts`                  | address + ABI                        | Butuh env RPC/key |

## Temuan & perbaikan selama Fase H–M

- **PGlite di `next start`**: bundling Turbopack memutus `import.meta.url` → `ERR_INVALID_ARG_TYPE`. Perbaikan: `serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2"]` di `next.config.ts`.
- **Base UI Select** mengirim `string | null` pada `onValueChange` — semua handler UI diperbarui (`v ?? ""`).
- **DataTable** digeneralkan dengan `getRowKey` (row tanpa kolom `id`, mis. handoff list ber-kunci `intentId`).
- E2E awal menyalah-asumsikan heading role; disesuaikan ke locator realistis (teks + button name regex).

## Batasan laporan

- Seluruh data kondisi berasal dari SIMULATOR; status = evaluasi data tercatat, bukan bukti kondisi fisik produk.
- Hasil TAM dilaporkan sebagai indikasi awal, bukan generalisasi populasi.
- Ambang kategori bersifat indikatif sampai rujukan primer dikunci (`docs/category-case-study.md`).
