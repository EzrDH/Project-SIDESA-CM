# SIDESA-CM — Product Requirements Document (PRD) FINAL

**Produk:** SIDESA-CM — Layanan Digital Desa Cibeteung Muara
**Versi:** 1.0 (FINAL) — konsolidasi produk + penerapan Secure SDLC
**Tanggal:** 2026-07-26
**Penyusun:** Muhammad Ezra Dhiatara — D4 Rekayasa Kriptografi, Politeknik Siber dan Sandi Negara
**Mitra:** Pemerintah Desa Cibeteung Muara, Kecamatan Ciseeng, Kabupaten Bogor
**Kerangka keamanan:** Microsoft SDL (utama) · NIST SSDF SP 800-218 (pelengkap) · PASTA + STRIDE (pemodelan ancaman)
**Status:** Final untuk pengajuan; menggantikan PRD v0.2 dan v0.3

> **Ringkasan perubahan menuju versi final.** Atas masukan dosen pembimbing, fitur penerbitan dan
> penandatanganan surat digital dihapus; penandatanganan dokumen kembali dilakukan tatap muka. Aplikasi
> difokuskan menyelesaikan masalah ketidakpastian waktu bertemu Kepala Desa melalui janji temu dan nomor
> antrean, dengan verifikasi kelayakan berbasis zero-knowledge proof (ZKP) sebagai inti kriptografinya.
> Tidak ada tanda tangan digital ECDSA pada aplikasi. Dokumen ini menyatukan kebutuhan produk dan
> penerapan Secure SDLC dalam satu rujukan.

---

## Bagian A — Produk

## A.1 Ringkasan Eksekutif

SIDESA-CM adalah aplikasi layanan warga Desa Cibeteung Muara yang menyediakan penjadwalan janji temu dan
nomor antrean untuk keperluan yang mengharuskan pertemuan langsung dengan Kepala Desa atau perangkat
desa. Masalah yang dipecahkan: warga harus datang ke kantor desa tanpa kepastian giliran, sehingga waktu
terbuang dan pelayanan menumpuk. Aplikasi memberi kepastian giliran, transparansi antrean, dan
pemberitahuan otomatis, dengan model rujukan fitur Antrean pada aplikasi Mobile JKN.

Nilai kriptografis produk terletak pada verifikasi kelayakan yang menjaga privasi: sebelum memesan
antrean, warga membuktikan dirinya penduduk terdaftar yang berhak tanpa mengungkap NIK, memakai
bukti-pengetahuan Schnorr (ZKP) dan keanggotaan pohon Merkle. Keamanan tidak ditambalkan di akhir tetapi
disisipkan pada setiap tahap pengembangan melalui Secure SDLC (Bagian B).

## A.2 Latar dan Masalah

Keperluan warga yang menuntut kehadiran Kepala Desa — konsultasi, pengaduan, legalisir/tatap muka —
mengharuskan datang fisik tanpa kepastian waktu, sehingga warga menunggu lama atau bolak-balik.
Perangkat desa pun menghadapi antrean tak terkelola dan beban menumpuk pada jam tertentu tanpa data
kebutuhan layanan. Penjadwalan dan antrean digital memberi kepastian bagi warga dan meratakan beban bagi
kantor, sekaligus menjadi wadah penerapan ZKP untuk kelayakan yang menjaga data pribadi.

## A.3 Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik |
|---|---|
| Memberi kepastian giliran | Warga memperoleh nomor antrean/slot sebelum datang; estimasi waktu tunggu tersedia |
| Mengurangi penumpukan | Distribusi kedatangan lebih merata antar jam layanan |
| Menjaga privasi data kependudukan | NIK tidak pernah dikirim/disimpan mentah; kelayakan terbukti tanpa NIK |
| Menegakkan kelayakan | Hanya penduduk terdaftar yang dapat memesan; percobaan non-anggota ditolak |
| Keandalan | Alur pesan → panggil → dilayani berjalan pada perangkat nyata; notifikasi tiba |

## A.4 Pengguna dan Peran

- **Warga (WARGA).** Penduduk terdaftar. Memesan janji temu/antrean, memantau status, menerima
  notifikasi, check-in.
- **Operator (OPERATOR).** Petugas desa. Mengelola slot dan kuota, menjalankan papan antrean
  (panggil/dilayani/tidak hadir), menerbitkan kode enrolment setelah memeriksa kartu identitas, dan
  mengelola registri penduduk.
- **Kepala Desa (KADES).** Melihat agenda pertemuan harian dan ringkasan antrean. Tidak memegang kunci
  privat dan tidak menandatangani apa pun di aplikasi.
- **Administrator (ADMIN).** Konfigurasi sistem, tata kelola akun, dan audit.

## A.5 Produk Rujukan

Fitur Antrean Mobile JKN (BPJS Kesehatan): pengguna memilih fasilitas/poli dan memperoleh nomor antrean
serta status giliran untuk keperluan kontrol/temu. SIDESA-CM mengadaptasi pola ini ke konteks layanan
desa Cibeteung Muara, dengan tambahan gerbang kelayakan berbasis ZKP yang menjaga privasi.

## A.6 Arsitektur Sistem

Sistem disusun sebagai monorepo dengan tiga paket: pustaka kriptografi berbasis TypeScript
(`@sidesa/crypto`) sebagai satu titik operasi kripto yang dapat diaudit; peladen berbasis NestJS dengan
basis data PostgreSQL; dan aplikasi seluler berbasis Flutter. Peran ditegakkan melalui kendali akses
berbasis peran pada setiap endpoint. Batas kepercayaan memisahkan perangkat warga dari peladen desa;
peladen adalah pemelihara registri penduduk yang berwenang untuk verifikasi kelayakan.

## A.7 Rancangan Kriptografi (inti: ZKP)

### A.7.1 Satu primitif untuk tiga gerbang
Seluruh operasi kripto adalah bukti-pengetahuan Schnorr non-interaktif (NIZK Fiat-Shamir) bahwa perangkat
menguasai skalar rahasia x untuk kunci publiknya X = x·G, di atas kurva P-384 dengan tantangan diturunkan
lewat SHA-384 berdomain. Konteks berbeda mengikat bukti pada tiap gerbang. Tidak ada ECDSA.

- **Autentikasi (login).** Perangkat membuktikan penguasaan kunci atas konteks `SIDESA-auth-v1|akun|nonce`
  terhadap X terdaftar; nonce sekali pakai mencegah pemutaran ulang.
- **Enrolment.** Setelah operator memverifikasi kartu identitas secara fisik dan menerbitkan kode sekali
  pakai, perangkat mengklaim dengan bukti Schnorr atas `SIDESA-enroll-v1|kode|X`, mengikat akun ke X dan
  membentuk daun registri `leaf = H(X ‖ atribut)`. Menutup pendaftaran kunci milik orang lain.
- **Kelayakan (saat memesan).** Bukti Schnorr atas `SIDESA-eligibility-v1|akun|jenis|nonce` ditambah
  keanggotaan Merkle daun `H(X ‖ atribut)` di bawah akar registri. NIK tidak pernah ikut.

### A.7.2 Registri penduduk dan minimalisasi data
Registri adalah pohon Merkle dari daun `H(X ‖ atribut)` dengan penandaan ranah daun/simpul untuk
ketahanan pra-citra kedua. Akar dipelihara peladen sebagai otoritas registri; tidak perlu ditandatangani
karena tidak ada pemverifikasi publik luring. NIK diverifikasi fisik saat enrolment dan tidak pernah
didigitalkan dalam bukti; peladen hanya menyimpan `nikCommitment` untuk audit dan anti-duplikat.

### A.7.3 Format wire dan pemisahan domain
Kunci publik X terkompresi 49 bita; bukti Schnorr terdiri atas titik komitmen R (49 bita) dan skalar
respons s (48 bita). Seluruh pencernaan hash menerapkan pemisahan domain: masukan biner diberi awalan
panjang 32-bit; konteks untai memakai penanda ranah berpembatas. Bukti yang dibuat aplikasi Dart
diverifikasi peladen TypeScript (interoperabel).

### A.7.4 Keterbatasan yang dinyatakan: kunci tidak berbasis perangkat keras
Schnorr menuntut akses langsung ke skalar x untuk menghitung s = k + c·x. Android Keystore/StrongBox
tidak mengekspos skalar tersebut, sehingga kunci identitas disimpan pada penyimpanan yang dapat diakses
aplikasi (`flutter_secure_storage`), bukan terisolasi di StrongBox dengan gerbang biometrik pada operasi
kripto. Biometrik tetap dapat mengunci akses aplikasi. Untuk aplikasi antrean tanpa penandatanganan
dokumen, model ancamannya lebih rendah (kunci dicuri hanya memungkinkan pemesanan atas nama korban, bukan
pemalsuan dokumen resmi); trade-off ini wajar dan dilaporkan sebagai keterbatasan.

## A.8 Kebutuhan Fungsional

### A.8.1 Onboarding dan Autentikasi
- **FR-1 Enrolment perangkat.** Operator memverifikasi kartu identitas warga secara fisik lalu
  menerbitkan kode sekali pakai. Perangkat mengklaim kode dengan bukti kepemilikan kunci (ZKP Schnorr),
  mengikat akun ke kunci publiknya. Akun dibuat hanya saat kode diklaim.
- **FR-2 Autentikasi.** Login memakai pembuktian kepemilikan kunci (ZKP Schnorr) atas nonce peladen;
  tanpa kata sandi dan tanpa NIK. Sesi berupa token.

### A.8.2 Kelayakan Menjaga Privasi
- **FR-3 Gerbang kelayakan.** Sebelum memesan, warga membentuk bukti kelayakan: keanggotaan registri
  Merkle + bukti kepemilikan kunci atas konteks ber-nonce. NIK tidak pernah dikirim. Percobaan oleh
  non-anggota atau tanpa penguasaan kunci ditolak.

### A.8.3 Janji Temu dan Antrean
- **FR-4 Jenis layanan.** Daftar jenis layanan yang dapat dikonfigurasi (mis. konsultasi, pengaduan,
  keperluan tatap muka Kepala Desa).
- **FR-5 Pemesanan.** Warga memilih jenis layanan dan tanggal/slot; setelah gerbang kelayakan lolos,
  sistem menerbitkan nomor antrean (dan/atau slot waktu).
- **FR-6 Kuota dan slot.** Operator menetapkan kuota harian dan slot per jenis layanan; sistem menolak
  pemesanan yang melampaui kuota atau bentrok slot.
- **FR-7 Status real-time.** Warga melihat nomor yang sedang dilayani, posisi gilirannya, dan estimasi
  waktu tunggu.
- **FR-8 Papan antrean operator.** Operator memanggil nomor berikutnya, menandai dilayani / tidak hadir /
  lewati.
- **FR-9 Check-in.** Warga melakukan check-in saat tiba di kantor desa.
- **FR-10 Riwayat.** Warga dan operator dapat melihat riwayat janji temu dan kunjungan.

### A.8.4 Notifikasi
- **FR-11 Pemberitahuan.** Notifikasi push (FCM) untuk "giliran Anda sebentar lagi", konfirmasi, dan
  pembatalan. Muatan minimal tanpa data pribadi (hanya penanda kejadian dan acuan); detail diambil
  aplikasi lewat kanal terautentikasi.

### A.8.5 Registri dan Audit
- **FR-12 Registri penduduk.** Operator/Admin menambah atau mencabut penduduk dari registri Merkle;
  seluruh perubahan dicatat.
- **FR-13 Log audit.** Aksi sensitif (terbit/klaim kode, ubah registri, kelola antrean) dicatat pada log
  audit append-only berantai-hash yang dapat diverifikasi ulang.

## A.9 Kebutuhan Nonfungsional

- **NFR-1 Privasi (UU PDP).** NIK tidak pernah dikirim atau disimpan mentah; hanya komitmen tersimpan.
  Muatan notifikasi bebas data pribadi.
- **NFR-2 Kriptografi.** Inti kripto berupa ZKP Schnorr (NIZK) + keanggotaan Merkle di atas kurva P-384
  dan hash SHA-384. Tidak ada tanda tangan digital ECDSA pada aplikasi. Enkripsi data saat diam (bila
  diperlukan) memakai AES-256.
- **NFR-3 Kepatuhan.** Karena aplikasi tidak memproduksi tanda tangan teregulasi, posisi terhadap
  Keputusan Kepala BSSN Nomor 443 Tahun 2025 perlu dikonfirmasi (Risiko R-1).
- **NFR-4 Keamanan.** Anti-replay dengan nonce sekali pakai; anti-penyamaran pada enrolment; pembatasan
  laju permintaan; validasi masukan berbasis skema; audit tamper-evident.
- **NFR-5 Keandalan/Keterpakaian.** Alur inti berjalan pada perangkat nyata; antarmuka mengikuti panduan
  Material 3; dapat dipakai warga awam.
- **NFR-6 Konektivitas.** Fungsi inti mensyaratkan jaringan; kegagalan jaringan ditangani anggun.

## A.10 Model Data (ringkas)

- **Dipertahankan:** `Account` (dengan `publicKey` sebagai X, peran, status, `displayName`,
  `nikCommitment`, `attributes`, `leafIndex`), `AuthChallenge`, `EligibilityChallenge`, `EnrollmentCode`,
  `RegistryVersion`, `AuditLog`, `DeviceToken` (FCM).
- **Ditambah/diperluas:** model antrean — `ServiceType`, kuota/slot harian, dan tiket antrean dengan
  status `WAITING` → `CALLED` → `SERVED` / `NO_SHOW` / `CANCELLED`, token check-in, dan stempel waktu
  transisi.
- **Dihapus:** `LetterRequest`, `Letter`, jenis/status surat, dan jalur verifikasi publik.

## A.11 Di Luar Cakupan

Penerbitan dan penandatanganan surat digital; render PDF; kode QR; verifikasi publik dokumen; kunci
identitas berbasis perangkat keras (StrongBox) dan gerbang biometrik pada operasi kripto; anonimitas
penuh (unlinkability); integrasi Penyelenggara Sertifikasi Elektronik (PSrE/BSrE).

---

## Bagian B — Penerapan Secure SDLC (SSDLC)

Secure SDLC menyisipkan aktivitas keamanan pada setiap tahap pengembangan. Karena SIDESA-CM menangani
data kependudukan yang dilindungi undang-undang, keamanan adalah syarat utama, bukan pelengkap. Bagian
ini merangkum kerangka yang dipakai, perumusan kebutuhan keamanan dengan PASTA, pemodelan ancaman STRIDE,
penerapan per fase Microsoft SDL, dan pemetaan ke NIST SSDF — disesuaikan dengan produk yang telah
diorientasikan ulang.

> **Catatan status yang jujur.** Kebutuhan dan perancangan aman produk versi ini telah lengkap (PRD ini,
> dokumen desain, dan model ancaman STRIDE). Infrastruktur keamanan bersama telah terbangun dan teruji
> pada basis kode sebelumnya serta terbawa ke versi ini (log audit berantai-hash, pembatasan laju,
> validasi masukan, enrolment Model B, registri Merkle, notifikasi FCM, disiplin TDD). Implementasi
> khusus ZKP (migrasi auth/enrolment/kelayakan ke Schnorr) dan subsistem antrean adalah pekerjaan yang
> segera menyusul, diverifikasi dengan metodologi yang sama (uji soundness/negatif + interop + di
> perangkat).

## B.1 Pemilihan Kerangka

| Kerangka | Peran | Alasan |
|---|---|---|
| Microsoft SDL | Kerangka utama | Berbasis fase (Training → Response); selaras alur kerja; mudah dipresentasikan |
| NIST SSDF (SP 800-218) | Pelengkap/rujukan | Standar pemerintah; praktik PO/PS/PW/RV; memperkuat keselarasan standar |
| PASTA + STRIDE | Perumusan kebutuhan keamanan | PASTA menautkan objektif/kepatuhan ke ancaman; STRIDE mengisi tahap analisis ancaman |
| OWASP SAMM | Tidak dipakai | Penilaian kematangan organisasi di luar cakupan tim kecil |

## B.2 Perumusan Kebutuhan Keamanan dengan PASTA

| Tahap PASTA | Aktivitas | Status |
|---|---|---|
| 1. Define Objectives | Tujuan layanan antrean + kewajiban regulasi (UU PDP; dokumen tetap tatap muka; posisi Kepka 443) | Terpenuhi |
| 2. Define Technical Scope | Batas sistem, komponen monorepo, batas kepercayaan, pemilihan pustaka kripto | Terpenuhi |
| 3. Application Decomposition | Dekomposisi empat peran, alur data, titik masuk; autentikasi kepemilikan kunci | Terpenuhi |
| 4. Threat Analysis (STRIDE) | Identifikasi ancaman dan mitigasi yang dapat diuji (Tabel B.3) | Terpenuhi |
| 5. Vulnerability Analysis | Uji negatif/soundness + audit dependensi, tanpa uji penetrasi | Parsial |
| 6. Attack Modeling | Skenario serangan naratif, tanpa attack tree formal | Parsial |
| 7. Risk & Impact Analysis | Risiko residual secara kualitatif (Bagian C.1) | Parsial |

## B.3 Pemodelan Ancaman STRIDE (disesuaikan produk baru)

| Kategori | Ancaman | Mitigasi dan cara pengujiannya |
|---|---|---|
| Spoofing | Pemalsuan identitas warga saat login | Autentikasi kepemilikan kunci (ZKP Schnorr); diuji melalui penolakan bukti dari kunci lain |
| Spoofing | Pendaftaran kunci milik orang lain | Bukti Schnorr atas (kode, X) saat klaim; diuji melalui klaim yang ditandatangani kunci berbeda |
| Tampering | Manipulasi data/status antrean | Kendali akses per endpoint + integritas peladen + rantai audit; diuji transisi hanya oleh peran berwenang |
| Repudiation | Penyangkalan aksi petugas | Log audit append-only berantai-hash; diuji pengubahan satu entri membuat verifikasi rantai gagal |
| Information disclosure | Kebocoran data kependudukan | Simpan komitmen NIK, bukan NIK mentah; NIK tak pernah didigitalkan dalam bukti; muatan notifikasi minimal; diuji bukti kelayakan tidak memuat NIK |
| Denial of service | Pembanjiran permintaan autentikasi/pemesanan | Pembatasan laju (120/menit global, 15/menit autentikasi) + kuota slot; diuji pembatas aktif pada produksi |
| Elevation of privilege | Warga menjalankan aksi operator | Kendali akses berbasis peran pada setiap endpoint; diuji penolakan permintaan lintas peran |
| Replay | Penggunaan ulang bukti kelayakan/auth | Konteks ber-nonce sekali pakai; diuji pengiriman ulang bukti yang sama ditolak |

## B.4 Penerapan per Fase Microsoft SDL

- **B.4.1 Training.** Pendalaman ZKP (Schnorr/Fiat-Shamir), pohon Merkle, prinsip minimalisasi data (UU
  PDP), posisi Kepka 443, serta pemodelan ancaman PASTA/STRIDE.
- **B.4.2 Requirements.** PRD ini dan dokumen desain memuat kebutuhan fungsional dan keamanan secara
  eksplisit beserta kriteria sukses terukur.
- **B.4.3 Design.** Pemodelan ancaman STRIDE; autentikasi kepemilikan kunci berbasis ZKP; minimalisasi
  data (`nikCommitment`); registri Merkle beranchor peladen; kendali akses empat peran; log audit
  berantai-hash.
- **B.4.4 Implementation.** TDD sebagai jaring pengaman; primitif dari pustaka teraudit (`@noble/curves`),
  tidak menggulung primitif sendiri; pemisahan domain pada semua hashing; bukti Schnorr lintas bahasa
  (Dart↔TypeScript); validasi masukan berbasis DTO; manajemen rahasia (`.env` dikecualikan). Kunci
  identitas disimpan pada secure storage perangkat lunak (konsekuensi pemilihan Schnorr, lihat A.7.4).
- **B.4.5 Verification.** Pengujian positif dan negatif/soundness untuk bukti Schnorr pada tiap gerbang
  dan keanggotaan Merkle; uji interoperabilitas lintas bahasa; verifikasi menyeluruh alur antrean pada
  perangkat bersama layanan berjalan, dengan pemeriksaan keadaan basis data pada tiap transisi.
- **B.4.6 Release.** Pengelolaan rahasia; migrasi basis data terkendali (non-interaktif); pembatasan laju
  permintaan. Menyusul: penerapan TLS saat deploy.
- **B.4.7 Response.** Log audit append-only berantai-hash yang tamper-evident dan dapat diverifikasi
  ulang; dirancang mekanisme rotasi dan pencabutan kunci identitas beserta tata kelola administrator.

## B.5 Pemetaan ke NIST SSDF (SP 800-218)

| Praktik SSDF | Penerapan pada SIDESA-CM |
|---|---|
| PO — Prepare the Organization | Aturan proyek terdokumentasi (`CLAUDE.md`), konvensi TDD dan commit, dasar kepatuhan |
| PS — Protect the Software | `.env` dikecualikan; integritas dijaga rantai audit; NIK tidak disimpan mentah |
| PW.1 — desain aman | Pemodelan ancaman STRIDE + arsitektur kepemilikan kunci dan minimalisasi data |
| PW.4 — komponen tepercaya | Primitif kriptografi dari pustaka teraudit (`@noble/curves`), bukan implementasi sendiri |
| PW.5 — penulisan kode aman | Validasi masukan berbasis DTO; pembatasan laju; penanganan galat tanpa membocorkan detail |
| PW.7, PW.8 — review & pengujian | Peninjauan kode antartugas; pengujian negatif/soundness + interop + di perangkat |
| RV — Respond to Vulnerabilities | Jejak audit tamper-evident; rancangan rotasi/pencabutan kunci |

## B.6 Status Penerapan SSDLC

| Fase | Status |
|---|---|
| Training, Requirements, Design | Terpenuhi — kerangka, kebutuhan, dan pemodelan ancaman lengkap untuk produk versi ini |
| Implementation | Parsial — infrastruktur bersama (audit, rate limit, validasi, enrolment, registri, FCM) terbawa; migrasi ZKP Schnorr + subsistem antrean menyusul |
| Verification | Parsial — metodologi & suite pengujian bersama terbawa; verifikasi khusus ZKP/antrean menyusul |
| Release | Parsial — pembatasan laju & migrasi terkendali terpenuhi; TLS menyusul |
| Response | Sebagian besar terpenuhi — audit tamper-evident terpasang; rotasi/pencabutan kunci menyusul |

---

## Bagian C — Penutup

## C.1 Risiko

| ID | Risiko | Mitigasi |
|---|---|---|
| R-1 | Pergeseran kepatuhan Kepka 443 (tanpa tanda tangan) dianggap keluar kerangka | Konfirmasi ke dosen pembimbing; dokumentasikan bahwa tak ada tanda tangan teregulasi diproduksi, ZKP di atas P-384/SHA-384 |
| R-2 | Kunci identitas tak lagi terisolasi perangkat keras (konsekuensi Schnorr) | Model ancaman lebih rendah (tak ada dokumen dipalsukan); simpan kunci di secure storage; nyatakan sebagai keterbatasan |
| R-3 | Ketertautan antarpemesanan (pseudonim, bukan anonim) | Konsisten dengan pilihan "identified"; kredensial anonim dicatat sebagai pekerjaan lanjutan |
| R-4 | Adopsi warga rendah / literasi digital | Antarmuka sederhana; pendampingan operator; pelatihan lapangan |
| R-5 | Ketergantungan Google FCM untuk notifikasi | Muatan minimal; degradasi anggun bila push tak tersedia |

## C.2 Peta Jalan

- **Tahap 1 — Kripto ZKP.** Hidupkan Schnorr lintas bahasa + uji interop; migrasikan auth, enrolment, dan
  kelayakan ke Schnorr; pensiunkan ECDSA.
- **Tahap 2 — Pembersihan.** Hapus subsistem surat, PDF/QR, verifikasi publik, dan kunci hardware.
- **Tahap 3 — Antrean.** Bangun jenis layanan, kuota/slot, pemesanan + nomor antrean, papan antrean
  operator, status real-time, check-in, riwayat.
- **Tahap 4 — Notifikasi.** Sambungkan notifikasi antrean ke infrastruktur FCM yang telah ada.
- **Tahap 5 — Uji lapangan.** Uji bersama perangkat desa; kumpulkan umpan balik keterpakaian dan data
  yang memungkinkan analisis risiko kuantitatif.

## C.3 Lampiran: Perbandingan v0.2 → Final

| Aspek | v0.2 (surat bertanda tangan) | Final (antrean + ZKP) |
|---|---|---|
| Inti produk | Penerbitan surat bertanda tangan digital | Janji temu + nomor antrean |
| Penandatanganan | ECDSA P-384 oleh Kepala Desa di aplikasi | Tatap muka langsung, di luar aplikasi |
| Inti kripto | Tanda tangan ECDSA + kelayakan (Merkle + ECDSA) | ZKP Schnorr (auth, enrolment, kelayakan) + Merkle |
| Kunci identitas | Berbasis perangkat keras + biometrik | Secure storage perangkat lunak |
| Verifikasi publik | Halaman verifikasi surat via QR | Tidak ada (kelayakan diperiksa peladen) |
| Kerangka keamanan | Microsoft SDL + SSDF + PASTA/STRIDE | Sama, disesuaikan ke produk baru |
| Referensi produk | — | Fitur Antrean Mobile JKN |
