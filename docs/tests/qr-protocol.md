# Protokol Pengujian Pemindaian QR (Terukur)

> Rujukan: PRD Testing Decisions; IMPLEMENTATION-PLAN §10 (L3), Fase J5.
> Target keberhasilan: **≥ 90%** dari seluruh percobaan pemindaian.

## Tujuan

Mengukur tingkat keberhasilan pemindaian QR `public_id` (`{APP_URL}/p/XXXX-XXXX-XXXX-XXXX`) pada variasi pencahayaan dan sudut kamera, serta memverifikasi waktu tampil halaman publik < 5 detik.

## Alat dan bahan

| Alat                      | Spesifikasi                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| Ponsel pemindai           | Kamera belakang ≥ 8 MP, autofokus, penerang aktif/nonaktif         |
| QR uji                    | Hasil `Unduh QR` dari detail batch (PNG 512px, error correction M) |
| Kertas uji                | Putih/tonjol netral; QR ditempel datar                             |
| Lux meter/aplikasi        | Untuk mencatat pencahayaan lingkungan (perkiraan)                  |
| Stopwatch/alat ukur waktu | Untuk waktu tampak-tampil (opsional; devtools)                     |

## Matriks pengujian

- **Pencahayaan**: 2 level — (L1) terang normal dalam ruang (±300–500 lux); (L2) redup (±50–100 lux).
- **Sudut**: 3 posisi — 0° (lurus), ±30°, ±45°.
- **Jarak**: ±20 cm dan ±40 cm (dua jarak bila memungkinkan).
- **Percobaan per kombinasi**: 10 pemindaian.
- **Total minimum**: 2 × 3 × 10 = **60 percobaan** per perangkat.

## Prosedur per percobaan

1. Buka kamera/QR reader ponsel (atau aplikasi pemindai QR bawaan).
2. Arahkan ke QR sesuai kombinasi cahaya/sudut/jarak.
3. Catat hasil: **berhasil** (URL terbuka/ID terbaca) atau **gagal** (tidak terbaca dalam 10 detik).
4. Jika berhasil: catat waktu dari pemindaian sampai halaman publik selesai dirender (target < 5 s).
5. Uji juga **fallback manual**: masukkan `public_id` 19 karakter secara manual — harus berhasil 100%.

## Lembar pencatatan

| #   | Lux (±) | Sudut | Jarak | Hasil | Waktu tampil (dtk) | Catatan |
| --- | ------- | ----- | ----- | ----- | ------------------ | ------- |
| 1   | 400     | 0°    | 20cm  |       |                    |         |
| 2   | 400     | +30°  | 20cm  |       |                    |         |
| …   |         |       |       |       |                    |         |

Ringkasan per combinasi (total N, berhasil n, tingkat n/N×100%):

- L1/0°: ___ L1/30°: ___ L1/45°: ___
- L2/0°: ___ L2/30°: ___ L2/45°: ___

## Kriteria lulus

1. Tingkat keberhasilan agregat ≥ 90%.
2. Fallback manual 100% berhasil.
3. Halaman publik tampil < 5 detik pada jaringan lokal/wajar.
4. 404 netral muncul untuk QR palsu/tidak dikenal — tanpa membedakan penyebab.

## Catatan pembatasan

- Hasil tergantung perangkat dan aplikasi pemindai; catat model ponsel pada ringkasan.
- QR dapat disalin; keberhasilan pemindaian TIDAK menunjukkan keaslian fisik produk.
