# Diagram Sistem Agrichain (Sumber Mermaid)

> Dirender ke PNG/SVG via mermaid-cli: `npx -y @mermaid-js/mermaid-cli -i docs/diagrams/XX-*.mmd -o docs/diagrams/rendered/`
> Status pada diagram merepresentasikan evaluasi atas data kondisi tercatat — bukan bukti keamanan pangan fisik.

## 01 — Use Case Diagram

```mermaid
graph TB
    subgraph Aktor
        PA[Administrator Produsen]
        PF[Petugas Pabrik]
        DA[Administrator Distributor]
        RA[Administrator Retailer]
        AG[Petugas Lapangan]
        KO[Konsumen]
        CA[Administrator Kontrak]
        SIM[Worker Simulator]
    end

    subgraph Sistem["Sistem Agrichain"]
        UC1[Kelola kategori & profil monitoring berversi]
        UC2[Daftarkan batch + hasil QR]
        UC3[Undang & tetapkan peran internal]
        UC4[Catat serah-terima dua konfirmasi]
        UC5[Jadwal & kode otorisasi titik]
        UC6[Pindai QR + verifikasi akses]
        UC7[Lihat halaman publik batch]
        UC8[Kirim pembacaan kondisi SIMULATOR]
        UC9[Pause/unpause kontrak]
    end

    PA --> UC1
    PA --> UC2
    PA --> UC3
    PA --> UC5
    PF --> UC2
    DA --> UC4
    RA --> UC4
    AG --> UC6
    KO --> UC7
    CA --> UC9
    SIM --> UC8
```

## 02 — System Context Diagram

```mermaid
flowchart TB
    User([Pengguna internal / Konsumen])
    App["Aplichain App<br/>(Next.js server-based modular monolith)"]

    User -->|browser| App
    subgraph Eksternal
        Privy["Privy Auth<br/>(social/email + embedded wallet)"]
        SB["Supabase Postgres<br/>(data off-chain + RLS)"]
        Amoy["Smart contract AgrichainLedger<br/>(Polygon Amoy testnet)"]
        Sim["Worker simulator (node-cron)<br/>sumber SIMULATOR"]
    end

    App <-->|verify access token| Privy
    App <-->|service-role SQL| SB
    App <-->|ethers: mutasi & event| Amoy
    Sim -->|POST /api/conditions/ingest<br/>x-simulator-key| App
    App -->|riwayat tersanitasi| QR["QR public_id<br/>{APP_URL}/p/{id}"]
    QR -->|pindai| User
```

## 03 — Diagram Arsitektur Modular Monolith

```mermaid
flowchart TB
    subgraph Next["Satu aplikasi Next.js (server-based)"]
        UI["App Router<br/>Server Components + Client"]
        RH["Route Handlers (Node runtime)<br/>/api/public /api/access /api/conditions /api/auth"]
        SA["Server Actions<br/>register/handoff/invite"]
        DAL["Data Access Layer<br/>session, rate-limit, audit, chain"]
        DOM["Modul domain murni TS<br/>condition-policy · batch-status · access-verification · public-id · fixed-point"]
        DBA["DbAdapter → Supabase / PGlite dev"]
    end

    UI --> SA
    UI --> RH
    SA --> DAL
    RH --> DAL
    DAL --> DOM
    DAL --> DBA
    subgraph Luar["Luar lifecycle request"]
        WK["Workers: simulator (node-cron) · reconcile · expireHandoffs"]
    end
    WK -->|HTTP internal terautentikasi| RH
    subgraph Chain["Chain layer"]
        CT["AgrichainLedger.sol"]
        EV["Evaluator wallet backend"]
    end
    DAL --> EV --> CT
```

## 04 — ERD Off-chain (ringkas)

```mermaid
erDiagram
    orgs ||--o{ product_categories : has
    product_categories ||--o{ monitoring_profiles : versioned
    monitoring_profiles ||--o{ profile_parameter_rules : rules
    monitoring_parameter_definitions ||--o{ profile_parameter_rules : defines
    orgs ||--o{ memberships : owns
    app_users ||--o{ memberships : has
    app_users ||--o{ point_assignments : assigned
    orgs ||--o{ distribution_points : operates
    distribution_points ||--o{ distribution_point_schedules : schedules
    distribution_points ||--o{ point_assignments : targets
    orgs ||--o{ batches : owns
    product_categories ||--o{ batches : classifies
    monitoring_profiles ||--o{ batches : "snapshot at registration"
    batches ||--o{ access_codes : "hashed"
    batches ||--o{ condition_readings : receives
    condition_readings ||--o{ condition_measurements : values
    batches ||--o{ condition_evaluations : evaluated
    batches ||--o{ handoff_intents : "two-party PENDING"
    handoff_intents ||--o{ handoff_records : confirmed
    batches ||--o{ transaction_references : "chainSyncStatus"
    batches ||--o{ access_attempts : logs
    orgs ||--o{ invitations : invite-only
    app_users {
        uuid id PK
        text privy_did UK
        text wallet_address UK
        bool mfa_verified
    }
    batches {
        uuid id PK
        text batch_code UK
        text public_id UK
        text distribution_status
        text condition_status
        text data_quality_status
        int custody_stage
        jsonb profile_snapshot
    }
    handoff_intents {
        text status "PENDING/CONFIRMED/CANCELLED/EXPIRED"
        text idempotency_key UK
    }
```

## 05 — State Machine Batch

```mermaid
stateDiagram-v2
    direction LR
    state "distribution_status" as dist {
        [*] --> DIDAFTARKAN : registerBatch
        DIDAFTARKAN --> DALAM_DISTRIBUSI : konfirmasi handoff 0→1
        DALAM_DISTRIBUSI --> SELESAI : konfirmasi handoff 1→2
    }
    state "condition_status (independen)" as cond {
        [*] --> NOT_EVALUATED
        NOT_EVALUATED --> COMPLIANT : evaluasi data tercatat
        NOT_EVALUATED --> AT_RISK : evaluasi data tercatat
        COMPLIANT --> AT_RISK : evaluasi berikut
        AT_RISK --> COMPLIANT : evaluasi berikut
    }
    state "data_quality_status (independen)" as dq {
        [*] --> AVAILABLE
        AVAILABLE --> DATA_UNAVAILABLE : bacaan stale
        DATA_UNAVAILABLE --> AVAILABLE : bacaan baru
    }
```

## 06 — Sequence Pendaftaran Batch

```mermaid
sequenceDiagram
    participant U as Admin Produsen (browser)
    participant P as Privy
    participant N as Next.js Server Action
    participant S as Supabase
    participant W as Embedded Wallet
    participant C as AgrichainLedger (Amoy)

    U->>P: login social/email
    P-->>U: access token
    U->>N: registerBatch (categoryId, profileId, batchCode)
    N->>P: verifyAccessToken
    N->>S: cek role/org + kategori & profil milik org
    N->>S: insert batches (public_id, profile_snapshot, chainSyncStatus=PENDING) + transaction_references (idempotency)
    N-->>U: { batchId, publicId, idempotencyKey }
    U->>W: sign registerBatch(batchKey, publicIdHash)
    W->>C: registerBatch (REGISTRAR_ROLE)
    C-->>W: tx hash + event BatchRegistered
    U->>N: confirmChainWrite(txHash)
    N->>S: update transaction_references → CONFIRMED
    Note over N,C: Bila callback gagal: worker reconcile membaca receipt dan mengkonfirmasi tanpa tx baru
```

## 07 — Sequence Serah-terima & Verifikasi Akses

```mermaid
sequenceDiagram
    participant Snd as Pengirim (kustodian)
    participant Rec as Penerima
    participant N as Next.js
    participant DB as Supabase
    participant C as Kontrak

    Note over Snd,Rec: Serah-terima dua konfirmasi (K7)
    Snd->>N: initiateHandoff (batch, recipientWallet, org)
    N->>DB: cek kustodian + stage + role (batch-status)
    N->>DB: insert handoff_intents (PENDING, idempotency)
    Rec->>N: confirmHandoff (batch)
    N->>DB: validasi wallet penerima + expiry
    N->>DB: atomik: intent CONFIRMED + stage/kustodian baru + handoff_records
    N->>C: (embedded wallet) HandoffConfirmed on-chain
    Note over Rec,DB: Verifikasi akses petugas
    Rec->>N: POST /api/access/verify (publicId, code, locationId)
    N->>DB: rate-limit IP/DID/publicId + point assignment
    N->>DB: verify Argon2id hash (kode tidak pernah disimpan)
    N->>N: classifyAccess → SAH/TIDAK_SAH/ANOMALI
    N->>DB: insert access_attempts (semua hasil)
    N->>C: recordValidAccess — HANYA SAH per-event (K8)
    N-->>Rec: { result, publicReason } (internalDetail tetap off-chain)
```

## 08 — Alur Simulator & Evaluasi Kondisi

```mermaid
flowchart LR
    subgraph Worker["Worker simulator (node-cron, no-overlap)"]
        G["generateReading<br/>deterministik (seed, tick)"]
    end
    subgraph Mode
        CC["COLD_CHAIN<br/>NORMAL · AT_BOUNDARY · DOOR_OPEN · COOLING_FAILURE · RECOVERY · SENSOR_OFFLINE"]
        NC["NON_COLD_CHAIN<br/>NORMAL · HIGH_HUMIDITY · SHOCK_EVENT · ROUTE_DELAY · SENSOR_OFFLINE"]
    end
    G --> CC & NC
    CC & NC -->|"POST /api/conditions/ingest<br/>x-simulator-key"| API["Validasi key + Zod + idempotency"]
    API --> STORE["condition_readings + condition_measurements<br/>source=SIMULATOR"]
    STORE --> EVAL["evaluateCondition (modul murni)<br/>snapshot profil batch"]
    EVAL --> ST{"Hasil"}
    ST -->|COMPLIANT/AT_RISK| CHAIN["recordCondition on-chain (EVALUATOR)"]
    ST -->|DATA_UNAVAILABLE / alert| OFF["Tetap off-chain"]
    EVAL --> SAVE["condition_evaluations + status batch"]
```

## 09 — Alur Data QR Publik

```mermaid
flowchart TB
    QR["QR berisi URL<br/>{APP_URL}/p/{public_id}"]
    H["Halaman /p/[publicId] (tanpa login/dompet)"]
    API["GET /api/public/batch/[publicId]"]
    RL["Rate limit 60/menit/IP<br/>respons 429 netral"]
    PROJ["Proyeksi tersanitasi<br/>(service-role)"]
    DB[("batches + handoff_records")]

    QR -->|pindai| H
    H --> API
    API --> RL
    RL -->|lolos| PROJ
    RL -->|terbatas| N429["429: Terlalu banyak permintaan"]
    PROJ --> DB
    PROJ -->|hanya kolom whitelist| H
    H --> LIM["Disclosure 'Batasan informasi'<br/>+ label SIMULATOR"]
    DB -.->|tidak dikenal| N404["404 netral: Batch tidak tersedia"]
    style LIM fill:#E2F0FA
    style N404 fill:#FDE7E5
```

## 10 — Lingkungan Lokal & Testnet

```mermaid
flowchart TB
    subgraph Dev["Mesin pengembang (Windows/npm)"]
        NPX["npm ci"]
        DEV["next dev :3000"]
        VIT["Vitest (unit + integration PGlite)"]
        HH["Hardhat (compile + test EDR)"]
        SEED["supabase/seed.ts → .pglite/agrichain.db"]
        SIM["npm run simulator (node-cron)"]
        PW["Playwright E2E publik+guard"]
    end
    subgraph Local["Opsional tanpa Docker"]
        PG["PGlite Postgres WASM"]
    end
    subgraph Docker["Opsional"]
        SBL["Supabase local (docker compose) :54321"]
    end
    subgraph Cloud["Layanan eksternal"]
        PR["Privy dashboard"]
        AM["Polygon Amoy RPC<br/>deploy via hardhat run scripts/deploy-amoy.ts"]
    end
    NPX --> DEV & VIT & HH & SIM & PW
    DEV --> PG
    VIT --> PG
    SEED --> PG
    DEV -.-> SBL
    SIM -->|localhost:3000| DEV
    HH --> AM
    DEV --> PR
```
