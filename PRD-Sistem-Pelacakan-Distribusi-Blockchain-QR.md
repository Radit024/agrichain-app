# PRD Sistem Pelacakan Distribusi Berbasis Blockchain dan QR Code

## Problem Statement

Produsen, distributor, retailer, dan konsumen tidak memiliki satu rekam jejak yang mudah diverifikasi untuk mengetahui pergerakan batch produk, kepatuhan kondisi penyimpanannya, serta identitas digital pihak yang melakukan penanganan pada titik distribusi. Pencatatan terpisah membuat penelusuran insiden lambat dan sulit diaudit. Pada produk yang memerlukan kondisi penyimpanan tertentu, informasi lokasi saja tidak cukup untuk menunjukkan apakah kondisi yang dicatat masih sesuai profil standar.

Skripsi ini membutuhkan purwarupa perangkat lunak yang menunjukkan bahwa peristiwa distribusi, hasil evaluasi terhadap data kondisi simulasian, dan hasil verifikasi akses digital dapat dicatat dan ditampilkan secara konsisten. Purwarupa tidak boleh menyatakan bahwa ia membuktikan keamanan pangan fisik, mengendalikan akses fisik, atau membuktikan kebenaran data sebelum data tersebut masuk ke sistem.

## Solution

Membangun aplikasi web ketertelusuran batch yang terhubung dengan smart contract pada Polygon Amoy testnet. Administrator titik distribusi menggunakan aplikasi untuk mendaftarkan batch, mencatat serah terima, mengelola jadwal otorisasi, dan menandatangani transaksi. Petugas lapangan memindai QR code serta memasukkan kode otorisasi untuk memperoleh hasil verifikasi digital. Konsumen memindai QR code untuk melihat riwayat distribusi dan status kepatuhan batch tanpa dompet digital.

Sistem menyimpan identitas batch, peristiwa distribusi, hasil evaluasi kondisi, dan hasil klasifikasi akses sebagai catatan on-chain yang dapat diaudit. Backend menyimpan data operasional dan rahasia, termasuk hash kode otorisasi, metadata lokasi rinci, konfigurasi akun, cache pembacaan, serta log layanan. Data kondisi berasal dari simulator, bukan sensor IoT, dan setiap hasil yang ditampilkan harus diberi label sebagai status kepatuhan terhadap data yang tercatat.

## Tech Stack

Snapshot versi inti berikut diverifikasi pada 13 September 2026. Dependensi pendukung yang tidak dicantumkan nomor rilisnya harus memakai rilis stabil terbaru yang kompatibel, kemudian dikunci dalam lockfile ketika proyek diinisialisasi.

| Area                             | Pilihan                                                                            | Kegunaan pada purwarupa                                                                                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bahasa utama                     | TypeScript, rilis stabil terbaru yang kompatibel                                   | Satu bahasa bertipe untuk aplikasi web, backend, skrip simulator, dan pengujian.                                                                                                                                                                                                    |
| Aplikasi web dan server          | Next.js 16.3.4, React 19.3.0, App Router, dan Node.js runtime                      | Menyediakan antarmuka web, routing, rendering server, Server Components, Server Actions, serta Route Handlers dalam satu aplikasi server-based. Static export tidak digunakan karena aplikasi membutuhkan autentikasi, secret, dan API runtime.                                     |
| Sistem komponen UI               | shadcn/ui CLI 4.21.0, Tailwind CSS 4.3.3, Radix UI primitives, dan Lucide Icons    | Menyediakan komponen aksesibel yang masuk ke source code proyek, bukan ketergantungan UI tertutup. Gunakan komponen Button, Card, Dialog, Form, Input, Select, Table, Badge, Tabs, Sheet, Sonner, dan Skeleton sesuai kebutuhan layar.                                              |
| Navigasi, formulir, dan validasi | React Router, React Hook Form, dan Zod, rilis stabil terbaru yang kompatibel       | Menjaga navigasi berbasis peran, validasi formulir, serta pesan kesalahan yang konsisten.                                                                                                                                                                                           |
| Pemindaian dan pembuatan QR      | `html5-qrcode` dan `qrcode`                                                        | Mengakses kamera browser untuk pemindaian dan menghasilkan QR code yang hanya merujuk ke URL/token batch.                                                                                                                                                                           |
| API dan layanan server           | Next.js Route Handlers, Server Actions, dan TypeScript                             | Menyediakan endpoint publik, administrasi, simulator, serta verifikasi akses tanpa server Express terpisah.                                                                                                                                                                         |
| Validasi dan keamanan server     | Zod, Argon2id, Next.js security headers, dan rate limiting                         | Memvalidasi payload, menyimpan hash kode otorisasi, menambahkan header keamanan HTTP, serta membatasi percobaan kode berulang.                                                                                                                                                      |
| Data off-chain                   | Supabase: Postgres, Data API, dan `@supabase/supabase-js` v2                       | Menyimpan profil aplikasi, keanggotaan organisasi/peran, hash kode otorisasi, jadwal, metadata lokasi, cache, dan log operasional. Supabase Postgres tetap menjadi basis data relasionalnya; Privy menjadi provider autentikasi pengguna. Catatan audit inti tetap berada on-chain. |
| Blockchain                       | Solidity, OpenZeppelin Contracts, Hardhat 3.16.0, dan Polygon Amoy testnet         | Mengimplementasikan role, batch, peristiwa distribusi, evaluasi status, serta event audit; Hardhat digunakan untuk kompilasi, pengujian, dan deployment testnet.                                                                                                                    |
| Autentikasi dan wallet           | Privy Auth, `@privy-io/react-auth`, `@privy-io/node`, dan embedded Ethereum wallet | Menyediakan social login serta wallet tertanam untuk administrator/petugas berwenang. Tidak diperlukan ekstensi MetaMask; pengguna yang telah memiliki wallet eksternal dapat menghubungkannya secara opsional.                                                                     |
| Integrasi blockchain             | ethers.js 6.17.0 dan Privy embedded wallet                                         | Membaca event dan mengirim transaksi dari wallet tertanam pengguna internal yang berwenang.                                                                                                                                                                                         |
| Simulator                        | Node.js TypeScript worker dan scheduler `node-cron`/platform cron                  | Menghasilkan pembacaan kondisi deterministik sesuai profil kategori produk, termasuk skenario normal, pelanggaran, pemulihan, dan data tidak tersedia. Worker berasal dari codebase yang sama, tetapi tidak dijalankan di lifecycle request Next.js.                                |
| Pengujian                        | Hardhat test runner, Vitest, Playwright, dan Bruno                                 | Menguji kontrak, modul kebijakan, Route Handlers/Server Actions, alur browser, dan skenario demonstrasi manual.                                                                                                                                                                     |
| Kualitas kode                    | ESLint, Prettier, Husky, dan lint-staged                                           | Menyeragamkan kualitas kode sebelum perubahan masuk ke repositori.                                                                                                                                                                                                                  |
| Lingkungan lokal                 | npm, Supabase CLI, Docker Compose, serta berkas `.env.example`                     | Menjalankan aplikasi, layanan Supabase lokal, dan konfigurasi testnet secara konsisten di komputer pengembang. Gunakan `npm ci` untuk pemasangan yang mengikuti lockfile.                                                                                                           |

shadcn/ui digunakan sebagai sistem komponen utama di atas Tailwind CSS. Komponennya ditambahkan ke source code proyek melalui CLI sehingga tetap dapat disesuaikan untuk kebutuhan aplikasi skripsi. Inisialisasi proyek Next.js harus memakai App Router, TypeScript, alias `@/`, dan konfigurasi shadcn/ui untuk Next.js. [shadcn/ui](https://ui.shadcn.com/docs/installation) [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) [Next.js App Router](https://nextjs.org/docs/app) [Hardhat](https://hardhat.org/) [ethers](https://docs.ethers.org/v6/)

## Klasifikasi Produk dan Profil Monitoring

Sistem mendukung produk umum melalui klasifikasi penanganan pada level kategori, bukan melalui ambang tunggal yang berlaku untuk semua batch. Setiap `product_category` wajib memiliki `handling_mode` berikut:

| Mode             | Definisi                                                                | Fokus monitoring                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `COLD_CHAIN`     | Produk yang memerlukan kontrol suhu selama penyimpanan atau distribusi. | Suhu dan durasi pelanggaran adalah parameter inti; status pendingin, pintu, serta kesehatan perangkat menjadi konteks operasional.      |
| `NON_COLD_CHAIN` | Produk yang tidak membutuhkan rantai pendingin.                         | Parameter dipilih sesuai karakter produk, misalnya kelembapan, guncangan, cahaya, keterlambatan titik distribusi, atau integritas data. |

`NON_COLD_CHAIN` tidak berarti produk tidak dipantau. Artinya, produk tidak memiliki kewajiban kontrol suhu dingin; hanya parameter yang ditetapkan pada profil kategorinya yang dinilai. Sistem tidak boleh menyimpulkan keamanan fisik atau kualitas umum suatu produk hanya dari satu pembacaan.

Setiap batch menyimpan snapshot versi `monitoring_profile` ketika didaftarkan agar perubahan profil di masa depan tidak mengubah dasar evaluasi riwayat batch. Profil terdiri dari aturan parameter yang dapat dikonfigurasi: `parameter_code`, satuan, wajib/tidak wajib, batas minimum/maksimum bila ada, toleransi durasi, serta tingkat keparahan. Penyimpanan off-chain menggunakan definisi parameter dan aturan profil terpisah, bukan kolom tetap seperti `min_temp` atau `max_hum`, agar kategori baru dapat ditambahkan tanpa mengubah skema inti.

Parameter yang tersedia pada purwarupa:

| Parameter                             | Kegunaan                                         | Penerapan                                                                              |
| ------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `TEMPERATURE`                         | Kondisi udara atau produk yang dicatat.          | Wajib untuk `COLD_CHAIN`; opsional untuk `NON_COLD_CHAIN` jika profil mensyaratkannya. |
| `HUMIDITY`                            | Kondisi kelembapan relatif.                      | Diaktifkan hanya bila relevan untuk kategori.                                          |
| `DOOR_STATE` dan `DOOR_OPEN_DURATION` | Menjelaskan paparan saat ruang/kontainer dibuka. | Konteks penting terutama untuk `COLD_CHAIN`; tidak otomatis membuat batch berisiko.    |
| `COOLING_STATE`                       | `ON`, `OFF`, atau `FAULT` untuk unit pendingin.  | Hanya tersedia pada profil `COLD_CHAIN`; dipakai untuk menjelaskan perubahan suhu.     |
| `SHOCK_LEVEL`                         | Indikasi guncangan atau penanganan kasar.        | Opsional untuk produk/kemasan yang rentan.                                             |
| `CHECKPOINT_ID`                       | Titik distribusi saat peristiwa dicatat.         | Konteks universal; gunakan ID titik, bukan koordinat GPS presisi.                      |
| `DEVICE_HEALTH`                       | `ONLINE`, `STALE`, atau `OFFLINE`.               | Universal; membedakan kondisi patuh dari data yang tidak tersedia.                     |

Status kondisi harus terpisah dari status distribusi atau serah-terima. Hasil evaluasi yang ditampilkan adalah `COMPLIANT`, `AT_RISK`, `NOT_EVALUATED`, atau `DATA_UNAVAILABLE`. `OPERATIONAL_ALERT` dapat dicatat untuk peristiwa seperti pintu terlalu lama terbuka, pendingin gagal, guncangan tinggi, atau keterlambatan checkpoint; alert ini tidak otomatis berarti produk tidak aman. `DATA_UNAVAILABLE` berlaku ketika tidak ada pembacaan baru melebihi batas profil, misalnya dua kali interval pembacaan.

Simulator adalah sumber data satu-satunya pada purwarupa dan setiap pembacaan diberi `source: SIMULATOR`. Ia menghasilkan deret waktu dengan `seed` tetap per batch dan skenario, sehingga hasil demo dan pengujian dapat direproduksi. Skenario `COLD_CHAIN` mencakup `NORMAL`, `AT_BOUNDARY`, `DOOR_OPEN`, `COOLING_FAILURE`, `RECOVERY`, dan `SENSOR_OFFLINE`. Skenario `NON_COLD_CHAIN` mencakup `NORMAL`, `HIGH_HUMIDITY`, `SHOCK_EVENT`, `ROUTE_DELAY`, dan `SENSOR_OFFLINE`; hanya skenario dengan parameter yang aktif pada profil yang boleh dijalankan. API cuaca lingkungan tidak dipakai sebagai sumber kepatuhan karena tidak merepresentasikan kondisi di dalam kontainer atau kemasan.

## User Stories

1. Sebagai administrator produsen, saya ingin membuat kategori produk dengan mode `COLD_CHAIN` atau `NON_COLD_CHAIN` dan profil monitoring berversi agar setiap batch dinilai berdasarkan parameter yang sesuai.
2. Sebagai administrator produsen, saya ingin menetapkan parameter monitoring, satuan, wajib/tidak wajib, batas minimum/maksimum, dan toleransi durasi agar aturan evaluasi dapat ditelusuri.
3. Sebagai administrator produsen, saya ingin mendaftarkan batch dengan identitas unik agar batch fisik dapat dipasangkan dengan catatan digitalnya.
4. Sebagai administrator produsen, saya ingin menghasilkan QR code untuk batch agar petugas dan konsumen dapat menuju halaman batch yang tepat.
5. Sebagai administrator atau petugas, saya ingin masuk menggunakan akun sosial atau email yang dikelola Privy agar saya tidak perlu memasang MetaMask atau membuat kata sandi aplikasi baru.
6. Sebagai pengguna internal yang mendapat peran on-chain, saya ingin memperoleh embedded wallet saat onboarding agar transaksi dapat ditandatangani dengan identitas wallet yang tetap.
7. Sebagai administrator titik distribusi, saya ingin menugaskan peran pabrik, distributor, atau retailer pada akun yang berwenang agar transaksi hanya dilakukan oleh pihak yang ditetapkan.
8. Sebagai administrator titik distribusi, saya ingin mendaftarkan jadwal dan identitas lokasi digital untuk akses yang diizinkan agar hasil verifikasi dapat diklasifikasikan secara konsisten.
9. Sebagai administrator titik distribusi, saya ingin menyimpan kode otorisasi dalam bentuk hash agar kode mentah tidak terekspos di aplikasi atau blockchain.
10. Sebagai administrator distributor, saya ingin mencatat penerimaan batch dari pabrik agar rantai serah-terima memiliki jejak waktu dan penanggung jawab.
11. Sebagai administrator retailer, saya ingin mencatat penerimaan batch dari distributor agar riwayat distribusi berlanjut sampai titik penjualan.
12. Sebagai sistem, saya ingin menolak serah-terima yang tidak sesuai urutan status batch agar riwayat tidak dapat melompat atau diduplikasi.
13. Sebagai layanan simulator, saya ingin mengirim deret pembacaan normal sesuai parameter aktif pada profil batch agar sistem dapat diuji pada skenario patuh.
14. Sebagai layanan simulator, saya ingin mengirim skenario pelanggaran, pemulihan, dan data tidak tersedia sesuai mode penanganan produk agar aturan kondisi dapat diuji secara terkendali.
15. Sebagai sistem, saya ingin mengevaluasi setiap data kondisi terhadap snapshot profil batch agar status COMPLIANT, AT_RISK, NOT_EVALUATED, atau DATA_UNAVAILABLE dapat dicatat otomatis.
16. Sebagai sistem, saya ingin menangani nilai tepat pada batas minimum dan maksimum secara eksplisit agar aturan evaluasi tidak ambigu.
17. Sebagai administrator, saya ingin melihat kronologi perubahan status batch agar investigasi berbasis data yang tercatat dapat dilakukan.
18. Sebagai petugas lapangan, saya ingin memindai QR code batch agar proses verifikasi dimulai tanpa mencari ID batch secara manual.
19. Sebagai petugas lapangan, saya ingin memasukkan kode otorisasi agar sistem dapat memverifikasi akses digital terhadap batch yang dipindai.
20. Sebagai sistem, saya ingin mengklasifikasikan kombinasi QR, kode, jadwal, dan lokasi menjadi SAH, TIDAK_SAH, atau ANOMALI agar hasil verifikasi dapat dipertanggungjawabkan.
21. Sebagai sistem, saya ingin tetap mencatat percobaan akses gagal dan anomali agar jejak audit tidak hanya memuat tindakan yang berhasil.
22. Sebagai petugas lapangan, saya ingin menerima alasan status akses yang aman untuk ditampilkan agar saya mengetahui tindak lanjut tanpa melihat kode atau data rahasia.
23. Sebagai konsumen, saya ingin membuka halaman batch melalui QR code tanpa dompet digital agar ketertelusuran mudah diakses.
24. Sebagai konsumen, saya ingin melihat ringkasan asal batch, titik distribusi, waktu peristiwa, dan status kepatuhan agar saya dapat memahami riwayat produk.
25. Sebagai konsumen, saya ingin melihat penjelasan batasan status agar tidak menganggap data simulasian sebagai bukti kondisi fisik produk.
26. Sebagai peneliti, saya ingin mengukur waktu tampilan data batch agar target akses kurang dari lima detik dapat diuji.
27. Sebagai peneliti, saya ingin menjalankan pemindaian QR pada kondisi pencahayaan dan sudut berbeda agar tingkat keberhasilan pemindaian dapat dihitung.
28. Sebagai peneliti, saya ingin menjalankan skenario akses sah, tidak sah, dan anomali di setiap titik distribusi agar aturan klasifikasi dapat diverifikasi.
29. Sebagai peneliti, saya ingin mengumpulkan respons TAM dari minimal 10 pengguna agar kemudahan penggunaan dan kebermanfaatan purwarupa dapat dievaluasi sebagai indikasi awal.
30. Sebagai administrator, saya ingin mengundang dan menyetujui pengguna internal sebelum mereka memperoleh peran aplikasi agar akun sosial yang tidak berwenang tidak dapat mencatat transaksi.
31. Sebagai pengguna internal berwenang, saya ingin menjalani MFA sebelum tindakan sensitif agar pengambilalihan akun sosial tidak langsung menghasilkan transaksi blockchain.
32. Sebagai konsumen, saya ingin melihat data ketertelusuran publik tanpa menerima data organisasi, identitas petugas, atau detail lokasi yang sensitif.
33. Sebagai administrator kontrak, saya ingin menghentikan sementara pencatatan ketika ditemukan anomali agar dampak bug dapat dibatasi sambil investigasi dilakukan.

## Implementation Decisions

- Arsitektur aplikasi adalah **server-based modular monolith** berbasis Next.js App Router. Satu codebase dan satu aplikasi Next.js menjadi batas server untuk halaman web, otorisasi Privy, akses Supabase, API, dan integrasi blockchain. Struktur internal dipisah berdasarkan modul domain agar mudah diuji, tetapi tidak dideploy atau dioperasikan sebagai microservices terpisah.
- Halaman publik dan dashboard menggunakan Server Components untuk pembacaan data yang aman di server. Komponen Client hanya dipakai untuk kebutuhan browser seperti Privy login, pemindaian kamera QR, dan interaksi shadcn/ui. Data yang berpindah dari Server Component ke Client Component harus berbentuk nilai JSON-serializable.
- Mutasi dari antarmuka internal dapat memakai Server Actions setelah token Privy serta peran pengguna diverifikasi. Route Handlers dipakai untuk endpoint publik, pemanggilan simulator, dan integrasi eksternal; seluruhnya menggunakan Node.js runtime, bukan Edge runtime, agar kompatibel dengan SDK Privy, Supabase, dan ethers.
- Simulator data berjalan sebagai Node.js worker terjadwal dari codebase yang sama, bukan di dalam lifecycle request Next.js. Worker memanggil Route Handler/internal domain API yang terautentikasi. Jika volume atau kebutuhan reliabilitas meningkat di masa depan, worker dapat dipisahkan tanpa mengubah kontrak API atau aturan domain inti.
- Smart contract menjadi sumber catatan yang tidak dapat diubah untuk identitas batch, peristiwa serah-terima, hasil evaluasi kondisi, dan hasil klasifikasi akses. Smart contract bukan satu-satunya sumber seluruh data aplikasi karena cache, log, metadata operasional, dan rahasia tetap disimpan off-chain.
- Otorisasi dipusatkan dalam data access layer server. Setiap Server Action, Route Handler, dan fungsi domain wajib memverifikasi access token Privy, peran aplikasi, organisasi pemilik batch, serta hak pengguna atas batch target. Kontrol tampilan pada UI hanya untuk pengalaman pengguna dan tidak dianggap sebagai kontrol keamanan.
- Pengguna internal memakai model invite-only/allowlist. Peran on-chain hanya diberikan setelah administrator memverifikasi akun Privy dan embedded wallet yang dipetakan; MFA Privy diwajibkan untuk administrator kontrak dan pengguna yang dapat mengubah standar produk atau mencatat peristiwa distribusi.
- Modul kebijakan kepatuhan kondisi merupakan modul inti yang menerima snapshot `monitoring_profile` dan pembacaan kondisi sesuai parameter aktif, lalu menghasilkan status serta alasan evaluasi yang terstruktur. Nilai numerik yang di-anchor ke blockchain harus menggunakan representasi angka berskala tetap agar tidak bergantung pada bilangan pecahan Solidity.
- Kategori produk membedakan `COLD_CHAIN` dan `NON_COLD_CHAIN` sesuai bagian Klasifikasi Produk dan Profil Monitoring. Status distribusi (misalnya DIDAFTARKAN atau DALAM_DISTRIBUSI), status kondisi (misalnya COMPLIANT atau AT_RISK), dan kualitas data (misalnya DATA_UNAVAILABLE) adalah dimensi terpisah. Status kondisi adalah hasil evaluasi data yang tercatat; ia tidak mengesahkan keamanan pangan produk secara fisik.
- Modul verifikasi akses digital menerima ID batch, identitas pemindai, bukti kode otorisasi, waktu, dan identitas lokasi digital. Backend memvalidasi kode mentah terhadap hash dan hanya meneruskan hasil klasifikasi serta metadata minimum ke smart contract. Kode otorisasi tidak ditulis on-chain.
- Status akses dibatasi pada SAH, TIDAK_SAH, dan ANOMALI. SAH memerlukan bukti kode valid serta kesesuaian jadwal dan lokasi; TIDAK_SAH berarti kode tidak valid; ANOMALI berarti kode valid tetapi jadwal atau lokasi tidak sesuai. Mekanisme ini tidak membuka, mengunci, atau membuktikan akses fisik ke kemasan atau ruang penyimpanan.
- QR code memuat URL publik atau token yang merujuk pada ID batch, bukan data kondisi, identitas pihak, atau kode otorisasi. Token harus tervalidasi di backend sebelum halaman batch dibuka.
- QR code menggunakan `public_id` acak yang stabil dan hanya memberi akses pada data publik yang disanitasi. QR code bukan bukti fisik keaslian produk karena label dapat disalin; sistem hanya dapat mencatat serta menampilkan indikasi pola pemindaian anomali tanpa menyimpulkan pemalsuan secara otomatis.
- Laman publik bersifat hanya-baca dan tidak membutuhkan login atau wallet. Operasi pencatatan yang menghasilkan transaksi blockchain hanya dilakukan administrator/petugas yang telah memperoleh peran aplikasi dan embedded wallet Privy.
- Privy menjadi provider autentikasi utama. Social login atau email/passwordless menghasilkan sesi Privy; browser mengirim access token Privy ke Next.js Server Action atau Route Handler dan kode server memverifikasinya menggunakan SDK server Privy sebelum memproses permintaan. MetaMask tidak dipakai dalam alur utama.
- Embedded wallet dibuat saat onboarding pengguna internal yang berwenang menulis transaksi. Alamat wallet dipetakan ke profil aplikasi dan peran organisasi di Supabase, sehingga catatan on-chain tetap dapat diatribusikan ke alamat unik tanpa pengguna mengelola ekstensi wallet atau private key secara langsung.
- Next.js Route Handlers menyediakan endpoint terpisah untuk operasi publik, administrasi, simulator, dan verifikasi akses. Kode server Next.js menggunakan `@supabase/supabase-js` untuk data off-chain, serta menjadi satu-satunya tempat bagi Supabase secret key. Kunci API Privy dan materi otorisasi server juga hanya berada di server; browser tidak pernah menerimanya.
- Supabase menjadi sumber data off-chain untuk profil yang dipetakan ke Privy DID, keanggotaan organisasi/peran aplikasi, hash kode otorisasi, jadwal, metadata lokasi, cache pembacaan, dan log operasional. Supabase Auth tidak digunakan sebagai login kedua; konsumen tetap dapat membuka data ringkas batch tanpa akun.
- Semua tabel Supabase yang terpapar ke Data API harus mengaktifkan Row Level Security. Peran `anon` hanya boleh membaca ringkasan batch dan riwayat yang sudah disanitasi untuk halaman QR publik. Data internal tidak diekspos langsung ke browser dan hanya diakses melalui backend setelah access token Privy diverifikasi; secret key tidak boleh dipakai di browser.
- Skema Supabase harus menggunakan foreign key eksplisit antara organisasi, pengguna, peran, jadwal, dan batch cache. Setiap kolom foreign key yang digunakan untuk join atau penghapusan berantai harus diberi indeks. Migrasi, kebijakan RLS, grants, dan indeks disimpan sebagai source-controlled migration agar lingkungan lokal dan deployment konsisten.
- Endpoint pemindaian dan verifikasi menerapkan rate limit terpisah per alamat IP, Privy DID, dan `public_id` batch. Kode otorisasi selalu diproses sebagai hash dan detail percobaan gagal disimpan off-chain; sistem hanya dapat meng-anchor ringkasan/hash periodik ke blockchain agar percobaan gagal tidak menjadi sumber spam transaksi dan kebocoran metadata.
- Smart contract menggunakan role spesifik dengan prinsip least privilege dan fungsi darurat `pause`/`unpause` yang hanya dapat dipanggil administrator kontrak. Kondisi pause menghentikan mutasi baru, sementara pembacaan riwayat batch tetap tersedia untuk audit.
- Audit log menggunakan correlation ID untuk menghubungkan request server, ID pengguna ter-hash, dan hash transaksi tanpa menyimpan access token, refresh token, kode otorisasi mentah, secret key, atau private key. Prosedur insiden mencakup pause contract, pencabutan peran, rotasi secret, dan pemeriksaan log.
- Simulator menghasilkan skenario deterministik sesuai mode penanganan produk. Deret waktu dibangun dari seed tetap per batch dan skenario, dijalankan pada interval yang dapat dikonfigurasi, dan setiap data diberi penanda sumber SIMULATOR. Endpoint ingest menggunakan kontrak payload generik agar integrasi perangkat IoT di masa depan tidak mengubah policy engine, tetapi integrasi IoT fisik tidak termasuk purwarupa.
- Studi kasus purwarupa menggunakan kategori `COLD_CHAIN` dan `NON_COLD_CHAIN` yang dipilih peneliti, dengan profil parameter yang didukung rujukan primer yang sesuai bila nilai ambang digunakan. Generalitas arsitektur dibuktikan melalui konfigurasi profil, bukan klaim validasi pada seluruh kategori pangan.
- Tampilan aplikasi memprioritaskan alur satu batch: daftar atau pilih batch, catat peristiwa, verifikasi akses, kirim kondisi, dan lihat riwayat. Dashboard agregat, analitik bisnis lanjutan, serta pelacakan peta real-time tidak diperlukan untuk purwarupa.

## Testing Decisions

- Pengujian berfokus pada perilaku yang terlihat dari kontrak, API, dan antarmuka, bukan struktur internal implementasi.
- Smart contract diuji otomatis menggunakan Hardhat untuk pendaftaran batch, otorisasi peran, urutan serah-terima, evaluasi batas minimum/maksimum, status AT_RISK, dan pencatatan tiga hasil akses.
- Modul kebijakan kepatuhan diuji sebagai unit terisolasi menggunakan tabel kasus normal, batas tepat, batas terlampaui, toleransi waktu, dan pemulihan pembacaan. Hasil uji harus menyertakan status serta alasan evaluasi yang diharapkan.
- Modul verifikasi akses diuji dengan kode benar dan salah, batch tidak dikenal, jadwal cocok dan tidak cocok, serta lokasi cocok dan tidak cocok. Uji memastikan kode mentah tidak pernah muncul di respons, log aplikasi, atau event blockchain.
- API diuji secara integrasi terhadap backend dan contract testnet/mock untuk memastikan halaman publik hanya mengembalikan data yang diizinkan dan operasi tulis memerlukan otorisasi administrator.
- Autentikasi Privy diuji untuk social login, access token valid/kedaluwarsa, penolakan token tidak valid, pemetaan Privy DID ke profil Supabase, serta pembuatan embedded wallet bagi pengguna internal. Uji memastikan MetaMask tidak menjadi prasyarat alur utama.
- Pengujian otorisasi memeriksa IDOR/BOLA pada setiap operasi berbasis batch: pengguna dari organisasi lain, pengguna tanpa peran, dan pengguna dengan peran yang salah harus ditolak meskipun mengetahui `public_id` atau ID batch.
- Kebijakan Supabase RLS diuji untuk operasi `select`, `insert`, `update`, dan `delete` pada peran `anon` serta `authenticated`. Pengujian harus membuktikan bahwa keduanya ditolak dari tabel internal, konsumen hanya dapat membaca data publik yang disanitasi, dan akses lintas organisasi hanya dapat terjadi lewat backend setelah otorisasi Privy diverifikasi.
- Pengujian rate limit memeriksa bahwa pemindaian dan verifikasi berulang menghasilkan respons terbatas tanpa membuka status kode otorisasi. Uji audit memastikan token, kode mentah, private key, dan secret tidak pernah muncul pada respons maupun log.
- Pengujian smart contract mencakup penolakan pemanggil tanpa role, transisi role yang tidak sah, kondisi pause/unpause, serta jaminan bahwa pause menolak mutasi tetapi tetap mengizinkan pembacaan riwayat.
- Pemindaian QR diuji secara manual dengan protokol terukur pada beberapa tingkat pencahayaan dan sudut. Jumlah percobaan, keberhasilan, dan kegagalan dicatat untuk menghitung tingkat keberhasilan terhadap target minimal 90 persen.
- Kinerja diuji dari pemindaian atau pembukaan URL sampai riwayat dan status tampil. Pengukuran memisahkan waktu respons cache/API dan waktu konfirmasi transaksi agar target tampilan kurang dari lima detik tidak disalahartikan sebagai target finalitas blockchain.
- Uji penerimaan menggunakan instrumen TAM dengan konstruk perceived ease of use dan perceived usefulness, minimal 10 responden, skala Likert, serta pelaporan sebagai indikasi awal alih-alih generalisasi populasi.
- Belum ada codebase atau prior art pengujian pada ruang kerja saat PRD dibuat. Ketika proyek diinisialisasi, pola test kontrak Hardhat dan test API harus menjadi acuan untuk pengujian berikutnya.

## Diagram Arsitektur dan Perancangan

Diagram berikut merupakan artefak perancangan yang melengkapi PRD. Sumber Mermaid disimpan pada `diagrams/source/` dan gambar PNG/SVG hasil render pada `diagrams/rendered/`. Semua status kepatuhan pada diagram merepresentasikan evaluasi terhadap data kondisi yang tercatat; status tersebut bukan bukti keamanan pangan fisik.

### 1. Use Case Diagram

Menunjukkan aktor sistem dan fungsi yang dapat mereka akses. Aktivasi akun internal bersifat invite-only, sedangkan konsumen hanya membaca ringkasan batch publik melalui QR.

![Use Case Diagram](diagrams/rendered/01-use-case.png)

### 2. System Context Diagram

Menunjukkan batas sistem dan ketergantungannya pada Privy, Supabase, Polygon Amoy, QR `public_id`, serta worker simulator.

![System Context Diagram](diagrams/rendered/02-system-context.png)

### 3. Diagram Arsitektur Modular Monolith

Menunjukkan pembagian modul di dalam satu aplikasi Next.js server-based, termasuk data access layer, modul domain, dan worker simulator yang berjalan di luar lifecycle request.

![Diagram Arsitektur Modular Monolith](diagrams/rendered/03-modular-monolith-architecture.png)

### 4. Entity Relationship Diagram Off-chain

ERD menggambarkan rancangan data Supabase. `transaction_reference` hanya menyimpan referensi transaksi, sedangkan event audit inti dan identitas batch tetap dicatat pada smart contract.

![Entity Relationship Diagram](diagrams/rendered/04-erd-offchain-data.png)

### 5. State Machine Batch

Diagram ini membatasi transisi status batch agar serah-terima dan evaluasi kondisi tidak dapat melompat atau dicatat secara tidak konsisten.

![State Machine Batch](diagrams/rendered/05-batch-state-machine.png)

### 6. Sequence Diagram Pendaftaran Batch

Menunjukkan verifikasi token Privy, pemeriksaan role/organisasi di server, penyimpanan metadata off-chain, tanda tangan embedded wallet, serta pencatatan event on-chain.

![Sequence Diagram Pendaftaran Batch](diagrams/rendered/06-register-batch-sequence.png)

### 7. Sequence Diagram Serah-terima dan Verifikasi Akses

Menunjukkan pemeriksaan urutan batch, kebijakan jadwal, kode otorisasi ter-hash, penyimpanan detail percobaan off-chain, dan pencatatan hasil audit on-chain.

![Sequence Diagram Serah-terima dan Verifikasi Akses](diagrams/rendered/07-handoff-verification-sequence.png)

### 8. Alur Simulator dan Evaluasi Kondisi

Menunjukkan sumber data simulator, skenario deterministik, policy engine, klasifikasi `COMPLIANT`/`AT RISK`, penyimpanan pembacaan, dan anchor event evaluasi.

![Alur Simulator dan Evaluasi Kondisi](diagrams/rendered/08-simulator-condition-flow.png)

### 9. Alur Data QR Publik

Menunjukkan bahwa QR hanya membawa `public_id` acak, endpoint menerapkan rate limit, dan halaman publik hanya menerima ringkasan riwayat yang telah disanitasi.

![Alur Data QR Publik](diagrams/rendered/09-public-qr-data-flow.png)

### 10. Diagram Lingkungan Lokal dan Testnet

Menunjukkan kebutuhan pengembangan lokal berbasis npm, Supabase local melalui Docker Compose, Hardhat, Privy, dan deployment contract pada Polygon Amoy.

![Diagram Lingkungan Lokal dan Testnet](diagrams/rendered/10-deployment-local-and-testnet.png)

## Out of Scope

- Pengadaan, integrasi, kalibrasi, atau validasi sensor IoT fisik.
- RFID, sensor pintu, kunci elektronik, atau mekanisme pengendalian akses fisik.
- Deteksi kontaminasi mikrobiologis, kimia, atau kerusakan fisik produk.
- Klaim bahwa blockchain menjamin kebenaran kondisi fisik sebelum data dicatat, atau bahwa purwarupa membuktikan keamanan pangan produk.
- Deployment ke Polygon mainnet, optimasi biaya produksi, serta skema token atau pembayaran blockchain.
- Pengelolaan identitas organisasi berbasis sertifikat enterprise, SSO, atau integrasi sistem perusahaan.
- Dashboard multi-bisnis, pelacakan GPS real-time, notifikasi produksi, aplikasi native mobile, dan integrasi ERP.
- Generalisasi hasil pengujian pada satu kategori produk ke semua kategori produk pangan.

## Further Notes

- Terminologi yang digunakan pada antarmuka dan laporan harus membedakan status kepatuhan data kondisi tercatat dari keamanan pangan fisik.
- Rujukan primer SNI, BPOM, atau standar relevan yang mendasari nilai ambang pada kategori studi kasus harus dicantumkan pada Bab II, Bab III, dan daftar pustaka sebelum nilai ambang dikunci.
- Proposal perlu mengubah judul Bab III menjadi Desain Teknologi serta menyesuaikan susunannya dengan panduan Karya Desain Teknologi: alat dan bahan, metode perancangan, metode pengujian, serta rencana implementasi.
- PRD ini belum dipublikasikan ke issue tracker karena ruang kerja saat ini bukan repositori dan tidak ada integrasi issue tracker yang terhubung. Label `ready-for-agent` harus diterapkan ketika isu dibuat.
