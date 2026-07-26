# SIDESA-CM — Product Requirements Document (Ringkas)

**Produk:** SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara
**Versi dokumen:** 1.0 Ringkas
**Tanggal:** 2026-07-26
**Penyusun:** Muhammad Ezra Dhiatara — D4 Rekayasa Kriptografi, Politeknik Siber dan Sandi Negara
**Mitra:** Pemerintah Desa Cibeteung Muara, Kecamatan Ciseeng, Kabupaten Bogor
**Kerangka keamanan:** Microsoft SDL · NIST SSDF · PASTA · STRIDE
**Inti kriptografi:** Zero-Knowledge Proof (Schnorr NIZK) + Pohon Merkle

> Dokumen ini adalah ringkasan produk SIDESA-CM yang memuat pokok-pokok kebutuhan, arsitektur,
> implementasi kriptografi, dan penerapan Secure SDLC. Uraian lengkap beserta seluruh kebutuhan berkode,
> antarmuka program aplikasi, dan glosarium tersedia pada dokumen PRD versi penuh.

## Daftar Isi

| Bagian | Cakupan |
|---|---|
| 1. Ringkasan Eksekutif | Gambaran produk dan nilai kriptografisnya |
| 2. Masalah dan Tujuan | Persoalan warga dan perangkat desa, tujuan, metrik |
| 3. Ruang Lingkup | Yang termasuk dan yang berada di luar cakupan |
| 4. Pengguna dan Hak Akses | Empat peran dan matriks kewenangan |
| 5. Alur Pengguna | Pendaftaran, masuk, pemesanan, hari pelayanan |
| 6. Kebutuhan Fungsional | Kebutuhan pokok per modul |
| 7. Kebutuhan Nonfungsional | Keamanan, privasi, kinerja, keandalan, keterpakaian |
| 8. Arsitektur Sistem | Komponen, tumpukan teknologi, batas kepercayaan |
| 9. Implementasi Kriptografi | Primitif, skema Schnorr, tiga gerbang, registri Merkle |
| 10. Model Data dan Antarmuka | Entitas pokok, status antrean, peta layar |
| 11. Penerapan Secure SDLC | Kerangka, PASTA, STRIDE, fase SDL, pengujian |
| 12. Kepatuhan dan Regulasi | Ketentuan algoritma dan pelindungan data pribadi |
| 13. Risiko dan Mitigasi | Risiko utama beserta penanganannya |
| 14. Status, Peta Jalan, dan Kriteria Penerimaan | Keadaan kini, tahapan, dan syarat diterima |

## 1. Ringkasan Eksekutif

SIDESA-CM adalah aplikasi layanan warga Desa Cibeteung Muara yang menyediakan **penjadwalan janji temu
dan nomor antrean** untuk keperluan yang mengharuskan pertemuan langsung dengan Kepala Desa atau
perangkat desa. Warga memperoleh nomor antrean sebelum berangkat, memantau posisi gilirannya, dan
menerima pemberitahuan ketika gilirannya mendekat. Penandatanganan dan penyerahan dokumen tetap
dilakukan tatap muka; aplikasi berperan sebagai pengatur alur layanan, bukan penerbit dokumen.

Nilai kriptografis produk terletak pada **verifikasi kelayakan yang menjaga privasi**. Sebelum memesan,
warga membuktikan dirinya penduduk terdaftar yang berhak — namun **tanpa mengirimkan Nomor Induk
Kependudukan (NIK)**. Pembuktian memakai bukti-pengetahuan Schnorr non-interaktif yang dipadukan dengan
bukti keanggotaan pohon Merkle atas registri penduduk. NIK diperiksa satu kali secara fisik saat
pendaftaran perangkat, lalu tidak pernah didigitalkan; peladen hanya menyimpan komitmennya berupa nilai
hash.

Keamanan disisipkan pada setiap tahap pengembangan melalui Secure Software Development Lifecycle, dengan
Microsoft SDL sebagai kerangka fase, NIST SSDF sebagai rujukan praktik, serta PASTA dan STRIDE untuk
perumusan kebutuhan keamanan dan pemodelan ancaman.

## 2. Masalah dan Tujuan

### 2.1 Persoalan

Warga tidak memiliki cara mengetahui kapan akan dilayani. Akibatnya warga menunggu berjam-jam tanpa
kepastian, berisiko tidak terlayani pada jam padat, harus meninggalkan pekerjaan, atau menanggung biaya
perjalanan berulang. Dari sisi kantor desa, antrean tidak terkelola sehingga kedatangan menumpuk pada
jam tertentu, beban harian sulit diperkirakan, dan urutan pelayanan yang bergantung catatan manual rawan
sengketa.

Verifikasi kelayakan tidak dapat dilakukan dengan sekadar meminta NIK. NIK adalah data pribadi yang
dilindungi undang-undang sehingga penyimpanannya menciptakan risiko kebocoran yang besar; NIK juga
bersifat semipublik karena tercetak pada kartu identitas, sehingga pengetahuan atasnya bukan bukti
kepemilikan. Karena itu kelayakan dibuktikan secara kriptografis.

### 2.2 Tujuan dan Metrik

| Tujuan | Metrik |
|---|---|
| Memberi kepastian giliran sebelum warga berangkat | Nomor antrean dan estimasi waktu tunggu tersedia dan dipakai pada uji lapangan |
| Meratakan beban kedatangan | Sebaran tiket antar jam layanan lebih merata |
| Menegakkan kelayakan pemesan | Pemesanan oleh pihak di luar registri ditolak sistem |
| Menjaga data kependudukan | Tidak ada NIK mentah tersimpan pada basis data |
| Menyediakan jejak yang tidak dapat disunting diam-diam | Perubahan satu entri audit terdeteksi saat verifikasi rantai |
| Menghasilkan data kebutuhan layanan | Tersedia rekapitulasi tiket per jenis layanan dan periode |

## 3. Ruang Lingkup

**Termasuk cakupan.** Pendaftaran perangkat dengan verifikasi identitas fisik; autentikasi berbasis
pembuktian kepemilikan kunci; registri penduduk berbasis pohon Merkle; verifikasi kelayakan berbasis
zero-knowledge proof; pengelolaan jenis layanan, slot, dan kuota; pemesanan janji temu dan penerbitan
nomor antrean; papan antrean operator; pemantauan status dan estimasi giliran; check-in kehadiran;
notifikasi push; riwayat dan rekapitulasi; jejak audit berantai-hash; serta administrasi peran.

**Di luar cakupan.** Penerbitan dan penandatanganan dokumen digital; berkas PDF dan kode QR dokumen;
halaman verifikasi publik dokumen; integrasi Penyelenggara Sertifikasi Elektronik; anonimitas penuh yang
tidak dapat ditautkan antarpemesanan; penyimpanan kunci pada elemen aman perangkat keras dengan gerbang
biometrik; pembayaran daring; serta integrasi langsung dengan sistem kependudukan nasional.

## 4. Pengguna dan Hak Akses

**Warga** memesan antrean dan memantau gilirannya. **Operator** memverifikasi identitas fisik, mengelola
slot dan kuota, serta menjalankan papan antrean. **Kepala Desa** melihat agenda dan ringkasan antrean,
tanpa memegang kunci privat untuk menandatangani apa pun. **Administrator** menangani konfigurasi,
penyediaan akun berperan khusus, dan pemeriksaan audit.

| Kemampuan | WARGA | OPERATOR | KADES | ADMIN |
|---|---|---|---|---|
| Mendaftarkan perangkat dengan kode | Ya | — | — | — |
| Menerbitkan kode pendaftaran | — | Ya | — | Ya |
| Memesan antrean dan melihat tiket sendiri | Ya | — | — | — |
| Melihat seluruh antrean berjalan | — | Ya | Ya | Ya |
| Memanggil, melayani, menandai tidak hadir | — | Ya | — | — |
| Mengatur layanan, slot, kuota, registri | — | Ya | — | Ya |
| Menyetujui perubahan registri | — | — | Ya | Ya |
| Memverifikasi rantai audit | — | — | Ya | Ya |
| Menyediakan akun berperan khusus | — | — | — | Ya |

Peran tidak dipilih pengguna pada antarmuka, melainkan ditetapkan peladen dan ditegakkan pada setiap
endpoint.

## 5. Alur Pengguna

**Pendaftaran perangkat.** Warga datang sekali ke kantor desa. Operator memeriksa kartu identitas secara
fisik lalu menerbitkan kode pendaftaran sekali pakai berformat `XXXX-XXXX`. Warga memasukkan kode;
aplikasi membangkitkan pasangan kunci dan menyusun bukti penguasaan kunci atas kode tersebut. Peladen
memverifikasi, membuat akun, dan mendaftarkan daun warga pada registri. Kode berlaku 30 menit dan hangus
setelah dipakai.

**Masuk aplikasi.** Tanpa kata sandi. Perangkat meminta nonce, menyusun bukti-pengetahuan atasnya, lalu
peladen memverifikasi terhadap kunci publik terdaftar dan menerbitkan token sesi. Dari sudut pandang
warga, aplikasi langsung terbuka.

**Memesan antrean.** Warga memilih jenis layanan dan tanggal. Aplikasi meminta nonce kelayakan, menyusun
bukti kelayakan, lalu mengirim permohonan. Peladen memverifikasi bukti, menandai nonce terpakai,
memeriksa kuota, dan menerbitkan nomor antrean.

**Hari pelayanan.** Warga memantau nomor berjalan dan posisi giliran, menerima notifikasi saat giliran
mendekat, melakukan check-in setibanya di kantor, lalu dilayani tatap muka. Operator memanggil nomor
berikutnya, menandai dilayani, atau menandai tidak hadir bila warga tidak muncul.

## 6. Kebutuhan Fungsional

| Modul | Kebutuhan pokok |
|---|---|
| Pendaftaran perangkat | Kode sekali pakai terbit setelah verifikasi identitas fisik; 8 karakter dari alfabet 31 karakter (entropi sekitar 40 bit); berlaku 30 menit; disimpan sebagai hash; klaim menyertakan bukti penguasaan kunci; akun dibuat hanya saat klaim berhasil; kegagalan mengembalikan pesan seragam; dibatasi 10 permintaan per menit |
| Autentikasi | Pembuktian kepemilikan kunci tanpa kata sandi dan tanpa NIK; nonce sekali pakai berlaku 5 menit; bukti dari kunci lain ditolak; akun tidak aktif ditolak; token sesi berlaku 30 menit; dibatasi 15 permintaan per menit |
| Registri penduduk | Registri berupa pohon Merkle; daun dibentuk dari kunci publik dan atribut; perubahan diajukan operator dan memerlukan persetujuan; versi akar tersimpan; warga dapat mengambil jalur keanggotaannya; seluruh perubahan tercatat pada audit |
| Verifikasi kelayakan | Pemesanan hanya setelah bukti terverifikasi; bukti memuat keanggotaan registri dan penguasaan kunci; terikat konteks berisi akun, jenis layanan, dan nonce; NIK tidak pernah ikut; bukan-anggota, peniru, atribut yang diubah, dan bukti yang dikirim ulang ditolak |
| Layanan, slot, dan kuota | Jenis layanan beserta perkiraan durasi; jam layanan dan hari libur; kuota harian; pemesanan di luar kuota atau jam layanan ditolak; slot bentrok ditolak; perubahan jadwal memicu pemberitahuan |
| Pemesanan dan antrean | Nomor antrean unik per tanggal dan jenis layanan; penerbitan berurutan dan bebas nomor ganda; warga dapat membatalkan sebelum dipanggil; jumlah tiket aktif per warga dibatasi |
| Papan antrean operator | Daftar tiket hari berjalan; panggil berikutnya; tandai dilayani, tidak hadir, atau lewati; panggil ulang; setiap transisi tercatat beserta pelaku dan waktu |
| Status dan notifikasi | Nomor berjalan, posisi giliran, dan estimasi tunggu; notifikasi giliran mendekat dan perubahan jadwal; muatan generik tanpa data pribadi; token perangkat didaftarkan saat masuk dan dicabut saat keluar; kegagalan notifikasi tidak menggagalkan transaksi |
| Check-in dan riwayat | Penandaan kehadiran hanya untuk tiket terkonfirmasi; riwayat tiket bagi warga; rekapitulasi per jenis layanan dan periode bagi operator |
| Audit dan administrasi | Aksi sensitif tercatat pada jejak yang hanya bisa ditambah; setiap entri mengikat hash entri sebelumnya; verifikasi rantai bagi Kepala Desa dan Administrator; seluruh badan permintaan divalidasi terhadap skema |

## 7. Kebutuhan Nonfungsional

| Aspek | Ketentuan pokok |
|---|---|
| Keamanan | Identitas ditegakkan melalui penguasaan kunci; seluruh bukti terikat konteks ber-nonce sekali pakai; kendali akses peran pada setiap endpoint; pembatasan laju 120 permintaan per menit global dan 15 per menit pada autentikasi; validasi masukan berbasis skema; rahasia hanya pada berkas lingkungan; pesan galat tidak membocorkan penyebab; perbandingan nilai rahasia dalam waktu tetap |
| Privasi | NIK tidak pernah dikirim maupun disimpan mentah; hanya komitmennya tersimpan; bukti hanya mengungkap kunci publik dan atribut kasar; muatan notifikasi bebas data pribadi |
| Kinerja | Pembentukan bukti selesai dalam hitungan detik pada telepon kelas menengah; verifikasi tidak menghambat beban puncak; ukuran bukti di bawah satu kilobita |
| Keandalan | Kegagalan notifikasi tidak menggagalkan pemesanan; penerbitan nomor bersifat atomik; kegagalan jaringan ditangani anggun; migrasi basis data terkendali dan dapat diulang |
| Keterpakaian | Berbahasa Indonesia dengan istilah lazim; mengikuti panduan Material 3; sasaran sentuh dan kontras memadai bagi pengguna lanjut usia; istilah kriptografis tidak ditampilkan kepada warga |
| Pemeliharaan | Seluruh operasi kriptografis melewati satu pustaka; format wire seragam antarbahasa; pengujian otomatis dijalankan pada setiap perubahan |

## 8. Arsitektur Sistem

Sistem terdiri atas aplikasi seluler yang dipegang warga dan petugas, peladen layanan yang menjalankan
logika bisnis dan verifikasi kriptografis, serta basis data. Di samping ketiganya terdapat pustaka
kriptografi sebagai paket tersendiri yang menjadi satu-satunya sumber operasi kriptografis, sehingga
seluruh kripto dapat diaudit di satu tempat dan tidak ada komponen yang menggulung primitifnya sendiri.

| Paket | Isi | Tanggung jawab |
|---|---|---|
| `packages/crypto` | Pustaka `@sidesa/crypto` (TypeScript) | Hash berpemisah domain, pohon Merkle, bukti Schnorr, bukti kelayakan |
| `packages/backend` | Peladen NestJS, Prisma, PostgreSQL | Autentikasi, kendali akses, registri, antrean, notifikasi, audit, validasi, pembatasan laju |
| `packages/app` | Aplikasi Flutter (Material 3) | Antarmuka warga dan petugas, penyimpanan kunci, pembentukan bukti, notifikasi |

Batas kepercayaan memisahkan perangkat dari peladen: seluruh masukan dari perangkat diperlakukan sebagai
tidak tepercaya dan dikendalikan melalui verifikasi bukti kriptografis, validasi skema, kendali peran,
dan pembatasan laju. Kunci privat warga tidak pernah meninggalkan perangkat; yang melintasi jaringan
hanya bukti dan kunci publik. Perubahan status memancarkan peristiwa domain yang ditangkap pendengar
terpisah untuk diterjemahkan menjadi notifikasi, sehingga kegagalan notifikasi tidak menjalar ke
transaksi layanan.

## 9. Implementasi Kriptografi

### 9.1 Primitif dan Pemisahan Domain

| Kegunaan | Primitif |
|---|---|
| Grup kurva eliptik | Kurva NIST P-384 (secp384r1) |
| Fungsi hash | SHA-384 |
| Bukti pengetahuan | Schnorr non-interaktif (Fiat-Shamir) |
| Akumulator keanggotaan | Pohon Merkle biner dengan penandaan ranah |
| Enkripsi data saat diam | AES-256 |

Kurva P-256 dan SHA-256 sebagai fungsi hash mandiri tidak dipakai. Setiap pencernaan hash diberi penanda
ranah, dengan masukan biner diberi awalan panjang 32-bit sehingga perangkaian tak ambigu. Ranah yang
dipakai: `SIDESA-schnorr-v1` (tantangan bukti), `SIDESA-resident-leaf-v1` (daun registri),
`SIDESA-auth-v1`, `SIDESA-enroll-v1`, `SIDESA-eligibility-v1` (konteks tiap gerbang), `SIDESA-audit-v1`
(rantai audit), serta bita penanda 0x00 dan 0x01 untuk memisahkan daun dan simpul Merkle.

Representasi wire: kunci publik dan komitmen berupa titik terkompresi 49 bita, skalar respons 48 bita,
nilai hash 48 bita. Format ini seragam antara aplikasi Dart dan peladen TypeScript.

### 9.2 Skema Bukti-Pengetahuan Schnorr

Perangkat memegang skalar rahasia x dan kunci publik X = x·G. Untuk membuktikan penguasaan x terhadap
konteks c tanpa mengungkapkannya:

1. bangkitkan skalar acak k secara kriptografis;
2. hitung komitmen R = k·G;
3. hitung tantangan e = Hd(`SIDESA-schnorr-v1`, X, R, c) mod n;
4. hitung respons s = k + e·x mod n;
5. kirim bukti berupa pasangan (R, s).

Pemverifikasi menerima bila dan hanya bila s·G = R + e·X. Nilai di luar rentang sah, titik yang tidak
berada pada kurva, dan tantangan bernilai nol ditolak. Skalar k tidak pernah digunakan ulang karena
penggunaan ulang akan membocorkan x.

Skema ini memberikan **kelengkapan** (pemegang x yang jujur selalu diterima), **kekukuhan** (pihak tanpa
x tidak dapat menghasilkan bukti yang diterima kecuali dengan probabilitas yang dapat diabaikan),
**tanpa-pengetahuan** (bukti tidak mengungkap informasi mengenai x), serta **keterikatan konteks** karena
tantangan memuat c.

### 9.3 Tiga Gerbang

| Gerbang | Konteks yang dibuktikan | Fungsi |
|---|---|---|
| Autentikasi | `SIDESA-auth-v1‖akun‖nonce` | Membuktikan penguasaan kunci terdaftar untuk memperoleh sesi |
| Pendaftaran perangkat | `SIDESA-enroll-v1‖kode‖kunci publik` | Mencegah pendaftaran kunci milik orang lain yang akan mengunci korban secara permanen |
| Kelayakan pemesanan | `SIDESA-eligibility-v1‖akun‖jenis layanan‖nonce` | Membuktikan hak atas layanan tanpa mengungkap data kependudukan |

### 9.4 Registri Merkle dan Bukti Kelayakan

Registri penduduk adalah pohon Merkle biner. Daun dibentuk dari kunci publik dan atribut kelayakan
melalui hash berpemisah domain; simpul dalam memakai penanda ranah berbeda sehingga aman dari serangan
pra-citra kedua yang memanfaatkan kerancuan daun dan simpul. Ukuran jalur keanggotaan tumbuh logaritmik:
sepuluh langkah untuk registri 1.024 penduduk.

Bukti kelayakan memuat kunci publik, atribut, jalur Merkle, dan bukti Schnorr atas konteks. Peladen
memverifikasi dengan menghitung daun, memeriksa jalur terhadap akar registri yang berlaku, memeriksa
bukti Schnorr, lalu menolak bila nonce tidak dikenal, terpakai, kedaluwarsa, atau bukan milik pemohon.
Nonce ditandai terpakai pada operasi yang sama dengan verifikasi.

| Serangan | Mengapa gagal |
|---|---|
| Bukan penduduk terdaftar memesan | Daunnya tidak berada di bawah akar registri |
| Penyerang menyalin kunci publik warga lain | Tidak dapat menyusun bukti Schnorr tanpa kunci privat |
| Bukti yang tertangkap dikirim ulang | Nonce sudah ditandai terpakai |
| Bukti dipakai untuk jenis layanan lain | Konteks berbeda menghasilkan tantangan berbeda |
| Atribut diubah setelah bukti dibentuk | Nilai daun berubah, keanggotaan Merkle terputus |

### 9.5 Rantai Audit dan Penyimpanan Kunci

Setiap aksi sensitif dicatat sebagai entri yang mengikat hash entri sebelumnya, sehingga penyuntingan
atau penghapusan satu entri memutus rantai pada seluruh entri sesudahnya dan terdeteksi saat rantai
dihitung ulang. Sifat yang diperoleh adalah tamper-evident: perubahan riwayat menjadi kejadian yang
terdeteksi, bukan sesuatu yang harus dipercaya tidak terjadi.

Kunci privat dibangkitkan pada perangkat dan disimpan pada penyimpanan aman sistem operasi. Perlu
dinyatakan terbuka bahwa skema Schnorr menuntut akses langsung ke skalar privat, sedangkan elemen aman
berbasis perangkat keras tidak pernah mengeksposnya kepada aplikasi. Karena itu kunci identitas berada
pada penyimpanan yang dapat diakses aplikasi, bukan terisolasi di dalam elemen aman. Konsekuensinya
proporsional dengan model ancaman produk: kunci yang dicuri hanya memungkinkan pemesanan antrean atas
nama korban — gangguan yang dapat dipulihkan melalui pencabutan dan pendaftaran ulang — dan tidak
memungkinkan pemalsuan dokumen resmi, karena produk ini memang tidak menerbitkan dokumen.

## 10. Model Data dan Antarmuka

### 10.1 Entitas Pokok

Akun (peran, status, kunci publik unik, komitmen NIK, atribut, indeks daun); versi registri (nomor
versi, akar, penanda aktif); tantangan autentikasi dan tantangan kelayakan (nonce, akun, kedaluwarsa,
penanda pemakaian); kode pendaftaran (hash kode, identitas melekat, kedaluwarsa); jenis layanan; jadwal
dan kuota; tiket antrean; token perangkat untuk notifikasi; serta entri audit berantai-hash.

### 10.2 Status Tiket Antrean

| Status | Makna | Transisi sah |
|---|---|---|
| `WAITING` | Tiket terbit dan menunggu giliran | ke `CALLED` oleh operator; ke `CANCELLED` |
| `CALLED` | Nomor sedang dipanggil | ke `SERVED` atau `NO_SHOW` |
| `SERVED` | Warga telah dilayani | status akhir |
| `NO_SHOW` | Warga tidak hadir saat dipanggil | ke `CALLED` bila dipanggil ulang |
| `CANCELLED` | Pemesanan dibatalkan | status akhir |

Setiap transisi dicatat beserta waktu dan pelakunya, dan hanya dapat dilakukan peran yang berwenang.
Perubahan skema basis data dijalankan non-interaktif melalui berkas SQL bernomor waktu yang tersimpan
pada repositori.

### 10.3 Peta Layar

| Peran | Layar |
|---|---|
| Warga | Pendaftaran perangkat; beranda berisi tiket aktif dan posisi giliran; pilih layanan; pilih jadwal; konfirmasi tiket; riwayat; profil |
| Operator | Papan antrean; terbitkan kode pendaftaran; pengaturan jadwal dan kuota; pengelolaan registri; rekapitulasi |
| Kepala Desa | Agenda harian dan ringkasan antrean; verifikasi rantai audit |

Antarmuka menyembunyikan kompleksitas kriptografis: warga hanya melihat "mendaftar", "masuk", dan "pesan
antrean", tanpa istilah kunci, bukti, atau nonce.

## 11. Penerapan Secure SDLC

### 11.1 Kerangka

Microsoft SDL dipakai sebagai kerangka utama karena berbasis fase dan selaras dengan alur kerja proyek.
NIST SSDF dipakai sebagai pelengkap karena lazim dirujuk pada konteks pemerintahan. PASTA dipakai untuk
merumuskan kebutuhan keamanan karena digerakkan objektif dan kepatuhan, dengan STRIDE mengisi tahap
analisis ancamannya. OWASP SAMM tidak dipakai karena penilaian kematangan organisasi berada di luar
cakupan kegiatan pengabdian dengan tim kecil.

### 11.2 PASTA dan Ancaman STRIDE

Tahap pertama sampai keempat PASTA terpenuhi: perumusan objektif dan kewajiban regulasi, penetapan
cakupan teknis dan batas kepercayaan, dekomposisi aktor dan titik masuk, serta analisis ancaman memakai
STRIDE. Tahap kelima hingga ketujuh dinyatakan parsial secara jujur karena analisis kerentanan yang utuh
menuntut uji penetrasi, pemodelan serangan menuntut pohon serangan formal, dan analisis risiko
kuantitatif menuntut data frekuensi kejadian yang belum tersedia bagi layanan yang belum beroperasi.

| Kategori | Ancaman | Mitigasi dan pengujiannya |
|---|---|---|
| Spoofing | Pemalsuan identitas warga | Pembuktian kepemilikan kunci; bukti dari kunci lain ditolak |
| Spoofing | Pendaftaran kunci milik orang lain | Bukti penguasaan kunci saat klaim kode; klaim dengan kunci berbeda ditolak |
| Tampering | Manipulasi status tiket atau atribut | Kendali akses per endpoint; atribut terikat daun registri sehingga perubahannya memutus keanggotaan |
| Repudiation | Penyangkalan tindakan petugas | Jejak audit berantai-hash; perubahan satu entri membuat verifikasi gagal |
| Information disclosure | Kebocoran data kependudukan | Komitmen NIK, bukan NIK mentah; muatan notifikasi generik |
| Denial of service | Pembanjiran permintaan | Pembatasan laju dan kuota harian |
| Elevation of privilege | Warga menjalankan aksi operator | Kendali akses berbasis peran; permintaan lintas peran ditolak |
| Replay | Penggunaan ulang bukti | Konteks ber-nonce sekali pakai; pengiriman ulang ditolak |

### 11.3 Fase Microsoft SDL

**Training:** pendalaman bukti-pengetahuan Schnorr, pohon Merkle, minimalisasi data, ketentuan algoritma,
serta PASTA dan STRIDE. **Requirements:** kebutuhan fungsional dan keamanan dirumuskan eksplisit beserta
kriteria sukses terukur. **Design:** pemodelan ancaman, autentikasi kepemilikan kunci, komitmen NIK,
registri Merkle, kendali akses empat peran, jejak audit, pemisahan tugas pada perubahan registri.
**Implementation:** pengembangan berbasis pengujian, primitif dari pustaka teraudit, pemisahan domain
menyeluruh, validasi masukan, pengelolaan rahasia, pemisahan jalur notifikasi dari logika bisnis.
**Verification:** pengujian negatif dan kekukuhan, uji interoperabilitas lintas bahasa, verifikasi
menyeluruh pada perangkat dengan pemeriksaan keadaan basis data pada setiap transisi. **Release:**
migrasi terkendali, pembatasan laju, penerapan TLS saat penggelaran. **Response:** jejak audit
tamper-evident yang dapat diverifikasi ulang serta rancangan pencabutan kunci.

### 11.4 Praktik dan Strategi Pengujian

Kode ditulis per tugas dengan peninjauan manusia pada setiap selisih perubahan. Test-Driven Development
diperlakukan sebagai jaring pengaman wajib. Satu kebijakan ditegakkan ketat: **larangan melemahkan
pengujian negatif** demi membuat rangkaian pengujian berwarna hijau — pengujian kriptografi yang gagal
diperlakukan sebagai indikasi kesalahan yang harus ditelusuri sampai akarnya.

| Lapis | Contoh pengujian negatif |
|---|---|
| Pustaka kriptografi | Bukti tanpa penguasaan rahasia ditolak; bukti pada konteks berbeda ditolak; bukan-anggota registri ditolak; atribut yang diubah memutus keanggotaan |
| Peladen | Nonce terpakai ditolak; klaim kode kedua ditolak; permintaan lintas peran ditolak; entri audit yang diubah membuat rantai gagal |
| Interoperabilitas | Bukti buatan Dart diverifikasi peladen TypeScript |
| Perangkat nyata | Siklus penuh dengan pemeriksaan keadaan basis data pada tiap transisi |

## 12. Kepatuhan dan Regulasi

| Dasar | Penerapan pada produk |
|---|---|
| Ketentuan algoritma kriptografi bagi instansi (Kepka BSSN Nomor 443 Tahun 2025) | Kurva P-384 dan fungsi hash SHA-384 pada seluruh konstruksi; AES-256 untuk data saat diam; P-256 dan SHA-256 mandiri tidak dipakai |
| Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi | NIK tidak dikirim maupun disimpan mentah; hanya komitmennya tersimpan; bukti kelayakan tidak memuat data kependudukan; muatan notifikasi bebas data pribadi |
| Undang-Undang Informasi dan Transaksi Elektronik | Tidak relevan bagi produk ini karena aplikasi tidak menerbitkan tanda tangan elektronik; dokumen ditandatangani tatap muka |

Karena aplikasi tidak memproduksi tanda tangan elektronik, kepatuhan algoritma diposisikan pada
konstruksi kriptografis yang dipakai, yakni bukti-pengetahuan dan akumulator keanggotaan di atas kurva
P-384 dengan fungsi hash SHA-384. Posisi ini perlu dikonfirmasi kepada pembimbing (Risiko R-1).

## 13. Risiko dan Mitigasi

| ID | Risiko | Mitigasi |
|---|---|---|
| R-1 | Posisi kepatuhan algoritma pada sistem tanpa tanda tangan dinilai belum jelas | Dokumentasikan konstruksi beserta parameternya; konfirmasikan kepada pembimbing |
| R-2 | Kunci identitas tidak terisolasi pada elemen aman perangkat keras | Model ancaman terbatas pada gangguan pemesanan; kunci pada penyimpanan aman sistem; sediakan jalur pencabutan dan pendaftaran ulang |
| R-3 | Pemesanan dari akun sama dapat ditautkan | Konsisten dengan pilihan rancangan; kredensial anonim sebagai pekerjaan lanjutan |
| R-4 | Literasi digital warga rendah sehingga adopsi lambat | Antarmuka sederhana; pendampingan operator; pelatihan lapangan |
| R-5 | Ketergantungan pada penyedia notifikasi pihak ketiga | Muatan minimal; kegagalan notifikasi tidak menggagalkan layanan |
| R-6 | Perangkat warga hilang atau berpindah tangan | Pencabutan kunci melalui operator; pendaftaran ulang menuntut verifikasi identitas fisik |
| R-7 | Keterbatasan jaringan di wilayah desa | Ukuran bukti dijaga di bawah satu kilobita; kegagalan jaringan ditangani anggun |

## 14. Status, Peta Jalan, dan Kriteria Penerimaan

### 14.1 Status Saat Ini

Telah terbangun dan teruji: pustaka kriptografi beserta pohon Merkle, hash berpemisah domain, dan modul
bukti-pengetahuan Schnorr; peladen dengan autentikasi, kendali akses empat peran, registri, pendaftaran
perangkat berbasis kode operator dengan bukti penguasaan kunci, jejak audit berantai-hash yang
terverifikasi, pembatasan laju, dan validasi masukan; subsistem notifikasi dengan lapisan abstraksi
pengirim dan muatan minimal; serta aplikasi Flutter dengan alur pendaftaran, masuk, dan pemesanan janji
temu dasar. Sedang dan akan dikerjakan: penyatuan seluruh gerbang kriptografis pada satu primitif
bukti-pengetahuan Schnorr, serta pembangunan subsistem antrean secara penuh.

### 14.2 Peta Jalan

| Tahap | Lingkup |
|---|---|
| 1 | Penyatuan kripto pada bukti-pengetahuan Schnorr untuk ketiga gerbang beserta padanan lintas bahasa |
| 2 | Subsistem antrean: jenis layanan, jadwal dan kuota, tiket dan nomor antrean, papan operator |
| 3 | Status berjalan, estimasi tunggu, check-in, riwayat dan rekapitulasi |
| 4 | Penyambungan notifikasi antrean pada infrastruktur notifikasi |
| 5 | Pengerasan rilis: TLS, pencabutan kunci, prosedur tata kelola |
| 6 | Uji lapangan bersama perangkat desa, pelatihan, dan serah terima |

### 14.3 Kriteria Penerimaan

Produk dinyatakan memenuhi syarat apabila: warga yang belum terdaftar tidak dapat memesan dan
penolakannya terbukti pada pengujian; warga terdaftar dapat memesan tanpa pernah mengirimkan NIK; bukti
yang ditangkap dan dikirim ulang ditolak; pihak tanpa kunci privat tidak dapat memesan atas nama warga
lain; klaim ganda atas satu kode pendaftaran ditolak; operator dapat menjalankan satu hari pelayanan
penuh; warga menerima pemberitahuan tanpa data pribadi pada muatannya; perubahan satu entri audit
terdeteksi; permintaan lintas peran ditolak; serta seluruh rangkaian pengujian otomatis berwarna hijau
tanpa satu pun pengujian negatif yang dilemahkan.
