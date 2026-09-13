# Agrichain — Purwarupa Ketertelusuran Distribusi Pangan

Implementasi penuh `../IMPLEMENTATION-PLAN.md` (Fase A–M). Server-based modular monolith: Next.js App Router + Supabase/PGlite (off-chain) + Solidity/Hardhat (audit on-chain, Polygon Amoy) + Privy (auth internal + embedded wallet).

> Status yang ditampilkan selalu berarti **evaluasi atas data kondisi yang tercatat** (sumber: SIMULATOR) — bukan bukti keamanan pangan fisik.

## Menjalankan lokal (tanpa Docker)

```bash
npm ci                # instalasi sesuai lockfile
npm run seed          # PGlite: .pglite/agrichain.db (3 org, 3 batch, titik+jadwal+kode contoh)
npm run dev           # http://localhost:3000
```

Login internal butuh env Privy (lihat di bawah). Tanpa env Privy, halaman publik `/p/{publicId}` dan API tetap berfungsi penuh.

## Test

```bash
npx vitest run        # unit + integration (PGlite in-process — 150 test, tanpa Docker)
npx hardhat test      # smart contract (28 test, jaringan EDR in-process)
npx playwright test   # E2E publik + guard + header keamanan (10 test; spawn `npm run start`)
npm run reconcile     # worker receipt chain (butuh RECONCILE_API_KEY + RPC + address kontrak)
```

> Catatan: mesin pengembangan ini tidak punya Docker. Migrasi Supabase diuji dengan **PGlite** (Postgres WASM) via `tests/helpers/pglite.ts`. Bila Docker tersedia, `docker compose up -d` menjalankan Postgres Supabase asli; skema migrasi identik dan source-controlled di `supabase/migrations/`.

## Environment variables

Salin `.env.example` → `.env` (lokal). Tidak ada secret yang di-commit.

| Variabel                                      | Wajib         | Keterangan                                                                |
| --------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| `APP_URL`                                     | ya            | Basis URL publik (QR memuat `{APP_URL}/p/{publicId}`)                     |
| `APP_SESSION_SECRET`                          | ya (internal) | HMAC sesi app — acak ≥ 32 karakter                                        |
| `PRIVY_APP_ID`                                | ya (login)    | Dari dashboard.privy.io; **sama dengan** `NEXT_PUBLIC_PRIVY_APP_ID`       |
| `NEXT_PUBLIC_PRIVY_APP_ID`                    | ya (login)    | Versi browser dari app ID yang sama                                       |
| `PRIVY_APP_SECRET`                            | ya (login)    | Secret server Privy                                                       |
| `PRIVY_VERIFICATION_KEY`                      | ya (login)    | Public key verifikasi token (format PEM) — server menolak token tanpa ini |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`  | produksi      | Kosong di dev → adapter otomatis pakai PGlite                             |
| `PGLITE_PATH`                                 | dev           | Default `./.pglite/agrichain.db`                                          |
| `NEXT_PUBLIC_CONTRACT_ADDRESS`                | produksi      | Address `AgrichainLedger` hasil deploy Amoy                               |
| `POLYGON_AMOY_RPC`                            | deploy        | `https://rpc-amoy.polygon.technology`                                     |
| `EVALUATOR_PRIVATE_KEY`                       | server        | Wallet EVALUATOR_ROLE (backend) — jangan pernah commit                    |
| `SIMULATOR_API_KEY` / `SIMULATOR_CRON`        | worker        | Kunci ingest + jadwal cron (default `*/5 * * * *`)                        |
| `RATE_VERIFY_PER_MIN` / `RATE_PUBLIC_PER_MIN` | opsional      | Default 10 / 60                                                           |

### Pertanyaan umum: `PRIVY_APP_ID` vs `NEXT_PUBLIC_PRIVY_APP_ID`

Nilainya **sama persis** (satu app ID dari dashboard Privy). Bedanya hanya prefiks: `NEXT_PUBLIC_` di-inject ke browser (dipakai `PrivyProvider`), sedangkan yang tanpa prefiks hanya di server (verifikasi token). Jika tombol login menampilkan "Konfigurasi login belum tersedia", berarti `NEXT_PUBLIC_PRIVY_APP_ID` kosong/rusak di `.env` — cek tanda kutip liar atau baris corrupt.

### Runtime hosted

Isi `DATABASE_URL` dengan connection string PostgreSQL server-side dari Supabase, lalu kredensial Privy dan Polygon Amoy di `.env`. `SUPABASE_SERVICE_ROLE_KEY` bukan pengganti `DATABASE_URL` untuk query SQL aplikasi. Setelah env tersedia: `npx hardhat run contracts/deploy/amoy-deploy.ts --network amoy`, simpan address sebagai `NEXT_PUBLIC_CONTRACT_ADDRESS`, lalu jadwalkan `npm run reconcile` di platform server.

## Struktur

- `src/app/` — App Router: `(public)` `/p/[publicId]`, `(auth)` `/masuk` + `/aktivasi`, `(internal)` dashboard/batch/serah-terima/verifikasi/titik-distribusi/laporan/pengaturan + API routes
- `src/components/` — shell (sidebar 280px/topbar 100px), status badges, TraceId, MetricCard, DataTable, HandoffTimeline, ComplianceCard, StatePanel, dialog
- `src/modules/` — domain murni (tanpa I/O): fixed-point, monitoring-profile, condition-policy, batch-status, access-verification, public-id, shared-types, test-vectors
- `src/server/` — data access layer (server-only): db adapter, privy verify, session, queries, actions (ui-actions wrappers), rate-limit, audit, chain
- `src/workers/` — simulator (node-cron) + reconcile
- `contracts/` — `AgrichainLedger.sol` + Hardhat test + deploy Amoy
- `supabase/migrations/` + `supabase/seed.ts` — skema SQL terkontrol versi + seed deterministik
- `tests/` — unit + integration (Vitest), e2e (Playwright)
- `bruno/agrichain/` — koleksi skenario API manual
- `docs/diagrams/` — 10 diagram sistem (`.mmd` sumber + `rendered/` SVG)
- `docs/tests/qr-protocol.md` — protokol pengukuran pemindaian QR (target ≥ 90%)
- `docs/tam/instrument.md` — instrumen TAM (PEOU+PU, Likert, ≥ 10 responden)

## Demo data (seed)

3 organisasi (Pabrik/Distributor/Retailer), kategori cold + non-cold chain dengan profil berversi, 3 batch dengan `public_id` tetap (contoh: `AG23-7QXB-KF4M-9R2T`), titik distribusi + jadwal + penugasan petugas, dan kode otorisasi contoh — nilai mentah dicetak lokal di `.pglite/seed-codes.txt` (hash Argon2id yang tersimpan di DB).

## Perintah penting

```bash
npm run build         # gerbang tipe + produksi
npm run seed          # reset deterministik DB lokal
npx vitest run        # unit + integration
npx hardhat test      # contract
npx playwright test   # e2e (publik + guard)
npm run simulator     # worker kondisi SIMULATOR (cron)
npm run reconcile     # worker receipt on-chain
```
