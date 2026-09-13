# Agrichain — Purwarupa Ketertelusuran Distribusi Pangan

Implementasi dari `../IMPLEMENTATION-PLAN.md` (Fase A–F). Server-based modular monolith: Next.js App Router + Supabase (off-chain) + Solidity/Hardhat (audit on-chain, Polygon Amoy) + Privy (auth internal).

## Menjalankan lokal

```bash
npm ci                # instalasi sesuai lockfile
npm run dev           # http://localhost:3000
```

## Test

```bash
npx vitest run        # unit + integration (PGlite in-process — tanpa Docker)
npx hardhat test      # smart contract (jaringan hardhat in-process)
```

> Catatan: mesin pengembangan ini tidak punya Docker. Migrasi Supabase diuji dengan **PGlite** (Postgres WASM) via `tests/db-` harness. Bila Docker tersedia, `docker compose up -d` menjalankan Postgres Supabase asli di `localhost:54322`; skema migrasi identik dan source-controlled di `supabase/migrations/`.

## Struktur

- `src/modules/` — domain murni (tanpa I/O): fixed-point, monitoring-profile, condition-policy, batch-status, access-verification, public-id, shared-types, test-vectors
- `src/server/` — data access layer (server-only): supabase client, privy verify, session, chain, rate-limit, audit
- `src/app/` — App Router: `(public)` `/p/[publicId]`, `(auth)`, `(internal)` dashboard
- `contracts/` — `AgrichainLedger.sol` + Hardhat test + deploy script Amoy
- `supabase/migrations/` — skema SQL terkontrol versi
- `tests/` — unit (Vitest), integration (Vitest), e2e (Playwright — Fase berikutnya)

## Lingkungan

Salin `.env.example` → `.env` (lokal). Tidak ada secret yang di-commit.

## Perintah penting

```bash
npm run build         # gerbang Fase A
npx vitest run        # gerbang Fase C
npx hardhat test      # gerbang Fase D
```
