# Instrumen Uji Penerimaan — Technology Acceptance Model (TAM)

> Rujukan: PRD Testing Decisions; IMPLEMENTATION-PLAN §10 (L4).
> Konstruk: _Perceived Ease of Use_ (PEOU) dan _Perceived Usefulness_ (PU).
> Skala Likert 1–5 (1 = sangat tidak setuju … 5 = sangat setuju).
> Minimal 10 responden; hasil dilaporkan sebagai **indikasi awal**.

## A. Profil responden (kategori, bukan identitas)

1. Peran dalam simulasi: ☐ Admin produsen ☐ Petugas distributor ☐ Petugas retailer ☐ Konsumen ☐ Peneliti
2. Frekuensi memakai aplikasi web operasional: ☐ Harian ☐ Mingguan ☐ Jarang ☐ Pertama kali
3. Pernah memindai QR untuk keperluan lain: ☐ Ya ☐ Tidak

## B. Perceived Ease of Use (PEOU)

| #   | Pernyataan                                                                        | 1   | 2   | 3   | 4   | 5   |
| --- | --------------------------------------------------------------------------------- | --- | --- | --- | --- | --- |
| P1  | Saya mudah memahami alur kerja utama (batch → serah-terima → verifikasi → publik) | ☐   | ☐   | ☐   | ☐   | ☐   |
| P2  | Memindai QR dan memasukkan kode otorisasi mudah dilakukan                         | ☐   | ☐   | ☐   | ☐   | ☐   |
| P3  | Status batch (distribusi, kondisi, kualitas data) mudah dibedakan dan dipahami    | ☐   | ☐   | ☐   | ☐   | ☐   |
| P4  | Bahasa antarmuka jelas dan tidak membingungkan                                    | ☐   | ☐   | ☐   | ☐   | ☐   |
| P5  | Saya dapat menemukan informasi penting pada halaman publik tanpa bantuan          | ☐   | ☐   | ☐   | ☐   | ☐   |
| P6  | Pesan kesalahan memberi tahu tindak lanjut yang jelas                             | ☐   | ☐   | ☐   | ☐   | ☐   |

## C. Perceived Usefulness (PU)

| #   | Pernyataan                                                                             | 1   | 2   | 3   | 4   | 5   |
| --- | -------------------------------------------------------------------------------------- | --- | --- | --- | --- | --- |
| U1  | Sistem membantu memahami pergerakan dan penanggung jawab batch                         | ☐   | ☐   | ☐   | ☐   | ☐   |
| U2  | Riwayat serah-terima dan status kondisi tercatat berguna untuk menelusuri insiden      | ☐   | ☐   | ☐   | ☐   | ☐   |
| U3  | Verifikasi akses digital mempercepat pemeriksaan dibanding pencatatan manual           | ☐   | ☐   | ☐   | ☐   | ☐   |
| U4  | Halaman publik QR bermanfaat bagi konsumen tanpa akun/dompet                           | ☐   | ☐   | ☐   | ☐   | ☐   |
| U5  | Catatan audit on-chain menambah kepercayaan pada data yang ditampilkan                 | ☐   | ☐   | ☐   | ☐   | ☐   |
| U6  | Saya memahami bahwa status adalah evaluasi atas **data tercatat**, bukan jaminan fisik | ☐   | ☐   | ☐   | ☐   | ☐   |

## D. Pertanyaan terbuka

1. Bagian mana yang paling mudah / paling sulit dipakai?
2. Apakah ada informasi yang Anda harapkan tetapi tidak tersedia?
3. Apakah Anda akan memakai sistem seperti ini bila beroperasi nyata? Mengapa?

## E. Analisis dan pelaporan

- Hitung rerata skor per konstruk (PEOU = P1–P6; PU = U1–U6) dan simpangan baku.
- Analisis per peran bila subsampel memungkinkan.
- Laporkan sebagai indikasi awal purwarupa — **bukan** generalisasi populasi.
- Sertakan catatan bahwa seluruh data kondisi berasal dari SIMULATOR.

## F. Skenario yang dijalankan responden (panduan fasilitator)

1. Login internal (atau sesi demo yang disiapkan) → ringkasan operasional.
2. Buka daftar batch → detail batch → unduh QR.
3. Pindai QR → masukkan kode otorisasi → baca hasil SAH/TIDAK SAH/ANOMALI.
4. Buka halaman publik `/p/{publicId}` → baca status dan batasan informasi.
