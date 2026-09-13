<!-- SEED: traceability-dashboard-v2 | Structural authority: verified Figma node 420:398 in Inventory Management Dashboard Community. Content, terminology, and palette are adapted for food-distribution traceability. -->

---

name: Traceability Operations Dashboard
description: Visual system for a food-distribution traceability application with internal operations and public QR verification.
---

## Overview

The product is an operational dashboard, not a generic inventory catalogue and not a crypto wallet. Its visual thesis is **the chain of custody made legible**: a batch, its latest recorded condition, its handoff history, and the next responsible action should be understandable at a glance.

The Figma reference has now been verified. Adopt its operational anatomy exactly where it supports the job: a 280 px persistent desktop sidebar, a 100 px top bar, two stacked summary rows, a 690 px main evidence column, a 384 px right-context rail, and a table-plus-attention-list finale. Replace inventory terms with traceability terms: **Batch**, **Serah-terima**, **Kepatuhan data tercatat**, **Verifikasi akses**, and **Riwayat audit**.

Two surfaces use one system:

- **Internal operations**: dense but calm desktop-first workspace for authorized staff.
- **Public QR view**: mobile-first, read-only page that explains a batch without revealing sensitive operational data.

Status language is a product-safety constraint. Never present `COMPLIANT` as proof that a product is physically safe. Pair it with wording such as “sesuai data kondisi tercatat” and show the source label `SIMULATOR` whenever applicable.

## Colors

The palette combines dark blue-green for trust and auditability with cool sea-green for recorded compliance. Backgrounds stay light and neutral; saturated status colors are reserved for signals, never used as decorative wallpaper.

| Token              | Value     | Use                                                                       |
| ------------------ | --------- | ------------------------------------------------------------------------- |
| `--background`     | `#F5F8F7` | Main page canvas; cool off-white that avoids a clinical pure-white field. |
| `--surface`        | `#FFFFFF` | Cards, dialogs, table surfaces, QR result panels.                         |
| `--surface-muted`  | `#ECF3F1` | Filter strips, inactive navigation, quiet information blocks.             |
| `--ink`            | `#102A33` | Headings, navigation, key numerical values.                               |
| `--ink-muted`      | `#587078` | Supporting copy, labels, timestamps.                                      |
| `--border`         | `#D6E2DF` | Card, table, and input boundaries.                                        |
| `--brand`          | `#0F5965` | Primary action, active navigation, identity anchor.                       |
| `--brand-hover`    | `#0A4650` | Hover and pressed state of primary action.                                |
| `--brand-soft`     | `#DCEFF0` | Selected-row wash, informational emphasis.                                |
| `--compliant`      | `#16794A` | `COMPLIANT`, successful validation, positive trend.                       |
| `--compliant-soft` | `#DDF3E6` | Compliant badge background and restrained callout.                        |
| `--warning`        | `#B86B00` | `AT RISK`, pending attention, threshold proximity.                        |
| `--warning-soft`   | `#FFF0D4` | Warning badge background and notices.                                     |
| `--danger`         | `#B42318` | `TIDAK SAH`, failed operation, destructive confirmation.                  |
| `--danger-soft`    | `#FDE7E5` | Error panels and denied-access status.                                    |
| `--info`           | `#1D6FA5` | `SIMULATOR`, public-information note, neutral audit state.                |
| `--info-soft`      | `#E2F0FA` | Informational badge and source label.                                     |

Map these to shadcn/ui semantic tokens (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `destructive`, and `ring`) in CSS variables. Define application-specific status tokens separately; do not overload `primary` to convey compliance.

The “signal is scarce” rule applies: only status badges, a slim leading border, an icon, or a trend mark uses semantic color. A card carrying a status must remain predominantly white so a screen with many batches does not become a traffic-light wall.

## Typography

Use `IBM Plex Sans` through `next/font/google` for all interface text and `IBM Plex Mono` only for trace IDs, transaction hashes, public IDs, timestamps that need fixed alignment, and data-limit values. This pairing should feel operational and trustworthy rather than decorative or crypto-forward. Load only IBM Plex Sans 400/600 and IBM Plex Mono 400/500 with `display: 'swap'`, metric-compatible fallback stacks, and CSS variables. Do not use monospaced text for paragraph copy.

| Role                | Desktop          | Mobile        | Weight / treatment                     |
| ------------------- | ---------------- | ------------- | -------------------------------------- |
| Page title          | 30 px / 38 px    | 24 px / 32 px | 600, `--ink`                           |
| Section title       | 20 px / 28 px    | 18 px / 26 px | 600                                    |
| Metric value        | 20–24 px / 28 px | 20 px / 28 px | 600, tabular numerals                  |
| Table primary cell  | 14 px / 20 px    | 14 px / 20 px | 600                                    |
| Body and form label | 14 px / 20 px    | 14 px / 20 px | 400–500, IBM Plex Sans                 |
| Helper / timestamp  | 12 px / 18 px    | 12 px / 18 px | 400, `--ink-muted`                     |
| Status badge        | 12 px / 16 px    | 12 px / 16 px | 650, uppercase only for compact labels |

Write labels in Bahasa Indonesia that mirror the process, not implementation jargon. Prefer “Data kondisi tercatat” over “oracle data,” “Riwayat audit” over “blockchain logs,” and “Hubungkan wallet” only when an optional external wallet action truly exists.

## Layout

### Figma-derived desktop composition

The verified `Dashboard` frame is 1,440 x 1,211 px. At desktop width, preserve its strong working rhythm:

- **Shell:** 280 px sidebar + 1,160 px work area; white sidebar and top bar over a pale neutral canvas.
- **Top bar:** 100 px high. Place a 400 px contextual search at left, with notification and avatar controls at right.
- **Content grid:** begin at 32 px from the work area's left edge. Use 690 px main column + 22 px gutter + 384 px context rail, totalling 1,096 px.
- **Metric bands:** two rows of 163 px cards. The left card has four equal metrics separated by vertical dividers; the right card has two metrics.
- **Evidence band:** 360 px chart in each column. The main chart owns the operational trend; the right chart owns the compact comparison.
- **Action band:** 308 px main table beside a 309 px stacked attention list. Use compact text links such as `Lihat semua`, not oversized secondary CTAs.

For this product, map the bands as follows:

| Figma region       | Traceability content                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| Sales Overview     | Ringkasan Distribusi: Batch Aktif, Serah-terima Hari Ini, COMPLIANT, AT RISK |
| Inventory Summary  | Ringkasan Batch: Dalam Distribusi, Menunggu Penerimaan                       |
| Purchase Overview  | Ringkasan Verifikasi: SAH, TIDAK SAH, ANOMALI, Dibatasi                      |
| Product Summary    | Ringkasan Jaringan: Titik Aktif, Petugas Berwenang                           |
| Sales & Purchase   | Tren Kepatuhan Kondisi: Sesuai batas vs Mendekati/di luar batas              |
| Order Summary      | Status Serah-terima: Dicatat vs Dikonfirmasi                                 |
| Top Selling Stock  | Batch yang Perlu Ditindaklanjuti                                             |
| Low Quantity Stock | Peringatan Kondisi Tercatat                                                  |

### Screenshot referensi UI Figma

Simpan gambar berikut sebagai referensi komposisi, hierarki, tabel, dan formulir. Saat aplikasi dibangun, seluruh istilah, data, dan warna harus mengikuti sistem pelacakan distribusi pangan—bukan mereplikasi merek atau konten inventori pada gambar sumber.

#### Autentikasi

![Referensi layar masuk dan pendaftaran](design-references/figma/01-authentication.png)

Gunakan struktur dua kolom untuk masuk dan pendaftaran. Ganti form email/password pada referensi dengan pilihan **Lanjutkan dengan Google** dan **Lanjutkan dengan email** dari Privy; dompet embedded dibuat setelah autentikasi berhasil.

#### Dashboard operasional

![Referensi dashboard](design-references/figma/02-dashboard.png)

Pertahankan sidebar, top bar, kartu ringkasan, grafik, tabel tindak lanjut, dan panel peringatan; kontennya menjadi status batch, kepatuhan kondisi, serta serah-terima distribusi.

#### Batch dan pencatatan baru

![Referensi inventori dan modal produk baru](design-references/figma/03-batch-register.png)

Tabel ini menjadi daftar batch. Modalnya menjadi formulir **Daftarkan Batch**, dengan identitas batch, produk, produsen, jumlah, tanggal kedaluwarsa, dan ambang kondisi yang relevan.

#### Laporan dan analitik

![Referensi laporan](design-references/figma/04-reports.png)

Gunakan pola kartu ringkasan, grafik tren, tabel kategori/produk, dan filter periode untuk laporan kepatuhan, keberhasilan verifikasi QR, dan anomali distribusi.

#### Titik distribusi

![Referensi daftar pemasok](design-references/figma/05-distribution-points.png)

Tabel ini menjadi daftar titik distribusi atau pihak berwenang, dengan peran, kontak, status verifikasi, dan jumlah batch aktif.

#### Tambah titik distribusi

![Referensi modal tambah pemasok](design-references/figma/06-add-distribution-point.png)

Modal dipakai untuk menambah titik distribusi/petugas. Field mengikuti domain aplikasi: nama, peran, lokasi, kontak, dan catatan otorisasi; jangan meminta data dompet secara manual karena ditangani Privy.

#### Serah-terima distribusi

![Referensi daftar pesanan dan modal baru](design-references/figma/07-handoffs.png)

Tabel ini menjadi riwayat serah-terima batch. Modalnya menjadi aksi **Catat Serah-terima**, termasuk batch, pengirim, penerima, waktu, lokasi, dan bukti/metadata kondisi.

#### Pengaturan organisasi

![Referensi pengelolaan toko](design-references/figma/08-organization-settings.png)

Gunakan pola daftar kartu untuk profil organisasi, lokasi/titik distribusi, dan konfigurasi ambang kondisi. Akses edit dibatasi berdasarkan peran.

Tiga tangkapan layar laporan yang identik tidak diulang; satu representasi laporan di atas mencakup ketiganya.

### Application shell

- Desktop (`>= 1280 px`): a 280 px left sidebar stays visible, matching the verified Figma shell. Use a 100 px top bar, 32 px content inset, a 690 px main column, 384 px context rail, and 22 px gutter. Keep the desktop content width near 1,096 px rather than stretching cards across the viewport.
- Tablet (`768–1279 px`): sidebar collapses to icon rail or opens through a shadcn `Sheet`; retain the same content order.
- Mobile (`< 768 px`): no permanent sidebar. Use a compact top bar and menu sheet. The public QR view is primary; complex internal tables become stacked batch cards with a “lihat detail” action.
- Use a 12-column desktop grid, 8-column tablet grid, and 4-column mobile grid. Keep an 8 px spacing base: 8, 12, 16, 24, 32, 48. The reference's primary vertical rhythm is 22-24 px between card bands.

### Mobile layout contract

Design from a 375 px-wide viewport first, then scale up. The mobile experience is a task-focused field companion—not a compressed desktop dashboard. Preserve the pale neutral canvas, white surfaces, dark ink, restrained brand teal, and semantic status colors in `## Colors`; do not adopt the neon/dark visual language usually associated with Web3.

| Area              | Specification                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen frame      | 375 px baseline width, 16 px side inset, 24 px top inset below the safe area, 16 px gap between cards, and 24 px between page sections.                                                                                                                                       |
| Top bar           | 56 px high: menu/back control, concise page title or batch code, then notification/avatar or contextual action. It remains visible while the user works, but never consumes more than one line of content.                                                                    |
| Bottom navigation | 72 px including safe-area padding. Four destinations: `Ringkasan`, `Batch`, `Scan`, and `Lainnya`. `Scan` is the central primary field action; `Lainnya` opens a shadcn `Sheet` for Serah-terima, Verifikasi manual, Laporan, Titik Distribusi, and Pengaturan based on role. |
| Tap targets       | Every icon, row action, tab, and button has a minimum 44 × 44 px hit area. Use 48 px for the primary bottom action.                                                                                                                                                           |
| Cards and lists   | Full-width cards, 12 px radius, 16 px padding. Tables become single-action list cards; show only the batch code, product/category, the three statuses, latest update, and one `Lihat detail` action.                                                                          |
| Typography        | Use IBM Plex Sans on mobile; title 20 px, section title 16 px, body 16 px (14 px only for dense labels), metadata/badge 12 px. IBM Plex Mono is reserved for trace IDs in audit detail.                                                                                       |

#### Mobile navigation and critical flows

```text
Internal app
┌──────────────────────────────────┐
│ ☰  Ringkasan                 ◉   │  56 px top bar
├──────────────────────────────────┤
│ Status hari ini                   │
│ [Batch aktif] [Perlu tindakan]    │  2-up metric cards
│                                  │
│ Perlu ditindaklanjuti              │
│ [BATCH-01 · AT RISK        ›]     │  task cards, not a table
│ [BATCH-02 · Menunggu terima ›]    │
│                                  │
├──────────────────────────────────┤
│ Ringkasan  Batch  [ Scan ] Lainnya│  thumb-zone navigation
└──────────────────────────────────┘

Public QR view
┌──────────────────────────────────┐
│ ‹  Detail batch                   │
├──────────────────────────────────┤
│ Produk / kategori                 │
│ BATCH-XXXX                         │
│ [Dalam distribusi] [Compliant]    │
│ [Data tersedia]                   │
│                                  │
│ Riwayat tercatat                   │
│  ● Pabrik → Distributor            │
│  ○ Menunggu penerimaan             │
│                                  │
│ Batasan informasi                  │
└──────────────────────────────────┘
```

1. **Ringkasan:** tampilkan maksimal dua kartu metrik berdampingan, kemudian satu daftar prioritas. Grafik tren dipindahkan di bawah daftar sebagai ringkasan 160–180 px dengan filter periode; jangan memaksa grafik desktop 360 px ke layar kecil.
2. **Batch:** filter terbuka sebagai `Sheet` dengan chip mode `Cold chain`/`Non-cold chain`, status distribusi, status kondisi, dan kualitas data. Hasil adalah kartu batch; penyortiran default adalah `Perlu tindakan` lalu perubahan terbaru.
3. **Detail batch:** header memperlihatkan batch code, kategori, dan tiga badge terpisah—distribusi, kondisi, serta kualitas data. Gunakan segmented tabs yang dapat digeser: `Ringkasan`, `Kondisi`, `Serah-terima`, `Audit`. Satu tab aktif tampil penuh; jangan menampilkan panel berdampingan.
4. **Scan dan verifikasi akses:** `Scan` membuka viewport kamera yang tinggi dengan izin kamera, garis pemandu, dan fallback `Masukkan ID secara manual`. Setelah QR terbaca, konteks batch dikunci. Form kode dan tombol `Verifikasi akses` berada di bagian bawah layar; hasil menggantikan form tanpa mengungkap validitas kode mentah.
5. **Serah-terima dua pihak:** pengirim melihat CTA `Ajukan serah-terima` di zona ibu jari setelah memilih batch dan penerima. Penerima melihat kartu pending dengan identitas batch tersanitasi dan CTA tetap `Konfirmasi penerimaan`. State sukses memberi ringkasan singkat dan tautan `Lihat riwayat`; state gagal tetap mempertahankan konteks serta aksi coba lagi.
6. **Profil monitoring:** form kategori memakai pilihan eksplisit `Cold chain` atau `Non-cold chain` terlebih dahulu. Parameter yang tidak relevan tidak ditampilkan. Aturan parameter ditambahkan sebagai baris kartu, bukan tabel: nama, satuan, batas, toleransi, dan tingkat keparahan.
7. **Halaman publik QR:** tidak memakai bottom navigation internal, tidak membutuhkan login, dan tidak pernah menampilkan kontrol organisasi, lokasi presisi, wallet, atau audit internal. Disclosure `Batasan informasi` selalu terlihat setelah status; bukan tautan tersembunyi.

#### Mobile states and feedback

- Gunakan `Skeleton` dengan geometri kartu sebenarnya saat memuat; jangan tampilkan spinner besar di tengah halaman.
- Untuk `DATA_UNAVAILABLE`, tampilkan waktu pembacaan terakhir dan CTA `Lihat riwayat`, bukan klaim bahwa kondisi aman.
- `OPERATIONAL_ALERT` tampil sebagai kartu konteks yang tenang; hanya `AT RISK` memakai amber kuat dan ikon peringatan.
- Setelah serah-terima dikonfirmasi atau QR berhasil dipindai, gunakan transisi singkat 160–220 ms dan tanda centang halus. Hindari konfeti atau animasi meriah karena domain ini menuntut ketenangan dan kepercayaan.
- Empty state menjelaskan langkah berikut: misalnya, “Belum ada batch yang memerlukan tindakan” atau “Pindai QR untuk memulai verifikasi.”

### Information hierarchy

1. **Context** — organization/titik distribusi, user role, page title, and one clear primary action.
2. **Current state** — at most four concise metric cards: Batch aktif, Memerlukan perhatian, Serah-terima hari ini, dan Verifikasi anomali.
3. **Work queue** — filterable list/table, sorted by required action and latest change.
4. **Evidence** — condition chart or latest reading, handoff timeline, access-verification trail, and immutable audit reference.

### Core screen compositions

- **Dashboard**: two 163 px summary bands, then a 360 px trend/comparison band, then a 308 px batch-table/attention-list band. The left column owns aggregate evidence; the right rail owns concise context and exceptions.
- **Daftar batch**: persistent filters above table; batch ID and product are the left anchor; condition and distribution status are adjacent; last update and next action sit to the right.
- **Detail batch**: title block with batch ID, QR action, and status; horizontal overview tabs (`Ringkasan`, `Kondisi`, `Serah-terima`, `Audit`); the summary uses an evidence-first two-column layout, collapsing to one column.
- **Verifikasi akses**: single-purpose form with batch context locked above it; result replaces the form area but keeps a retry/manual alternative. Never expose whether a particular raw authorization code exists.
- **QR public view**: a mobile card with product/batch identity, latest sanitized status, a chronological history, and a persistent “Batasan informasi” disclosure. Hide organization-only controls and precise locations.

### Screen catalogue from the Figma file

The Figma file contains the following primary frames: `Login`, `Sign Up`, `Dashboard`, two `Inventory` variants, `Product Info`, `Suppliers`, `Add Supplier`, two `Orders` variants, `Manage store`, and `Reports`. The app reuses their shell and hierarchy, but changes their content to the traceability domain below.

| Figma screen            | Structure read from Figma                                                                             | Traceability screen and content adaptation                                                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login                   | 1,440 x 960 split layout: identity/mark at left and a compact 360 px form at right.                   | **Masuk Petugas**. Retain the split composition but use Privy social login/passwordless. Explain that internal access is invite-only; do not show a self-service password form or a MetaMask prerequisite.                                                                                 |
| Sign Up                 | Same split composition with a compact account-creation panel, Google action, and account-return link. | **Aktivasi Undangan**. Use only after a valid administrator invitation. The right panel confirms email/social identity, organization, role, and embedded-wallet onboarding when required. Consumers never enter this flow.                                                                 |
| Dashboard               | Sidebar + 100 px top bar + 690/384 content split; two metric bands, two charts, then table/list.      | **Ringkasan Operasional**. Use the mapped metrics, condition trend, handoff status, attention table, and alert list defined above.                                                                                                                                                         |
| Inventory               | 1,440 x 960 shell; 1,096 x 188 overview/filter panel above a 1,096 x 606 full-width table.            | **Batch**. The overview contains status chips, date range, source, and last distribution point. The table contains batch ID, product/profile, latest condition status, last handoff, update time, and action. `Daftarkan batch` is the only prominent CTA.                                 |
| Inventory modal variant | Reuses the Inventory shell with an overlay/modal state.                                               | **Batch action modal**. Use this only for batch registration, QR download confirmation, or an explicit state-transition confirmation. Preserve the batch context behind the modal; never obscure an irreversible consequence.                                                              |
| Product Info            | 1,096 x 809 full-width detail panel inside the same shell.                                            | **Detail Batch**. Header: public-safe batch ID, QR action, current status, latest update. Body tabs: `Ringkasan`, `Kondisi`, `Serah-terima`, `Audit`. The audit tab uses monospaced IDs sparingly and exposes no secrets.                                                                  |
| Suppliers               | 1,096 x 816 table-centric screen with primary add button, filters, download action, and pagination.   | **Titik Distribusi**. Rows are distribution points, responsible organization, permitted role, schedule status, and active/inactive state. Export requires internal authorization and respects organization scope.                                                                          |
| Add Supplier            | A full-screen shell plus a compact modal/form state.                                                  | **Tambah atau Ubah Titik Distribusi**. Form fields cover organization, public-safe location name, permitted roles, verification schedule, and activation. Do not collect raw authorization codes in visible text fields; send them directly to the server for hashing.                     |
| Orders                  | Overview/filter panel + 1,096 x 627 full-width table; an alternate overlay/modal state also exists.   | **Serah-terima**. Table shows origin, destination, batch, permitted actor role, planned/actual time, status, and action. The confirmation modal names the batch and the on-chain record that will be created.                                                                              |
| Manage store            | 1,096 x 705 full-width management panel.                                                              | **Pengaturan Organisasi dan Standar**. Group product condition profile, organization membership, roles, access verification settings, and simulator scenario settings into clearly separated cards. Contract pause/unpause is visually isolated and restricted to contract administrators. |
| Reports                 | Two top summary cards (555 px and 519 px), a 1,096 x 384 chart, then a 1,096 x 306 table.             | **Laporan dan Audit**. Top cards summarize monitored batches and verification outcomes; the chart shows trend by period; the table lists batch/event evidence. All simulation-derived charts display `SIMULATOR`; reports cannot claim physical food safety.                               |

### Auth, modal, and public-screen rules

- Keep the Figma auth screens clean and split at desktop, but change the KANBAN identity area into a product mark plus the phrase `Ketertelusuran distribusi pangan yang dapat diaudit`.
- Privy owns the login surface. Primary options are social login or passwordless email; external wallet connection is optional after authorization, never the first-screen requirement.
- Internal account activation is invite-only. Replace generic `Create an account` wording with `Aktifkan undangan`; unknown or expired invitations show a safe error and support path.
- Reuse the Figma 500 px modal proportion for sensitive write actions. A modal must contain a concise context header, body fields/summary, clear secondary cancellation, and one explicit primary action.
- Public QR never inherits the internal shell. It starts with a batch result card, then status explanation, sanitized timeline, and a `Batasan informasi` disclosure.

## Elevation & Depth

Depth is quiet and functional. The product should resemble a well-kept operations record, not a floating finance dashboard.

- Default card: 1 px `--border`, 12 px radius, no shadow.
- Hoverable table row/card: `background: --surface-muted` or an inset outline; never lift more than 2 px.
- Floating menu, dialog, and Sheet: use one soft shadow (`0 12px 32px rgba(16,42,51,.14)`) and a dimmed backdrop.
- Selected navigation: `--brand-soft` fill with `--brand` icon/text; do not use a heavy shadow or full saturated block.
- Destructive state: colored border and icon first; reserve filled danger backgrounds for an explicit irreversible confirmation.

## Shapes

- Use 12 px corners for cards, inputs, dialogs, tables wrapped in cards, and QR panels.
- Use 8 px corners for buttons, segmented controls, badges with text, and compact filters.
- Use pill shapes only for status badges, role chips, or a small count indicator. Avoid pill-shaped containers for most navigation and content blocks.
- Borders are 1 px and cool-grey. Dividers separate data groups; spacing separates concepts. Do not combine dense dividers, thick shadows, and colored fills in one component.
- Icons use Lucide’s rounded-but-technical line style at 16–20 px. Pair an icon with text for any high-impact action or status.

## Components

### Navigation and identity

- **Sidebar**: 280 px white rail with wordmark/project name at top; routes (`Ringkasan`, `Batch`, `Serah-terima`, `Verifikasi Akses`, `Laporan`, `Titik Distribusi`) in the middle; `Pengaturan` and `Keluar` anchored at the bottom, matching the verified Figma rhythm. Use an organization switcher only when required.
- **Top bar**: 100 px white bar with a 400 px context-aware search field (`Cari batch, lokasi, atau ID publik`) on the left, then notification and user menu on the right. Mobile keeps only page title, QR scan shortcut when relevant, and menu button.
- **Role indicator**: compact neutral chip such as `Admin Produsen` or `Petugas Distributor`; it indicates context but is never the only authorization safeguard.

### Data and status

- **Metric card**: panel title plus equal-width metric cells with a 20–24 px pastel icon, a value, label, and vertical divider. Use four cells in the 690 px left card and two cells in the 384 px right card, exactly as the reference's hierarchy. A metric must answer a decision question, not merely repeat table data.
- **Batch status badge**: `DIDAFTARKAN` neutral/slate, `DALAM DISTRIBUSI` brand/info, `COMPLIANT` green, `AT RISK` amber. Pair every badge with text; the color alone is insufficient.
- **Access-result badge**: `SAH` green, `TIDAK SAH` red, `ANOMALI` amber. Include an understandable action hint such as “Periksa jadwal dan otorisasi” without exposing confidential comparison details.
- **Source badge**: `SIMULATOR` in `--info-soft`; it appears beside readings and in the public-page limitation note.
- **Trace ID**: monospaced, truncated in dense layouts, with a copy control and accessible full value. Never put a private key, token, or raw code in a copyable field.
- **Compliance card**: latest temperature/humidity value, configured range, reading time, source, and evaluation reason. It says “Evaluasi terhadap data tercatat,” not “produk aman.”
- **Handoff timeline**: vertically connected events from Pabrik → Distributor → Retailer. Each event shows actor role, timestamp, sanitized location name, and result; missing data is explicitly shown as “Belum tercatat.”
- **Data table**: sticky header, readable 56–64 px row height, compact `Lihat semua` link, sortable columns only where sorting aids action, filter chips above the table, and row click that opens detail. The desktop dashboard table stays in the 690 px main column; provide a mobile card alternative rather than horizontal scrolling as the only path.

### Input and actions

- **Primary button**: `--brand` filled; use for one page-level action such as `Daftarkan batch`, `Catat serah-terima`, or `Verifikasi akses`.
- **Secondary button**: white surface, border, `--ink`; use for `Lihat detail`, `Unduh QR`, or `Batal`.
- **Destructive button**: danger styling appears only inside a confirmation dialog that names the actual effect, affected batch, and actor permission.
- **Forms**: shadcn `Form`, `Input`, `Select`, `Textarea`, and inline Zod error message. Required fields use text “Wajib”, not an asterisk alone. Server validation error is shown at form level and preserves safe entered values.
- **QR scanner**: bordered camera viewport, permission explanation before opening camera, visible `Pindai QR` action, and manual URL/public ID entry fallback. On unsupported camera/permission denial, do not leave an empty black frame.
- **Confirmation dialog**: for blockchain writes, state the batch, intended event, wallet/account context, and the fact that an audit record will be created. Include pending/failed/success transaction states.

### Required states

| Situation              | Visual response                                                       | User-facing copy direction                                                         |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Loading data           | shadcn `Skeleton` matching final card/table geometry                  | “Memuat riwayat batch…”                                                            |
| Empty batch list       | Quiet illustration/icon, a reason, and one next action                | “Belum ada batch yang sesuai filter.”                                              |
| No access              | Locked panel with a path back; no sensitive data flashes first        | “Akun ini belum memiliki akses ke batch tersebut.”                                 |
| Session expired        | Re-auth prompt through Privy, preserving non-sensitive page context   | “Sesi berakhir. Masuk kembali untuk melanjutkan.”                                  |
| Network/service error  | Alert with retry and correlation ID only if safe to show              | “Data belum dapat dimuat. Coba lagi.”                                              |
| Transaction pending    | Inline progress tied to the intended event, not a generic spinner     | “Mencatat serah-terima ke riwayat audit…”                                          |
| Transaction failed     | Explain the action was not recorded; show retry only when safe        | “Pencatatan belum berhasil. Riwayat batch tidak diubah.”                           |
| Rate limited           | Neutral warning, cooldown/retry guidance, no clue about code validity | “Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.”                  |
| Public QR not found    | Safe public error, scan/manual retry, no database distinction         | “Batch tidak tersedia untuk ditampilkan.”                                          |
| QR copy/anomaly signal | Informational caution, never a counterfeit verdict                    | “Pola pemindaian perlu ditinjau; sistem tidak menyimpulkan keaslian fisik produk.” |

## Do's and Don'ts

### Do

- Make the batch identifier, current recorded status, last update, and next action visually immediate.
- Use the Figma reference’s familiar dashboard rhythm—navigation, concise summaries, filters, tables, and detail context—while making the terms and workflows traceability-specific.
- Keep public QR data deliberately smaller and more explanatory than internal data.
- Show a text label, icon, and accessible semantic description alongside every critical color status.
- Use a persistent note or disclosure on public and condition screens: “Status menunjukkan evaluasi atas data kondisi yang tercatat.”
- Keep audit and blockchain references legible but secondary to the user’s operational decision.
- Build all controls with shadcn/ui primitives and retain visible keyboard focus, field labels, and validation messages.

### Don'ts

- Do not call a `COMPLIANT` batch “aman dikonsumsi,” “terjamin aman,” or equivalent physical-safety claim.
- Do not make blockchain hashes, wallet addresses, or token-like graphics the visual hero of every screen.
- Do not copy inventory-dashboard content, branding, or palette from the Figma reference; it only informs the operational dashboard pattern.
- Do not expose raw authorization code state, precise restricted locations, staff identities, tokens, secret keys, or private operational metadata on public routes.
- Do not use a sea of colored cards, excessive glass effects, gradients, or large shadows; meaningful status color must remain scarce.
- Do not rely on a desktop table as the sole mobile experience.
- Do not make MetaMask installation, a wallet extension, or crypto terminology a prerequisite for a consumer QR journey or normal Privy login.
