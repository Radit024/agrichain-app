# Profil Kategori Studi Kasus & Kunci Rujukan Ambang (K12)

> Artefak Fase M3. Semua nilai ambang bersifat **INDIKATIF** untuk purwarupa
> dan berlabel SIMULATOR. Nilai harus dikunci terhadap rujukan primer
> (SNI/BPOM/standar internasional) sebelum dipakai di luar skripsi.

## Kategori 1 — COLD_CHAIN (indikatif: produk susu cair pasteurisasi)

Mode penanganan: kontrol suhu wajib selama penyimpanan/distribusi.

| Parameter       | Satuan | Wajib | Batas (indikatif)              | Toleransi | Severity |
| --------------- | ------ | ----- | ------------------------------ | --------- | -------- |
| `TEMPERATURE`   | °C     | ya    | 2.0 – 6.0 (batas inklusif, K4) | 900 s     | CRITICAL |
| `HUMIDITY`      | %RH    | tidak | 40 – 80                        | –         | CONTEXT  |
| `COOLING_STATE` | enum   | tidak | ON/OFF/FAULT                   | –         | CONTEXT* |
| `DEVICE_HEALTH` | enum   | ya    | ONLINE/STALE/OFFLINE           | –         | CONTEXT  |

*`COOLING_STATE = FAULT` hanya menempel AT_RISK bila profil menyatakannya CRITICAL; default: alert operasional.

Rujukan primer yang harus dikunci di Bab II/III sebelum ambang final:

- SNI susu cair pasteurisasi (persyaratan penyimpanan dingin).
- Regulasi BPOM mengenai pangan yang disimpan pada suhu tertentu.
- Codex Alimentarius (General Principles of Food Hygiene + kode praktik susu).

Skenario simulator aktif: `NORMAL`, `AT_BOUNDARY`, `DOOR_OPEN`, `COOLING_FAILURE`, `RECOVERY`, `SENSOR_OFFLINE`.

## Kategori 2 — NON_COLD_CHAIN (indikatif: produk kemasan sensitif kelembapan)

Mode penanganan: tanpa kewajiban rantai dingin; parameter dipilih per karakter produk.

| Parameter       | Satuan | Wajib | Batas (indikatif)    | Toleransi | Severity |
| --------------- | ------ | ----- | -------------------- | --------- | -------- |
| `HUMIDITY`      | %RH    | ya    | 30 – 70              | 1800 s    | CRITICAL |
| `SHOCK_LEVEL`   | g      | tidak | maks 8               | 0 s       | WARNING  |
| `DEVICE_HEALTH` | enum   | ya    | ONLINE/STALE/OFFLINE | –         | CONTEXT  |

Rujukan primer yang harus dikunci: standar pengemasan pangan kering nasional/internasional dan publikasi terukur untuk ambang kelembapan/guncangan kemasan.

Skenario simulator aktif: `NORMAL`, `HIGH_HUMIDITY`, `SHOCK_EVENT`, `ROUTE_DELAY`, `SENSOR_OFFLINE`.

## Invarian evaluasi (modul condition-policy, K4/K5)

1. Batas **inklusif**: `min ≤ v ≤ max` = COMPLIANT dengan reason `AT_BOUNDARY`.
2. Pelanggaran bertahan < `toleranceSeconds` lalu pulih → COMPLIANT (`WITHIN_TOLERANCE`).
3. Pelanggaran ≥ `toleranceSeconds` → AT_RISK; `toleranceSeconds = 0` → AT_RISK seketika.
4. Parameter wajib hilang atau bacaan stale → `DATA_UNAVAILABLE` (bukan COMPLIANT).
5. Hanya severity CRITICAL yang dapat menghasilkan AT_RISK; lainnya alert operasional.
6. Snapshot profil tersimpan saat registrasi — revisi profil tidak mengubah evaluasi riwayat.
