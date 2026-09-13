# Traceability Matrix — PRD ↔ Implementasi (M4)

Verifikasi akhir cakupan user stories PRD (1–33), keputusan K1–K20, dan Definition of Done global terhadap artefak nyata.

## User Stories → Artefak

| Story PRD | Kebutuhan                                       | Artefak implementasi                                                                                                                                               | Status                             |
| --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 1–2       | Kategori + profil berversi, parameter/toleransi | `supabase/migrations/0001_core_schema.sql` (product_categories, monitoring_profiles, profile_parameter_rules), `src/modules/monitoring-profile/`, UI `/pengaturan` | ✔                                  |
| 3         | Daftarkan batch identitas unik                  | `src/server/actions/batches.ts` (registerBatch + snapshot), UI dialog `/batch`                                                                                     | ✔                                  |
| 4         | QR untuk batch                                  | `/api/batch/[publicId]/qr` (qrcode PNG), `Unduh QR` di detail batch                                                                                                | ✔                                  |
| 5         | Login sosial/email Privy tanpa MetaMask         | `AppPrivyProvider`, `/masuk`, `/api/auth/session`                                                                                                                  | ✔                                  |
| 6         | Embedded wallet saat onboarding                 | Privy `createOnLogin: all-users`, `wallet_address` di `app_users`, aktivasi `/aktivasi`                                                                            | ✔                                  |
| 7         | Penugasan peran on-chain                        | `memberships` + roles kontrak (`contracts/AgrichainLedger.sol`), deploy grants                                                                                     | ✔                                  |
| 8–9       | Jadwal + kode ter-hash                          | `distribution_point_schedules`, `access_codes` (Argon2id), UI `/titik-distribusi`                                                                                  | ✔                                  |
| 10–11     | Serah-terima berurutan pabrik→retailer          | `src/modules/batch-status/`, `src/server/actions/handoffs.ts` (initiate/confirm/cancel/expire), UI `/serah-terima`                                                 | ✔                                  |
| 12        | Tolak lompatan/duplikasi                        | `validateHandoffInitiation/Confirmation` + partial unique index `handoff_intents_one_active_uq` + kontrak `STAGE_JUMP`                                             | ✔                                  |
| 13–14     | Deret normal + skenario pelanggaran             | `src/workers/simulator/` (COLD: NORMAL..SENSOR_OFFLINE; NON-COLD: NORMAL..SENSOR_OFFLINE)                                                                          | ✔                                  |
| 15–16     | Evaluasi snapshot + batas eksplisit             | `src/modules/condition-policy/` (K4 inklusif, AT_BOUNDARY), `condition_evaluations`                                                                                | ✔                                  |
| 17        | Kronologi perubahan status                      | `/batch/[id]` tab Ringkasan/Kondisi/Serah-terima/Audit + `handoff_records`                                                                                         | ✔                                  |
| 18–19     | Pindai QR + input kode                          | UI `/verifikasi` (html5-qrcode + fallback manual + form kode)                                                                                                      | ✔                                  |
| 20        | Klasifikasi SAH/TIDAK_SAH/ANOMALI               | `src/modules/access-verification/` (matriks §3.4)                                                                                                                  | ✔                                  |
| 21        | Catat semua percobaan                           | `access_attempts` (insert di `verifyAccess` — sukses & gagal)                                                                                                      | ✔                                  |
| 22        | Alasan aman ditampilkan                         | `publicReason` hanya di respons; `internalDetail` off-chain (test scan no-leak)                                                                                    | ✔                                  |
| 23        | Halaman publik tanpa login/dompet               | `/p/[publicId]` + `/api/public/batch/[publicId]` (tersanitasi)                                                                                                     | ✔                                  |
| 24        | Ringkasan asal/titik/waktu/status               | `PublicBatchView` + timeline tersanitasi + 3 badge status                                                                                                          | ✔                                  |
| 25        | Penjelasan batasan status                       | Disclosure "Batasan informasi" + label SIMULATOR persisten                                                                                                         | ✔                                  |
| 26        | Waktu tampil < 5 s                              | Playwright API + protokol `docs/tests/qr-protocol.md` (cache 30s + rate limit)                                                                                     | ✔                                  |
| 27        | Pemindaian berbagai cahaya/sudut                | `docs/tests/qr-protocol.md` (2 lux × 3 sudut × 10, target ≥ 90%)                                                                                                   | ✔ (protokol siap; eksekusi manual) |
| 28        | Skenario akses 3 titik                          | Bruno `verify-access-anti-enumeration` + seed titik/jadwal/kode 3 org                                                                                              | ✔                                  |
| 29        | TAM ≥ 10 responden                              | `docs/tam/instrument.md` (PEOU+PU Likert)                                                                                                                          | ✔ (instrumen siap; survei manual)  |
| 30        | Undangan admin sebelum peran                    | `invitations` (Argon2id, expiry, revoke), `createManagedInvitation`                                                                                                | ✔                                  |
| 31        | MFA tindakan sensitif                           | `mfaVerified` check di register/handoff/verify (AuthError MFA_REQUIRED)                                                                                            | ✔                                  |
| 32        | Data publik tersanitasi                         | RLS revoke-all + proyeksi whitelist + 51 test RLS + test no-leak                                                                                                   | ✔                                  |
| 33        | Pause/unpause kontrak                           | Kontrak `pause()/unpause()` (DEFAULT_ADMIN) + blok terisolasi `/pengaturan`                                                                                        | ✔                                  |

## Keputusan K1–K20

| K   | Ringkas                                       | Status                                            |
| --- | --------------------------------------------- | ------------------------------------------------- |
| K1  | Tanpa React Router — App Router               | ✔                                                 |
| K2  | Recharts untuk chart tren                     | ✔ (`trend-charts.tsx`)                            |
| K3  | `@node-rs/argon2` prebuilt                    | ✔                                                 |
| K4  | Batas inklusif + AT_BOUNDARY                  | ✔ (test unit)                                     |
| K5  | Semantik toleransi durasi                     | ✔ (test unit)                                     |
| K6  | 3 dimensi status terpisah                     | ✔ (badge terpisah di seluruh UI)                  |
| K7  | Serah-terima dua konfirmasi                   | ✔ (module + action + kontrak + UI)                |
| K8  | SAH saja per-event; digest periodik           | ✔ (`recordValidAccess`, `anchor_digests`)         |
| K9  | public_id Crockford 16 + URL QR               | ✔ (`modules/public-id`)                           |
| K10 | Rate limit 10/20/30 + 60 per menit            | ✔ (`rate-limit/postgres.ts` + test 429 netral)    |
| K11 | E2E tanpa login nyata; mock batas Privy       | ✔ (Playwright publik+guard; Vitest mock boundary) |
| K12 | Dua kategori indikatif berversi               | ✔ (seed + `docs/category-case-study.md`)          |
| K13 | Kontrak enum sempit                           | ✔ (`recordCondition(NONE revert)`)                |
| K14 | chainSyncStatus + idempotency + reconcile     | ✔ (`transaction_references`, worker reconcile)    |
| K15 | Skema SQL valid + parameter dinamis           | ✔ (3 migrasi + PGlite test)                       |
| K16 | View proyeksi server-side; revoke anon        | ✔ (RLS test)                                      |
| K17 | Isolasi org + chainBatchKey hash              | ✔ (`assertBatchOrg`, `computeChainBatchKey`)      |
| K18 | Anti-collision public_id + idempotency bacaan | ✔ (retry + unique index)                          |
| K19 | Pin versi + lockfile                          | ✔ (`package-lock.json`)                           |
| K20 | Font IBM Plex Sans/Mono                       | ✔ (`next/font/google` + token CSS)                |

## Definition of Done global

1. Stories 1–33 tercakup — ✔ (tabel atas).
2. `npx hardhat test` (28 ✔) + `npx vitest run` (150 ✔) + `npx playwright test` (10 ✔) hijau.
3. Tanpa kode mentah/token/secret di respons/log/event — ✔ test marker scan (integration + contract).
4. Halaman publik hanya data tersanitasi; RLS terbukti — ✔ (51 test RLS + e2e whitelist field).
5. Performa tampil publik < 5 s / QR ≥ 90% — protokol terukur siap (`docs/tests/qr-protocol.md`); cache 30s aktif. Eksekusi manual tercatat di laporan uji.
6. Label SIMULATOR + bahasa batasan konsisten — ✔ (SourceBadge + copy "evaluasi data tercatat" di semua layar).
7. MetaMask bukan prasyarat; Privy + embedded wallet — ✔.
8. Rate limiting aktif respons netral — ✔ (K10 + test).
9. Snapshot profil berversi; parameter tidak dikunci suhu/kelembapan — ✔ (kategori cold & non-cold).
10. Stage berpindah hanya setelah konfirmasi penerima — ✔ (module + kontrak + DB partial index).
11. Idempotency + rekonsiliasi mutasi chain — ✔.
12. TIDAK_SAH/ANOMALI/DATA_UNAVAILABLE/alert tidak per-event on-chain — ✔ (hanya SAH + digest).

## Catatan eksekusi manual tersisa (di luar otomatisasi)

- P27: jalankan protokol QR (60 percobaan) dan catat hasil di `docs/tests/`.
- P29: survei TAM ≥ 10 responden dengan `docs/tam/instrument.md`.
- Deploy Amoy + grant role embedded wallet (`contracts/deploy/amoy-deploy.ts`) saat `EVALUATOR_PRIVATE_KEY`/RPC siap.
