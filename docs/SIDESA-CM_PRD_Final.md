# SIDESA-CM — Product Requirements Document

**Produk:** SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara
**Versi dokumen:** 1.0 (FINAL)
**Tanggal:** 2026-07-26
**Penyusun:** Muhammad Ezra Dhiatara — D4 Rekayasa Kriptografi, Politeknik Siber dan Sandi Negara
**Mitra:** Pemerintah Desa Cibeteung Muara, Kecamatan Ciseeng, Kabupaten Bogor
**Konteks kegiatan:** Pengabdian kepada Masyarakat (ABDIMAS) Politeknik Siber dan Sandi Negara
**Kerangka keamanan:** Microsoft SDL · NIST SSDF SP 800-218 · PASTA · STRIDE
**Inti kriptografi:** Zero-Knowledge Proof (Schnorr NIZK) + Pohon Merkle
**Status:** Final

> Dokumen ini adalah rujukan tunggal dan menyeluruh atas produk SIDESA-CM. Dokumen memuat pernyataan
> masalah, ruang lingkup, kebutuhan fungsional dan nonfungsional, arsitektur sistem, rancangan dan
> implementasi kriptografi, model data, antarmuka program aplikasi, antarmuka pengguna, penerapan Secure
> Software Development Lifecycle, kepatuhan regulasi, aspek operasional, risiko, serta kriteria
> penerimaan.

---

## 1. Ringkasan Eksekutif

SIDESA-CM adalah aplikasi layanan warga Desa Cibeteung Muara yang menyediakan **penjadwalan janji temu
dan nomor antrean** untuk keperluan yang mengharuskan pertemuan langsung dengan Kepala Desa atau
perangkat desa. Aplikasi menjawab satu masalah konkret: warga harus datang ke kantor desa tanpa kepastian
kapan akan dilayani, sehingga waktu terbuang, antrean menumpuk pada jam tertentu, dan sebagian warga
pulang tanpa terlayani.

Aplikasi memberi kepastian melalui tiga hal: warga memperoleh **nomor antrean atau slot waktu sebelum
berangkat**, dapat **memantau posisi giliran secara langsung**, dan menerima **pemberitahuan otomatis**
ketika gilirannya mendekat. Penandatanganan dan penyerahan dokumen tetap dilakukan secara tatap muka;
aplikasi berperan sebagai pengatur alur layanan, bukan penerbit dokumen.

Nilai kriptografis produk terletak pada **verifikasi kelayakan yang menjaga privasi**. Sebelum warga
dapat memesan antrean, ia harus membuktikan bahwa dirinya penduduk terdaftar Desa Cibeteung Muara yang
berhak atas layanan tersebut — namun pembuktian itu dilakukan **tanpa mengirimkan Nomor Induk
Kependudukan (NIK)** ke peladen. Pembuktian memakai **bukti-pengetahuan Schnorr non-interaktif (ZKP)**
yang dipadukan dengan **bukti keanggotaan pohon Merkle** atas registri penduduk. Nomor Induk
Kependudukan diperiksa satu kali secara fisik saat pendaftaran perangkat, lalu tidak pernah
didigitalkan; peladen hanya menyimpan komitmennya berupa nilai hash.

Keamanan tidak ditambalkan di akhir pengembangan. Seluruh siklus pengembangan mengikuti **Secure
Software Development Lifecycle** dengan Microsoft SDL sebagai kerangka fase, NIST SSDF sebagai rujukan
praktik, serta PASTA dan STRIDE sebagai metode perumusan kebutuhan keamanan dan pemodelan ancaman.
Perincian penerapannya disajikan pada Bagian 14.

## 2. Latar Belakang dan Pernyataan Masalah

### 2.1 Konteks Desa

Desa Cibeteung Muara berada di Kecamatan Ciseeng, Kabupaten Bogor. Kantor desa melayani berbagai
keperluan warga yang menuntut kehadiran atau persetujuan Kepala Desa: konsultasi, pengaduan, permohonan
yang perlu penjelasan langsung, serta penandatanganan dokumen. Jam layanan terbatas, jumlah petugas
terbatas, dan agenda Kepala Desa tidak selalu pasti karena tugas luar kantor.

### 2.2 Masalah dari Sisi Warga

Warga tidak memiliki cara mengetahui kapan ia akan dilayani. Konsekuensinya:

- Warga datang pagi-pagi dan menunggu berjam-jam tanpa kepastian.
- Warga yang datang pada jam padat berisiko tidak terlayani dan harus kembali keesokan hari.
- Warga yang bekerja harus mengambil cuti atau meninggalkan pekerjaan tanpa jaminan urusannya selesai.
- Warga yang berjarak jauh dari kantor desa menanggung biaya dan waktu perjalanan berulang.

### 2.3 Masalah dari Sisi Perangkat Desa

- Antrean tidak terkelola; kedatangan menumpuk pada jam tertentu dan lengang pada jam lain.
- Petugas kesulitan memperkirakan beban harian dan mengatur ketersediaan Kepala Desa.
- Tidak tersedia data mengenai jenis keperluan yang paling sering diajukan, sehingga perencanaan layanan
  bersifat perkiraan.
- Urutan pelayanan bergantung pada catatan manual sehingga rawan sengketa "siapa lebih dulu".

### 2.4 Mengapa Verifikasi Kelayakan Memerlukan Kriptografi

Layanan desa hanya diperuntukkan bagi penduduk terdaftar. Cara paling sederhana untuk memeriksanya
adalah meminta NIK pada saat pemesanan, lalu mencocokkannya dengan basis data kependudukan. Cara ini
menimbulkan dua persoalan. Pertama, NIK adalah data pribadi yang dilindungi Undang-Undang Nomor 27 Tahun
2022 tentang Pelindungan Data Pribadi; menyimpannya dalam basis data aplikasi menciptakan kewajiban dan
risiko kebocoran yang besar dibandingkan manfaatnya. Kedua, NIK bersifat semipublik — tercetak pada
kartu identitas dan sering difotokopi — sehingga pengetahuan atas NIK bukan bukti bahwa seseorang adalah
pemiliknya.

Oleh karena itu kelayakan dibuktikan secara kriptografis: warga membuktikan **keanggotaannya pada
registri penduduk** sekaligus **penguasaannya atas kunci yang terdaftar** pada registri tersebut, tanpa
mengungkap data kependudukan apa pun. Inilah peran zero-knowledge proof dalam produk ini.

## 3. Tujuan Produk dan Metrik Keberhasilan

### 3.1 Tujuan

| Kode | Tujuan |
|---|---|
| G-1 | Memberi warga kepastian giliran sebelum berangkat ke kantor desa |
| G-2 | Meratakan beban kedatangan sehingga pelayanan tidak menumpuk pada jam tertentu |
| G-3 | Menegakkan bahwa hanya penduduk terdaftar yang dapat memesan layanan |
| G-4 | Menjamin data kependudukan warga tidak terkumpul di peladen aplikasi |
| G-5 | Menyediakan jejak pelayanan yang tidak dapat disunting diam-diam |
| G-6 | Menghasilkan data kebutuhan layanan sebagai dasar perencanaan perangkat desa |

### 3.2 Metrik Keberhasilan

| Tujuan | Metrik | Cara ukur |
|---|---|---|
| G-1 | Warga memperoleh nomor antrean atau slot sebelum datang; estimasi waktu tunggu tersedia | Fungsi tersedia dan dipakai pada uji lapangan |
| G-2 | Sebaran kedatangan antar jam layanan lebih merata | Perbandingan distribusi tiket per jam sebelum dan sesudah penerapan |
| G-3 | Pemesanan oleh pihak di luar registri ditolak sistem | Pengujian negatif otomatis dan uji lapangan |
| G-4 | Tidak ada satu pun NIK mentah tersimpan pada basis data | Inspeksi skema dan pengujian otomatis atas muatan permohonan |
| G-5 | Perubahan satu entri jejak audit terdeteksi pada verifikasi rantai | Pengujian otomatis rantai audit |
| G-6 | Tersedia rekapitulasi jumlah tiket per jenis layanan dan per periode | Fitur laporan operator |

### 3.3 Bukan Tujuan

Produk ini secara sengaja **tidak** dimaksudkan untuk: menerbitkan atau menandatangani dokumen resmi
secara digital; menggantikan pertemuan tatap muka; menyediakan anonimitas penuh bagi pemesan; menjadi
sistem kependudukan atau replika basis data kependudukan nasional; maupun menangani pembayaran atau
retribusi.

## 4. Ruang Lingkup

### 4.1 Termasuk dalam Cakupan

Pendaftaran perangkat warga dengan verifikasi identitas fisik oleh petugas; autentikasi berbasis
pembuktian kepemilikan kunci; registri penduduk berbasis pohon Merkle; verifikasi kelayakan berbasis
zero-knowledge proof; pengelolaan jenis layanan, slot, dan kuota harian; pemesanan janji temu dan
penerbitan nomor antrean; papan antrean bagi operator; pemantauan status antrean dan estimasi giliran
bagi warga; check-in kehadiran; notifikasi push; riwayat dan rekapitulasi; jejak audit berantai-hash;
serta administrasi peran dan konfigurasi.

### 4.2 Di Luar Cakupan

Penerbitan dan penandatanganan dokumen digital; pembuatan berkas PDF dan kode QR dokumen; halaman
verifikasi publik dokumen; integrasi dengan Penyelenggara Sertifikasi Elektronik; anonimitas penuh yang
tidak dapat ditautkan antarpemesanan; penyimpanan kunci identitas pada elemen aman perangkat keras
dengan gerbang biometrik pada operasi kriptografis; pembayaran daring; serta integrasi langsung dengan
sistem kependudukan nasional.

## 5. Pengguna dan Peran

### 5.1 Persona

**Warga (WARGA).** Penduduk Desa Cibeteung Muara yang telah terdaftar pada registri. Umumnya memakai
telepon Android kelas menengah ke bawah, dengan literasi digital beragam. Kebutuhannya sederhana:
mengetahui kapan harus datang dan tidak menunggu lama. Antarmuka harus ringkas, berbahasa Indonesia,
dan tidak menuntut pemahaman teknis apa pun.

**Operator (OPERATOR).** Petugas kantor desa yang menjalankan layanan sehari-hari. Bertanggung jawab
memverifikasi kartu identitas warga pada saat pendaftaran perangkat, menerbitkan kode pendaftaran,
mengelola slot dan kuota, serta menjalankan papan antrean. Menggunakan aplikasi sepanjang jam layanan
sehingga alur kerjanya harus cepat dan minim langkah.

**Kepala Desa (KADES).** Pemilik agenda pertemuan. Memerlukan gambaran ringkas mengenai agenda harian,
jumlah warga yang menunggu, dan jenis keperluan yang akan dihadapi. Tidak memegang kunci privat untuk
menandatangani apa pun di dalam aplikasi.

**Administrator (ADMIN).** Pengelola teknis sistem. Menangani konfigurasi, penyediaan akun berperan
khusus, serta pemeriksaan jejak audit. Peran ini dipegang oleh pihak yang menjalankan sistem, dan
kewenangannya dibatasi serta tercatat.

### 5.2 Matriks Hak Akses

| Kemampuan | WARGA | OPERATOR | KADES | ADMIN |
|---|---|---|---|---|
| Mendaftarkan perangkat dengan kode | Ya | — | — | — |
| Menerbitkan kode pendaftaran | — | Ya | — | Ya |
| Memesan janji temu / antrean | Ya | — | — | — |
| Melihat antrean sendiri | Ya | — | — | — |
| Melihat seluruh antrean berjalan | — | Ya | Ya | Ya |
| Memanggil, melayani, menandai tidak hadir | — | Ya | — | — |
| Mengatur jenis layanan, slot, kuota | — | Ya | — | Ya |
| Mengubah registri penduduk | — | Ya | — | Ya |
| Menyetujui perubahan registri | — | — | Ya | Ya |
| Melihat agenda dan rekapitulasi | — | Ya | Ya | Ya |
| Memverifikasi rantai audit | — | — | Ya | Ya |
| Menyediakan akun berperan khusus | — | — | — | Ya |

Peran tidak dipilih pengguna pada antarmuka, melainkan ditetapkan peladen berdasarkan akun yang
terautentikasi, dan ditegakkan pada setiap endpoint melalui penjaga peran.

## 6. Alur Pengguna End-to-End

### 6.1 Pendaftaran Perangkat

Warga mendatangi kantor desa satu kali untuk mendaftar. Operator memeriksa kartu identitas secara fisik,
memasukkan nama dan atribut kelayakan warga, lalu sistem menerbitkan **kode pendaftaran sekali pakai**
berformat empat karakter, tanda hubung, empat karakter (contoh: `K7QP-3MRT`). Operator membacakan kode
tersebut kepada warga. Pada perangkatnya, warga memasukkan kode; aplikasi membangkitkan pasangan kunci,
menyusun bukti-pengetahuan atas kode dan kunci publiknya, lalu mengirimkannya. Peladen memverifikasi
bukti, membuat akun, mengikat akun kepada kunci publik warga, dan mendaftarkan daun warga pada registri
penduduk. Kode berlaku 30 menit dan hangus setelah dipakai.

### 6.2 Masuk Aplikasi

Warga tidak memakai kata sandi. Ketika aplikasi dibuka, perangkat meminta tantangan berupa nilai acak
sekali pakai kepada peladen, menyusun bukti-pengetahuan atas tantangan tersebut, lalu mengirimkannya.
Peladen memverifikasi bukti terhadap kunci publik terdaftar dan menerbitkan token sesi. Dari sudut
pandang warga, aplikasi "langsung terbuka" tanpa langkah tambahan.

### 6.3 Memesan Antrean

Warga memilih jenis layanan dan tanggal. Aplikasi meminta nonce kelayakan kepada peladen, menyusun
**bukti kelayakan** (keanggotaan registri ditambah bukti penguasaan kunci yang terikat pada permohonan
ini), lalu mengirimkan permohonan pemesanan beserta buktinya. Peladen memverifikasi bukti, menandai
nonce terpakai, memeriksa kuota, lalu menerbitkan **nomor antrean** dan/atau slot waktu. Warga menerima
konfirmasi berisi nomor, tanggal, dan perkiraan waktu.

### 6.4 Hari Pelayanan

Warga memantau nomor yang sedang dilayani dan posisi gilirannya melalui aplikasi. Ketika giliran
mendekat, warga menerima notifikasi. Setibanya di kantor desa, warga melakukan check-in. Ketika
nomornya dipanggil operator, warga dilayani secara tatap muka; penandatanganan dokumen — bila ada —
dilakukan pada momen ini secara langsung.

### 6.5 Alur Operator pada Hari Pelayanan

Operator membuka papan antrean yang menampilkan daftar tiket hari itu beserta statusnya. Operator
menekan "panggil berikutnya" untuk memanggil nomor terkecil yang menunggu; sistem memancarkan
pemberitahuan kepada warga bersangkutan. Setelah pelayanan selesai, operator menandai tiket sebagai
dilayani. Bila warga tidak hadir setelah dipanggil, operator menandainya tidak hadir dan melanjutkan ke
nomor berikutnya.

## 7. Kebutuhan Fungsional

### 7.1 Modul Pendaftaran Perangkat

| Kode | Kebutuhan |
|---|---|
| FR-101 | Operator dapat menerbitkan kode pendaftaran sekali pakai setelah memverifikasi kartu identitas warga secara fisik |
| FR-102 | Identitas hasil pemeriksaan (nama, atribut kelayakan, komitmen NIK) melekat pada kode, bukan pada akun yang belum terverifikasi |
| FR-103 | Kode terdiri atas 8 karakter dari alfabet 31 karakter tanpa karakter ambigu, memberikan entropi sekitar 40 bit |
| FR-104 | Kode berlaku 30 menit dan hanya dapat diklaim satu kali |
| FR-105 | Kode disimpan peladen dalam bentuk hash, tidak dalam bentuk asli |
| FR-106 | Perangkat mengklaim kode dengan menyertakan bukti penguasaan kunci atas pasangan (kode, kunci publik) |
| FR-107 | Akun warga dibuat hanya pada saat kode berhasil diklaim, dalam satu transaksi bersama penghapusan kode |
| FR-108 | Seluruh kegagalan klaim mengembalikan pesan galat yang sama, sehingga endpoint tidak dapat dipakai menebak kode |
| FR-109 | Endpoint klaim dibatasi paling banyak 10 permintaan per menit |
| FR-110 | Identitas perangkat tersimpan secara persisten sehingga warga tidak perlu mendaftar ulang setiap membuka aplikasi |

### 7.2 Modul Autentikasi

| Kode | Kebutuhan |
|---|---|
| FR-201 | Autentikasi memakai pembuktian kepemilikan kunci; tanpa kata sandi dan tanpa NIK |
| FR-202 | Peladen menerbitkan tantangan berupa nonce sekali pakai yang terikat pada satu akun |
| FR-203 | Tantangan kedaluwarsa dalam 5 menit dan hangus setelah dipakai |
| FR-204 | Peladen menolak bukti yang berasal dari kunci selain kunci terdaftar akun tersebut |
| FR-205 | Peladen menolak autentikasi bila status akun bukan aktif |
| FR-206 | Sesi berupa token yang memuat pengenal akun dan peran, berlaku 30 menit |
| FR-207 | Peran ditetapkan peladen, tidak dapat dipilih atau diubah dari sisi aplikasi |
| FR-208 | Endpoint autentikasi dibatasi paling banyak 15 permintaan per menit |

### 7.3 Modul Registri Penduduk

| Kode | Kebutuhan |
|---|---|
| FR-301 | Registri penduduk direpresentasikan sebagai pohon Merkle dari daun yang mewakili tiap penduduk terdaftar |
| FR-302 | Daun dibentuk dari kunci publik warga dan atribut kelayakannya, memakai hash berpemisah domain |
| FR-303 | Operator dapat mengajukan penambahan atau pencabutan penduduk pada registri |
| FR-304 | Perubahan registri memerlukan persetujuan pihak berwenang sebelum berlaku |
| FR-305 | Sistem menyimpan versi registri sehingga akar yang berlaku dapat ditelusuri |
| FR-306 | Warga dapat memperoleh jalur keanggotaan (Merkle proof) atas dirinya sendiri |
| FR-307 | Seluruh perubahan registri tercatat pada jejak audit |

### 7.4 Modul Verifikasi Kelayakan Berbasis ZKP

| Kode | Kebutuhan |
|---|---|
| FR-401 | Pemesanan hanya dapat dilakukan setelah bukti kelayakan terverifikasi |
| FR-402 | Bukti kelayakan terdiri atas bukti keanggotaan registri dan bukti penguasaan kunci |
| FR-403 | Bukti terikat pada konteks permohonan yang memuat akun, jenis layanan, dan nonce sekali pakai |
| FR-404 | NIK tidak pernah menjadi bagian dari bukti maupun muatan permohonan |
| FR-405 | Peladen menolak bukti dari pihak yang tidak terdaftar pada registri |
| FR-406 | Peladen menolak bukti yang disusun oleh pihak yang tidak menguasai kunci privat terkait |
| FR-407 | Peladen menolak bukti yang atributnya diubah setelah bukti dibentuk |
| FR-408 | Peladen menolak bukti yang dikirim ulang, baik pada konteks sama maupun berbeda |
| FR-409 | Nonce kelayakan kedaluwarsa dalam 5 menit dan ditandai terpakai setelah verifikasi berhasil |

### 7.5 Modul Slot Waktu dan Ketersediaan

| Kode | Kebutuhan |
|---|---|
| FR-501 | Operator dapat menetapkan hari dan jam layanan beserta panjang satu slot waktu |
| FR-502 | Sistem membangkitkan slot yang dapat dipesan berdasarkan jam layanan dan panjang slot |
| FR-503 | Operator dapat menutup slot tertentu, misalnya karena kegiatan insidental Kepala Desa |
| FR-504 | Sistem menolak pemesanan pada slot yang sudah diklaim, ditutup, atau berada di luar jam layanan |
| FR-505 | Satu slot hanya dapat diklaim oleh satu janji temu |
| FR-506 | Penutupan slot memindahkan janji temu terdampak ke status usulan penjadwalan ulang, disertai usulan slot pengganti dan pemberitahuan kepada warga |
| FR-507 | Warga dapat menerima atau menolak usulan slot pengganti; penolakan membatalkan janji temu dan membebaskan slot |

### 7.6 Modul Pemesanan dan Nomor Antrean

| Kode | Kebutuhan |
|---|---|
| FR-601 | Warga dapat memesan dengan memilih tanggal dan slot waktu yang tersedia |
| FR-602 | Sistem menerbitkan nomor urut harian yang unik untuk setiap janji temu pada tanggal tersebut |
| FR-603 | Penerbitan nomor bersifat berurutan dan bebas dari perebutan nomor ganda pada permintaan bersamaan |
| FR-604 | Warga dapat membatalkan pemesanannya sendiri sebelum dipanggil |
| FR-605 | Warga dapat melihat daftar pemesanan miliknya beserta status terkini |
| FR-606 | Sistem membatasi jumlah janji temu aktif per warga untuk mencegah penumpukan pemesanan |
| FR-607 | Operator dapat mencatat warga yang datang langsung sebagai janji temu pada slot yang masih kosong |
| FR-608 | Slot yang telah diklaim melalui aplikasi tidak dapat diambil alih oleh pencatatan warga yang datang langsung, sehingga pemesan aplikasi terprioritaskan secara struktural |

### 7.7 Modul Papan Antrean Operator

| Kode | Kebutuhan |
|---|---|
| FR-701 | Operator melihat daftar tiket hari berjalan beserta status dan waktu pemesanan |
| FR-702 | Operator dapat memanggil tiket berikutnya berdasarkan urutan nomor |
| FR-703 | Operator dapat menandai tiket sebagai dilayani, tidak hadir, atau dilewati |
| FR-704 | Operator dapat memanggil ulang tiket yang sebelumnya tidak hadir |
| FR-705 | Setiap transisi status tercatat beserta waktu dan pelakunya |
| FR-706 | Papan antrean menampilkan jumlah tiket menunggu dan rata-rata durasi pelayanan berjalan |

### 7.8 Modul Status dan Notifikasi

| Kode | Kebutuhan |
|---|---|
| FR-801 | Warga melihat nomor yang sedang dilayani dan posisi gilirannya |
| FR-802 | Sistem menampilkan estimasi waktu tunggu berdasarkan rata-rata durasi pelayanan |
| FR-803 | Warga menerima notifikasi ketika gilirannya mendekat |
| FR-804 | Warga menerima notifikasi ketika pemesanannya dikonfirmasi, dijadwalkan ulang, atau dibatalkan |
| FR-805 | Operator menerima notifikasi ketika ada pemesanan baru pada hari berjalan |
| FR-806 | Muatan notifikasi bersifat generik dan tidak memuat data pribadi; detail diambil aplikasi melalui kanal terautentikasi |
| FR-807 | Token notifikasi perangkat didaftarkan setelah masuk dan dicabut saat keluar |
| FR-808 | Token yang tidak lagi sah dipangkas otomatis dari basis data |
| FR-809 | Kegagalan pengiriman notifikasi tidak boleh menggagalkan transaksi layanan yang sudah tersimpan |

### 7.9 Modul Penampil Publik di Kantor Desa

| Kode | Kebutuhan |
|---|---|
| FR-851 | Tersedia halaman baca-saja tanpa autentikasi yang menampilkan nomor yang sedang dilayani, slot berjalan, dan daftar nomor berikutnya |
| FR-852 | Halaman tersebut menyegarkan data secara berkala tanpa perlu dimuat ulang secara manual |
| FR-853 | Halaman tersebut tidak menampilkan nama, NIK, maupun keperluan warga; hanya nomor urut dan waktu |
| FR-854 | Halaman dapat ditayangkan pada layar atau monitor di ruang tunggu kantor desa |

### 7.10 Modul Check-in dan Riwayat

| Kode | Kebutuhan |
|---|---|
| FR-901 | Warga atau operator dapat menandai kehadiran warga saat tiba di kantor desa |
| FR-902 | Check-in hanya berlaku untuk tiket yang telah dikonfirmasi |
| FR-903 | Warga dapat melihat riwayat pemesanan dan kunjungannya |
| FR-904 | Operator dapat melihat rekapitulasi jumlah tiket per jenis layanan dan per periode |
| FR-905 | Rekapitulasi memuat jumlah dilayani, tidak hadir, dan dibatalkan |

### 7.11 Modul Audit dan Administrasi

| Kode | Kebutuhan |
|---|---|
| FR-1001 | Aksi sensitif dicatat pada jejak audit yang hanya bisa ditambah, tidak diubah atau dihapus |
| FR-1002 | Setiap entri audit mengikat hash entri sebelumnya sehingga perubahan satu entri memutus rantai |
| FR-1003 | Kepala Desa dan Administrator dapat memicu verifikasi ulang seluruh rantai audit |
| FR-1004 | Entri audit memuat pelaku, jenis aksi, objek, hash muatan, dan waktu |
| FR-1005 | Administrator dapat menyediakan akun berperan khusus melalui jalur yang tercatat |
| FR-1006 | Seluruh badan permintaan divalidasi terhadap skema sebelum diproses |

## 8. Kebutuhan Nonfungsional

### 8.1 Keamanan

| Kode | Kebutuhan |
|---|---|
| NFR-101 | Identitas ditegakkan melalui penguasaan kunci, bukan melalui pengetahuan atas data yang bersifat semipublik |
| NFR-102 | Seluruh bukti terikat pada konteks ber-nonce sekali pakai sehingga tidak dapat diputar ulang |
| NFR-103 | Kendali akses berbasis peran ditegakkan pada setiap endpoint, bukan hanya disembunyikan pada antarmuka |
| NFR-104 | Pembatasan laju permintaan diterapkan 120 permintaan per menit secara global dan 15 per menit pada endpoint autentikasi |
| NFR-105 | Seluruh masukan divalidasi terhadap skema; properti yang tidak dikenal dibuang |
| NFR-106 | Rahasia sistem hanya berada pada berkas lingkungan yang dikecualikan dari kendali versi |
| NFR-107 | Pesan galat tidak membocorkan informasi yang membantu penyerang membedakan penyebab kegagalan |
| NFR-108 | Perbandingan nilai rahasia dilakukan dalam waktu tetap |

### 8.2 Privasi

| Kode | Kebutuhan |
|---|---|
| NFR-201 | NIK tidak pernah dikirim ke peladen dan tidak pernah disimpan dalam bentuk mentah |
| NFR-202 | Peladen hanya menyimpan komitmen NIK untuk keperluan audit dan pencegahan pendaftaran ganda |
| NFR-203 | Bukti kelayakan hanya mengungkap kunci publik dan atribut kasar yang memang diperlukan layanan |
| NFR-204 | Muatan notifikasi yang melintasi pihak ketiga tidak memuat nama, NIK, maupun rincian keperluan |
| NFR-205 | Data yang dikumpulkan dibatasi pada yang diperlukan untuk menjalankan layanan |

### 8.3 Kinerja

| Kode | Kebutuhan |
|---|---|
| NFR-301 | Pembentukan bukti kelayakan pada perangkat warga selesai dalam hitungan detik pada telepon kelas menengah |
| NFR-302 | Verifikasi bukti pada peladen tidak menjadi penghambat pada beban puncak jam layanan desa |
| NFR-303 | Ukuran bukti kelayakan tetap di bawah satu kilobita agar hemat pada jaringan seluler terbatas |
| NFR-304 | Halaman status antrean menyegarkan data tanpa membebani peladen secara berlebihan |

### 8.4 Keandalan dan Ketersediaan

| Kode | Kebutuhan |
|---|---|
| NFR-401 | Kegagalan subsistem notifikasi tidak boleh menggagalkan pemesanan atau transisi antrean |
| NFR-402 | Penerbitan nomor antrean bersifat atomik sehingga tidak terjadi nomor ganda |
| NFR-403 | Sistem menangani kegagalan jaringan pada aplikasi secara anggun disertai pesan yang dapat dipahami warga |
| NFR-404 | Migrasi basis data dijalankan secara terkendali dan dapat diulang tanpa interaksi manual |

### 8.5 Keterpakaian dan Aksesibilitas

| Kode | Kebutuhan |
|---|---|
| NFR-501 | Seluruh antarmuka berbahasa Indonesia dengan istilah yang lazim dipahami warga desa |
| NFR-502 | Antarmuka mengikuti panduan Material 3 dengan hierarki visual yang jelas |
| NFR-503 | Ukuran sasaran sentuh dan kontras warna memadai untuk pengguna lanjut usia |
| NFR-504 | Alur pemesanan dapat diselesaikan dalam jumlah langkah yang minimal |
| NFR-505 | Istilah kriptografis tidak ditampilkan kepada warga; kompleksitas disembunyikan di balik alur biasa |

### 8.6 Kompatibilitas dan Pemeliharaan

| Kode | Kebutuhan |
|---|---|
| NFR-601 | Aplikasi berjalan pada Android versi yang lazim dipakai warga |
| NFR-602 | Seluruh operasi kriptografis melewati satu pustaka sehingga dapat diaudit di satu tempat |
| NFR-603 | Format wire kriptografis seragam antara aplikasi dan peladen |
| NFR-604 | Kode disertai pengujian otomatis yang dijalankan pada setiap perubahan |
| NFR-605 | Dokumen desain diperlakukan sebagai dokumen hidup yang diperbarui ketika rancangan berubah |

## 9. Arsitektur Sistem

### 9.1 Gambaran Umum

Sistem terdiri atas tiga komponen utama yang saling terpisah tegas: **aplikasi seluler** yang dipegang
warga dan petugas, **peladen layanan** yang menjalankan logika bisnis dan verifikasi kriptografis, serta
**basis data** yang menyimpan keadaan sistem. Di samping ketiganya terdapat **pustaka kriptografi**
sebagai paket tersendiri yang menjadi satu-satunya sumber operasi kriptografis.

Alur data pokok berjalan sebagai berikut. Perangkat warga menyimpan kunci privat dan membentuk bukti;
bukti dikirim melalui antarmuka program aplikasi berbasis HTTP; peladen memverifikasi bukti memakai
pustaka kriptografi yang sama, menerapkan aturan bisnis dan kendali akses peran, lalu menuliskan
perubahan keadaan ke basis data sekaligus mencatat aksi sensitif ke jejak audit; perubahan status
memancarkan peristiwa domain yang diterjemahkan menjadi notifikasi.

### 9.2 Struktur Monorepo

| Paket | Isi | Tanggung jawab |
|---|---|---|
| `packages/crypto` | Pustaka `@sidesa/crypto` berbasis TypeScript | Primitif hash berpemisah domain, pohon Merkle, bukti-pengetahuan Schnorr, penyusunan dan verifikasi bukti kelayakan |
| `packages/backend` | Peladen NestJS dengan Prisma dan PostgreSQL | Autentikasi, kendali akses peran, registri, antrean, notifikasi, audit, validasi masukan, pembatasan laju |
| `packages/app` | Aplikasi Flutter (Material 3) | Antarmuka warga dan petugas, penyimpanan kunci pada perangkat, pembentukan bukti, integrasi notifikasi |

Pemisahan pustaka kriptografi sebagai paket tersendiri bersifat disengaja: seluruh operasi kriptografis
melewati satu titik yang dapat diuji dan diaudit, sehingga tidak ada komponen yang menggulung
primitifnya sendiri.

### 9.3 Tumpukan Teknologi

| Lapis | Teknologi |
|---|---|
| Aplikasi seluler | Flutter, Dart, Material 3 |
| Penyimpanan pada perangkat | Penyimpanan aman sistem operasi melalui `flutter_secure_storage` |
| Peladen | NestJS di atas Node.js, TypeScript |
| Akses basis data | Prisma ORM |
| Basis data | PostgreSQL |
| Kriptografi peladen dan pustaka | Pustaka kurva dan hash teraudit (`@noble/curves`, `@noble/hashes`) |
| Kriptografi perangkat | Pustaka kriptografi Dart yang sepadan dengan format wire pustaka peladen |
| Notifikasi | Firebase Cloud Messaging melalui lapisan abstraksi pengirim |
| Pengujian | Vitest pada peladen dan pustaka; kerangka uji Flutter pada aplikasi |

### 9.4 Batas Kepercayaan

| Batas | Sisi tepercaya | Sisi tidak tepercaya | Kendali |
|---|---|---|---|
| Perangkat ke peladen | Peladen | Seluruh masukan dari perangkat | Verifikasi bukti kriptografis, validasi skema, kendali peran, pembatasan laju |
| Peladen ke basis data | Peladen | — | Kredensial pada berkas lingkungan; migrasi terkendali |
| Peladen ke penyedia notifikasi | — | Penyedia pihak ketiga | Muatan minimal tanpa data pribadi |
| Petugas ke sistem | Petugas terautentikasi | Aksi yang dilakukan | Jejak audit berantai-hash dan pemisahan peran |

Kunci privat warga tidak pernah meninggalkan perangkat. Yang melintasi jaringan hanya bukti dan kunci
publik.

### 9.5 Pola Arsitektur Internal Peladen

Peladen disusun dalam modul-modul yang masing-masing memiliki satu tanggung jawab: autentikasi,
pendaftaran, registri dan kelayakan, antrean, notifikasi, audit, serta akun. Logika bisnis tidak
mengetahui rincian notifikasi; perubahan status memancarkan **peristiwa domain** yang ditangkap
pendengar terpisah untuk diterjemahkan menjadi notifikasi. Pengiriman notifikasi sendiri berada di balik
antarmuka pengirim, dengan implementasi pencatat sebagai bawaan dan implementasi nyata yang dipilih
melalui konfigurasi lingkungan. Kegagalan pada jalur notifikasi ditangkap dan dicatat, sehingga tidak
pernah menjalar ke transaksi layanan yang sudah tersimpan.

## 10. Implementasi Kriptografi

### 10.1 Prinsip Perancangan

Lima prinsip memandu seluruh rancangan kriptografi produk ini.

- **Satu titik kriptografis.** Setiap operasi kriptografis melewati pustaka `@sidesa/crypto`. Tidak ada
  modul lain yang memanggil primitif secara langsung atau menyusun konstruksinya sendiri.
- **Primitif dari pustaka teraudit.** Perkalian titik kurva, pembangkitan skalar, dan fungsi hash
  berasal dari pustaka yang telah ditelaah publik, bukan implementasi sendiri.
- **Minimalisasi pengungkapan.** Setiap protokol dirancang mengungkap sesedikit mungkin: kelayakan
  dibuktikan tanpa membuka data kependudukan.
- **Pemisahan domain menyeluruh.** Tidak ada nilai hash dari satu kegunaan yang dapat dipindahkan ke
  kegunaan lain.
- **Keterikatan konteks.** Setiap bukti terikat pada satu maksud dan satu permohonan melalui konteks
  ber-nonce, sehingga bukti yang tertangkap tidak bernilai bagi penyerang.

### 10.2 Primitif dan Parameter

| Kegunaan | Primitif | Parameter |
|---|---|---|
| Grup kurva eliptik | Kurva NIST P-384 (secp384r1) | Orde grup n berukuran 384 bit |
| Fungsi hash | SHA-384 | Keluaran 48 bita |
| Bukti pengetahuan | Schnorr non-interaktif (Fiat-Shamir) | Tantangan diturunkan dari SHA-384 berpemisah domain |
| Akumulator keanggotaan | Pohon Merkle biner | Simpul di-hash SHA-384 dengan penandaan ranah |
| Enkripsi data saat diam | AES-256 | Bila diperlukan pada lapis penyimpanan |
| Pembangkit acak | Sumber acak kriptografis sistem | Skalar dibangkitkan bebas bias modulo |

Pemilihan P-384 dan SHA-384 mengikuti ketentuan algoritma yang berlaku bagi instansi di Indonesia.
Penggunaan kurva P-256 dan SHA-256 sebagai fungsi hash mandiri tidak diperkenankan dalam produk ini.

### 10.3 Pemisahan Domain

Setiap pencernaan hash diberi penanda ranah agar nilai hash dari satu kegunaan tidak dapat ditafsirkan
sebagai nilai hash kegunaan lain. Untuk masukan biner, penanda ranah dan setiap bagian diberi awalan
panjang 32-bit big-endian sebelum dirangkai, sehingga perangkaian bersifat tak ambigu dan tidak ada dua
kombinasi masukan berbeda yang menghasilkan untai yang sama:

Hd(domain, x1, …, xk) = SHA-384( L(domain) ‖ L(x1) ‖ … ‖ L(xk) ), dengan L(b) = panjang32(b) ‖ b.

Untuk konteks berbasis untai, penanda ranah dilekatkan sebagai awalan berpembatas. Ranah yang dipakai
dalam produk ini:

| Ranah | Kegunaan |
|---|---|
| `SIDESA-schnorr-v1` | Penurunan tantangan pada bukti-pengetahuan Schnorr |
| `SIDESA-resident-leaf-v1` | Pembentukan daun registri penduduk |
| `SIDESA-auth-v1` | Konteks autentikasi |
| `SIDESA-enroll-v1` | Konteks pendaftaran perangkat |
| `SIDESA-eligibility-v1` | Konteks verifikasi kelayakan pemesanan |
| `SIDESA-audit-v1` | Pengikatan entri pada rantai audit |
| Bita penanda 0x00 dan 0x01 | Pemisahan daun dan simpul dalam pada pohon Merkle |

### 10.4 Representasi dan Format Wire

| Objek | Representasi | Ukuran |
|---|---|---|
| Kunci publik X | Titik kurva terkompresi | 49 bita |
| Komitmen R pada bukti Schnorr | Titik kurva terkompresi | 49 bita |
| Respons s pada bukti Schnorr | Skalar big-endian | 48 bita |
| Nilai hash | Keluaran SHA-384 | 48 bita |
| Langkah jalur Merkle | Nilai saudara ditambah penanda posisi | 48 bita ditambah satu penanda |

Format wire dijaga seragam lintas bahasa karena bukti dibentuk aplikasi Dart dan diverifikasi peladen
TypeScript. Nilai biner dipertukarkan dalam representasi heksadesimal pada muatan JSON.

### 10.5 Skema Bukti-Pengetahuan Schnorr

Perangkat memegang skalar rahasia x dan kunci publik X = x·G, dengan G titik basis kurva. Untuk
membuktikan penguasaan x tanpa mengungkapkannya, terhadap sebuah konteks c, perangkat menjalankan:

1. bangkitkan skalar acak k secara kriptografis, dengan 1 ≤ k < n;
2. hitung titik komitmen R = k·G, dinyatakan dalam bentuk terkompresi;
3. hitung tantangan e = Hd(`SIDESA-schnorr-v1`, X, R, c) mod n;
4. hitung respons s = k + e·x mod n;
5. kirim bukti berupa pasangan (R, s).

Pemverifikasi menerima bukti bila dan hanya bila s·G = R + e·X, dengan e dihitung ulang dari X, R, dan
konteks c yang sama. Nilai yang berada di luar rentang sah, titik yang tidak berada pada kurva, serta
tantangan bernilai nol ditolak. Skalar k tidak pernah digunakan ulang; penggunaan ulang k pada dua
konteks berbeda akan membocorkan x, sehingga pembangkitannya memakai sumber acak kriptografis dan
kasus batas ditolak lalu diulang.

Sifat yang diberikan skema ini: **kelengkapan**, yakni pemegang x yang jujur selalu diterima;
**kekukuhan**, yakni pihak tanpa x tidak dapat menghasilkan bukti yang diterima kecuali dengan
probabilitas yang dapat diabaikan; dan **tanpa-pengetahuan**, yakni bukti tidak mengungkap informasi
apa pun mengenai x. Karena tantangan memuat konteks c, bukti sekaligus **terikat** pada satu maksud
tertentu dan tidak dapat dipindahkan ke maksud lain.

### 10.6 Gerbang Pertama: Autentikasi

Konteks yang ditandatangani secara zero-knowledge adalah:

`SIDESA-auth-v1|<pengenal akun>|<nonce>`

Alur: peladen menerbitkan nonce sekali pakai yang terikat pada akun dan berlaku 5 menit; perangkat
menyusun bukti Schnorr atas konteks tersebut; peladen memverifikasi bukti terhadap kunci publik terdaftar
akun, memastikan status akun aktif, menandai nonce terpakai, lalu menerbitkan token sesi berumur 30
menit. Nonce yang sudah terpakai, kedaluwarsa, atau milik akun lain ditolak.

### 10.7 Gerbang Kedua: Pendaftaran Perangkat

Konteks yang dibuktikan adalah:

`SIDESA-enroll-v1|<kode pendaftaran>|<kunci publik heksadesimal>`

Bukti ini menutup serangan pendaftaran kunci milik orang lain. Tanpa keterikatan pada kunci publik,
pihak yang memperoleh kode dapat mendaftarkan kunci publik milik korban; karena kunci publik bersifat
unik pada basis data, korban akan terkunci secara permanen dari layanan. Dengan mensyaratkan bukti
penguasaan atas kunci yang diajukan, hanya pemegang kunci privat terkait yang dapat menyelesaikan
pendaftaran.

Kode pendaftaran dibangkitkan dari alfabet 31 karakter yang menghindari karakter ambigu seperti angka
nol dan huruf O, sepanjang 8 karakter, memberikan entropi sekitar 40 bit. Pembangkitannya menolak nilai
acak yang akan menimbulkan bias modulo. Kode disimpan dalam bentuk hash, berlaku 30 menit, dan
penghapusan kode beserta pembuatan akun dilakukan dalam satu transaksi sehingga tidak mungkin terjadi
klaim ganda. Seluruh kegagalan mengembalikan pesan yang sama agar endpoint tidak dapat dipakai menebak
kode yang berlaku, dan endpoint dibatasi 10 permintaan per menit.

### 10.8 Gerbang Ketiga: Verifikasi Kelayakan

Konteks yang dibuktikan adalah:

`SIDESA-eligibility-v1|<pengenal akun>|<jenis layanan>|<nonce>`

Bukti kelayakan berupa struktur berisi empat unsur: kunci publik X, atribut kelayakan A, jalur
keanggotaan Merkle, dan bukti-pengetahuan Schnorr atas konteks. Prosedur verifikasi pada peladen:

1. hitung daun = Hd(`SIDESA-resident-leaf-v1`, X ‖ A);
2. tolak bila jalur Merkle tidak memverifikasi daun tersebut terhadap akar registri yang berlaku;
3. tolak bila bukti Schnorr tidak sah atas konteks oleh kunci publik X;
4. tolak bila nonce pada konteks tidak dikenal, telah terpakai, kedaluwarsa, atau bukan milik akun
   pemohon;
5. tandai nonce terpakai dan lanjutkan pemrosesan pemesanan.

Sifat keamanan yang dihasilkan dan diuji secara eksplisit:

| Serangan | Mengapa gagal |
|---|---|
| Bukan penduduk terdaftar mencoba memesan | Daunnya tidak berada di bawah akar registri, jalur Merkle gagal |
| Penyerang menyalin kunci publik warga lain | Tidak dapat menyusun bukti Schnorr tanpa kunci privat terkait |
| Bukti yang tertangkap dikirim ulang | Nonce sudah ditandai terpakai |
| Bukti dipakai untuk jenis layanan lain | Konteks berbeda menghasilkan tantangan berbeda, verifikasi gagal |
| Atribut diubah setelah bukti dibentuk | Nilai daun berubah, keanggotaan Merkle terputus |
| Bukti dipakai dengan token sesi curian | Konteks memuat pengenal akun; ketidakcocokan ditolak |

### 10.9 Registri Penduduk Berbasis Pohon Merkle

Registri penduduk adalah pohon Merkle biner. Daun untuk seorang warga dibentuk dari kunci publik dan
atribut kelayakannya melalui hash berpemisah domain. Simpul dalam dibentuk dengan menggabungkan dua anak
di bawah penanda ranah yang berbeda dari penanda daun; pemisahan ini mencegah serangan pra-citra kedua
yang memanfaatkan kerancuan antara daun dan simpul. Bila jumlah daun pada suatu lapis ganjil, daun
terakhir digandakan agar pohon tetap seimbang.

Jalur keanggotaan terdiri atas rangkaian nilai saudara beserta penanda sisi, sehingga pemverifikasi
dapat menghitung ulang akar dari daun. Untuk registri berukuran 1.024 penduduk, jalur terdiri atas
sepuluh langkah, sehingga ukuran bukti tumbuh logaritmik terhadap jumlah penduduk. Perbandingan nilai
akar dilakukan dalam waktu tetap.

Akar registri yang berlaku dipelihara peladen sebagai otoritas registri, dengan penyimpanan versi
sehingga perubahan dapat ditelusuri. Perubahan registri diajukan operator dan memerlukan persetujuan
pihak berwenang, dan seluruh perubahan tercatat pada jejak audit.

### 10.10 Anti-Replay: Siklus Hidup Nonce

Nonce dipakai pada dua gerbang: autentikasi dan kelayakan. Keduanya mengikuti siklus hidup yang sama:
diterbitkan peladen atas permintaan akun tertentu; disimpan bersama pengenal akun, waktu kedaluwarsa,
dan penanda pemakaian; berlaku 5 menit; ditandai terpakai dalam operasi yang sama dengan verifikasi
bukti sehingga tidak ada celah antara pemeriksaan dan penandaan. Nonce yang sudah terpakai, kedaluwarsa,
atau milik akun berbeda ditolak tanpa membedakan pesan galat.

### 10.11 Komitmen Nomor Induk Kependudukan

NIK diverifikasi secara fisik satu kali oleh petugas pada saat pendaftaran perangkat, dan tidak pernah
dikirimkan dari perangkat warga. Yang tersimpan pada peladen adalah komitmennya berupa nilai hash,
dipakai semata untuk keperluan audit dan pencegahan pendaftaran ganda — bukan sebagai sarana verifikasi
kelayakan. Dengan demikian, meskipun basis data bocor, tidak ada NIK yang dapat diambil langsung
daripadanya.

### 10.12 Rantai Audit

Setiap aksi sensitif dicatat sebagai entri yang mengikat hash entri sebelumnya:

entryHash = Hd(`SIDESA-audit-v1`, prevHash, pelaku, aksi, objek, hashMuatan, waktu)

Entri pertama mengikat nilai genesis. Karena setiap entri memuat hash pendahulunya, penyuntingan atau
penghapusan satu entri akan memutus rantai pada seluruh entri sesudahnya dan terdeteksi ketika rantai
dihitung ulang. Verifikasi rantai tersedia bagi Kepala Desa dan Administrator. Sifat yang diberikan
adalah **tamper-evident**: perubahan riwayat menjadi kejadian yang terdeteksi, bukan sesuatu yang harus
dipercaya tidak terjadi.

### 10.13 Penyimpanan Kunci pada Perangkat

Kunci privat warga dibangkitkan pada perangkat saat pendaftaran dan disimpan pada penyimpanan aman
sistem operasi. Kunci tidak pernah dikirimkan ke peladen maupun dicadangkan ke layanan luar.

Perlu dinyatakan secara terbuka bahwa skema Schnorr menuntut akses langsung ke skalar privat untuk
menghitung respons s = k + e·x. Elemen aman berbasis perangkat keras pada Android tidak pernah
mengekspos skalar privat kepada aplikasi — antarmukanya hanya menyediakan operasi penandatanganan.
Konsekuensinya, kunci identitas pada produk ini berada pada penyimpanan yang dapat diakses aplikasi,
bukan terisolasi di dalam elemen aman dengan gerbang biometrik pada setiap operasi kriptografis.
Verifikasi biometrik tetap dapat dipakai sebagai kunci akses aplikasi.

Konsekuensi keamanan dari pilihan ini proporsional dengan model ancaman produk: kunci yang berhasil
dicuri dari perangkat yang tersusupi hanya memungkinkan penyerang memesan antrean atas nama korban —
gangguan layanan yang dapat dipulihkan dengan pencabutan dan pendaftaran ulang — dan **tidak**
memungkinkan pemalsuan dokumen resmi, karena produk ini memang tidak menerbitkan dokumen.

### 10.14 Interoperabilitas Lintas Bahasa

Bukti dibentuk pada aplikasi Dart dan diverifikasi pada peladen TypeScript. Kedua sisi harus sepakat
mutlak pada representasi titik, urutan bita skalar, penanda ranah, dan tata cara penurunan tantangan.
Kesepakatan ini dijaga melalui vektor uji: aplikasi memancarkan bukti beserta konteksnya, dan rangkaian
pengujian peladen memverifikasinya memakai pustaka kriptografi. Pengujian ini menutup risiko divergensi
diam yang hanya muncul lintas bahasa dan tidak akan terdeteksi oleh pengujian pada satu sisi saja.

### 10.15 Larangan dan Anti-Pola

Hal-hal berikut dilarang dalam basis kode produk ini:

- Menggulung primitif kriptografi sendiri atau menyalin implementasi dari sumber tidak teraudit.
- Memakai kurva P-256 atau SHA-256 sebagai fungsi hash mandiri.
- Mencerna data tanpa penanda ranah.
- Menggunakan ulang skalar acak k pada dua bukti berbeda.
- Mengirim atau menyimpan NIK dalam bentuk mentah.
- Melemahkan atau menghapus pengujian negatif agar rangkaian pengujian berwarna hijau.

## 11. Model Data

### 11.1 Entitas Utama

| Entitas | Isi pokok | Catatan |
|---|---|---|
| Akun | Pengenal, peran, status, kunci publik unik, nama tampilan, komitmen NIK, atribut, indeks daun | Kunci publik menjadi pengenal kriptografis akun |
| Versi registri | Nomor versi, nilai akar, penanda aktif, waktu | Menyimpan riwayat akar registri |
| Tantangan autentikasi | Nonce, akun, waktu kedaluwarsa, penanda pemakaian | Berlaku 5 menit, sekali pakai |
| Tantangan kelayakan | Nonce, akun, waktu kedaluwarsa, penanda pemakaian | Berlaku 5 menit, sekali pakai |
| Kode pendaftaran | Hash kode, identitas melekat, penerbit, waktu kedaluwarsa, penanda pemakaian | Berlaku 30 menit, disimpan sebagai hash |
| Jenis layanan | Nama, perkiraan durasi, penanda aktif | Dasar penghitungan kuota dan estimasi |
| Jadwal dan kuota | Tanggal, jenis layanan, jam layanan, kuota | Menentukan ketersediaan pemesanan |
| Tiket antrean | Pemilik, jenis layanan, tanggal, nomor antrean, status, slot, token check-in, stempel waktu transisi | Inti subsistem antrean |
| Token perangkat | Akun, token notifikasi, platform, waktu | Dipangkas otomatis bila tidak lagi sah |
| Entri audit | Pelaku, aksi, objek, hash muatan, waktu, hash sebelumnya, hash entri | Membentuk rantai tamper-evident |

### 11.2 Mesin Status Tiket Antrean

| Status | Makna | Transisi sah |
|---|---|---|
| `BOOKED` | Slot diklaim dan menunggu giliran | ke `CALLED` oleh operator; ke `CANCELLED` oleh warga atau operator; ke `RESCHEDULE_SUGGESTED` bila slot ditutup |
| `CALLED` | Nomor sedang dipanggil | ke `SERVED` atau `NO_SHOW` oleh operator |
| `SERVED` | Warga telah dilayani | status akhir |
| `NO_SHOW` | Warga tidak hadir saat dipanggil | ke `CALLED` bila dipanggil ulang |
| `CANCELLED` | Pemesanan dibatalkan; slot kembali tersedia | status akhir |
| `RESCHEDULE_SUGGESTED` | Slot ditutup, warga menerima usulan slot pengganti | ke `BOOKED` bila usulan diterima; ke `CANCELLED` bila ditolak |

Setiap transisi dicatat beserta waktu dan pelakunya, dan hanya dapat dilakukan oleh peran yang berwenang.

### 11.3 Disiplin Migrasi Basis Data

Perubahan skema dijalankan secara non-interaktif: selisih antara basis data berjalan dan definisi skema
dihasilkan sebagai berkas SQL, disimpan pada folder migrasi bernomor waktu, lalu diterapkan dan diikuti
pembangkitan ulang klien. Perintah migrasi interaktif tidak dipakai karena lingkungan pengembangan
bersifat non-interaktif dan perintah demikian berisiko menimbulkan keadaan yang tidak dapat diulang.

## 12. Antarmuka Program Aplikasi

Seluruh endpoint yang menuntut identitas memerlukan token sesi; peran ditegakkan pada tiap endpoint.
Kolom status menunjukkan keadaan implementasi saat dokumen ini disusun.

| Endpoint | Peran | Kegunaan | Status |
|---|---|---|---|
| `POST /auth/challenge` | publik | Meminta nonce autentikasi untuk sebuah akun | Terpasang |
| `POST /auth/verify` | publik | Menyerahkan bukti autentikasi dan memperoleh token sesi | Terpasang |
| `POST /enroll/code` | OPERATOR, ADMIN | Menerbitkan kode pendaftaran setelah verifikasi identitas fisik | Terpasang |
| `POST /enroll/claim` | publik, dibatasi laju | Mengklaim kode disertai bukti penguasaan kunci | Terpasang |
| `GET /accounts/me` | terautentikasi | Melihat profil akun sendiri | Terpasang |
| `POST /accounts/privileged` | ADMIN | Menyediakan akun berperan khusus | Terpasang |
| `POST /registry/approve` | OPERATOR | Mengajukan penambahan penduduk ke registri | Terpasang |
| `POST /registry/snapshot` | OPERATOR | Membentuk cuplikan registri | Terpasang |
| `POST /registry/publish` | KADES | Memberlakukan versi registri | Terpasang |
| `GET /registry/proof` | terautentikasi | Mengambil jalur keanggotaan milik sendiri | Terpasang |
| `POST /eligibility/challenge` | WARGA | Meminta nonce kelayakan | Terpasang |
| `POST /eligibility/verify` | internal | Memverifikasi bukti kelayakan | Terpasang |
| `GET /services` | terautentikasi | Daftar jenis layanan aktif | Rencana |
| `GET /services/{id}/slots` | WARGA | Ketersediaan slot dan sisa kuota | Rencana |
| `POST /queue/tickets` | WARGA | Memesan antrean disertai bukti kelayakan | Rencana |
| `GET /queue/tickets/mine` | WARGA | Daftar tiket milik sendiri | Rencana |
| `POST /queue/tickets/{id}/cancel` | WARGA, OPERATOR | Membatalkan tiket | Rencana |
| `GET /queue/board` | OPERATOR, KADES | Papan antrean hari berjalan | Rencana |
| `POST /queue/next` | OPERATOR | Memanggil nomor berikutnya | Rencana |
| `POST /queue/tickets/{id}/serve` | OPERATOR | Menandai tiket telah dilayani | Rencana |
| `POST /queue/tickets/{id}/no-show` | OPERATOR | Menandai warga tidak hadir | Rencana |
| `POST /queue/checkin` | OPERATOR | Menandai kehadiran warga | Rencana |
| `GET /queue/status` | terautentikasi | Nomor berjalan dan estimasi tunggu | Rencana |
| `POST /notifications/token` | terautentikasi | Mendaftarkan token notifikasi perangkat | Terpasang |
| `DELETE /notifications/token` | terautentikasi | Mencabut token notifikasi perangkat | Terpasang |
| `GET /audit` | KADES, ADMIN | Membaca jejak audit | Terpasang |
| `GET /audit/verify` | KADES, ADMIN | Menghitung ulang dan memverifikasi rantai audit | Terpasang |
| `GET /health` | publik | Pemeriksaan kesehatan layanan | Terpasang |

### 12.1 Ketentuan Umum Antarmuka

Seluruh badan permintaan divalidasi terhadap skema; properti yang tidak dikenal dibuang dan permintaan
yang cacat ditolak sebelum mencapai penangan. Nilai kriptografis dipertukarkan dalam representasi
heksadesimal dengan panjang yang diperiksa secara ketat. Galat dikembalikan dengan pesan yang tidak
membocorkan penyebab spesifik pada jalur yang sensitif. Pembatasan laju berlaku global dan diperketat
pada endpoint autentikasi dan klaim pendaftaran.

## 13. Antarmuka Pengguna

### 13.1 Prinsip Desain

Antarmuka mengikuti panduan Material 3 dengan tiga prinsip. **Pertama, kompleksitas kriptografis
disembunyikan**: warga tidak pernah melihat istilah kunci, bukti, atau nonce; yang tampak hanyalah
"mendaftar", "masuk", dan "pesan antrean". **Kedua, informasi terpenting muncul lebih dulu**: nomor
antrean dan posisi giliran mendominasi layar utama warga. **Ketiga, alur sesingkat mungkin**: pemesanan
diselesaikan dalam tiga langkah — pilih layanan, pilih tanggal, konfirmasi.

### 13.2 Peta Layar

| Peran | Layar | Isi utama |
|---|---|---|
| Warga | Pendaftaran perangkat | Kolom kode pendaftaran, penjelasan singkat, umpan balik kegagalan |
| Warga | Beranda | Tiket aktif, nomor berjalan, posisi giliran, estimasi tunggu, tombol pesan |
| Warga | Pilih layanan | Daftar jenis layanan beserta perkiraan durasi |
| Warga | Pilih jadwal | Tanggal, slot tersedia, sisa kuota |
| Warga | Konfirmasi dan tiket | Nomor antrean, tanggal, jenis layanan, tombol batal |
| Warga | Riwayat | Daftar tiket lampau beserta hasilnya |
| Warga | Profil | Nama, status pendaftaran perangkat, keluar |
| Operator | Papan antrean | Daftar tiket hari ini, tombol panggil berikutnya, tandai dilayani atau tidak hadir |
| Operator | Terbitkan kode | Formulir identitas warga dan tampilan kode beserta masa berlaku |
| Operator | Jadwal dan kuota | Pengaturan jam layanan, kuota per jenis layanan |
| Operator | Registri | Pengajuan penambahan atau pencabutan penduduk |
| Operator | Rekapitulasi | Jumlah tiket per jenis layanan dan per periode |
| Kepala Desa | Agenda harian | Ringkasan janji temu dan jumlah warga menunggu |
| Kepala Desa | Verifikasi audit | Pemicu verifikasi rantai dan hasilnya |

## 14. Penerapan Secure Software Development Lifecycle

Secure SDLC adalah pendekatan membangun perangkat lunak dengan menyisipkan aktivitas keamanan pada
setiap tahap pengembangan, bukan menambalkannya di akhir. Karena SIDESA-CM menangani data kependudukan
yang dilindungi undang-undang dan menjadi gerbang akses layanan publik, keamanan diperlakukan sebagai
kebutuhan utama.

### 14.1 Pemilihan Kerangka

| Kerangka | Peran | Alasan pemilihan |
|---|---|---|
| Microsoft SDL | Kerangka utama | Berbasis fase dari pembekalan hingga respons insiden; selaras dengan alur kerja proyek; mudah dikomunikasikan kepada pemangku kepentingan nonteknis |
| NIST SSDF (SP 800-218) | Pelengkap | Kumpulan praktik yang lazim dirujuk pada konteks pemerintahan; memperkuat keselarasan standar |
| PASTA | Perumusan kebutuhan keamanan | Bersifat digerakkan objektif dan kepatuhan, yang pada proyek ini memang menjadi penggerak utama |
| STRIDE | Analisis ancaman | Mengisi tahap keempat PASTA; cepat diterapkan dan mudah ditelusuri ke komponen |
| OWASP SAMM | Tidak dipakai | Penilaian kematangan organisasi berada di luar cakupan kegiatan pengabdian dengan tim kecil |

### 14.2 Perumusan Kebutuhan Keamanan dengan PASTA

| Tahap | Aktivitas pada proyek ini | Keluaran | Status |
|---|---|---|---|
| 1. Definisi objektif | Perumusan tujuan layanan dan pemetaan kewajiban regulasi | Daftar objektif, kewajiban UU PDP, ketentuan algoritma | Terpenuhi |
| 2. Definisi cakupan teknis | Penetapan batas sistem, komponen, dan ketergantungan | Arsitektur monorepo, batas kepercayaan, pemilihan pustaka | Terpenuhi |
| 3. Dekomposisi aplikasi | Penguraian aktor, alur data, dan titik masuk | Empat peran, matriks hak akses, daftar endpoint | Terpenuhi |
| 4. Analisis ancaman | Identifikasi ancaman memakai STRIDE | Tabel ancaman beserta mitigasi yang dapat diuji | Terpenuhi |
| 5. Analisis kerentanan | Penelusuran kelemahan implementasi dan dependensi | Uji negatif dan kekukuhan; tanpa uji penetrasi | Parsial |
| 6. Pemodelan serangan | Penyusunan jalur serangan dari sudut pandang penyerang | Skenario naratif; tanpa pohon serangan formal | Parsial |
| 7. Analisis risiko dan dampak | Penilaian risiko residual | Tabel risiko kualitatif pada Bagian 17 | Parsial |

Tahap kelima hingga ketujuh dinyatakan parsial secara jujur: analisis kerentanan yang utuh menuntut uji
penetrasi, pemodelan serangan menuntut pohon serangan formal, dan analisis risiko kuantitatif menuntut
data frekuensi kejadian yang belum tersedia bagi layanan yang belum beroperasi.

### 14.3 Pemodelan Ancaman STRIDE

| Kategori | Ancaman | Mitigasi | Cara pengujian |
|---|---|---|---|
| Spoofing | Pemalsuan identitas warga saat masuk | Autentikasi berbasis pembuktian kepemilikan kunci | Bukti dari kunci lain ditolak |
| Spoofing | Pendaftaran kunci publik milik orang lain | Bukti penguasaan kunci pada klaim kode | Klaim dengan bukti dari kunci berbeda ditolak |
| Tampering | Manipulasi status tiket antrean | Kendali akses per endpoint dan transisi status terbatas | Transisi oleh peran tak berwenang ditolak |
| Tampering | Manipulasi atribut kelayakan | Atribut terikat pada daun registri | Perubahan atribut memutus keanggotaan Merkle |
| Repudiation | Penyangkalan tindakan oleh petugas | Jejak audit append-only berantai-hash | Perubahan satu entri membuat verifikasi rantai gagal |
| Information disclosure | Kebocoran data kependudukan | Penyimpanan komitmen NIK; NIK tak pernah didigitalkan | Muatan permohonan diperiksa tidak memuat NIK |
| Information disclosure | Kebocoran melalui pihak ketiga notifikasi | Muatan notifikasi generik tanpa data pribadi | Muatan diperiksa tidak memuat nama maupun rincian |
| Denial of service | Pembanjiran permintaan autentikasi atau pemesanan | Pembatasan laju dan kuota harian | Pembatas aktif pada lingkungan produksi |
| Elevation of privilege | Warga menjalankan aksi milik operator | Kendali akses berbasis peran pada setiap endpoint | Permintaan lintas peran ditolak |
| Replay | Penggunaan ulang bukti kelayakan atau autentikasi | Konteks ber-nonce sekali pakai | Pengiriman ulang bukti yang sama ditolak |

### 14.4 Penerapan per Fase Microsoft SDL

**Training.** Pendalaman bukti-pengetahuan Schnorr dan transformasi Fiat-Shamir, pohon Merkle beserta
penandaan ranah, prinsip minimalisasi data menurut UU PDP, ketentuan algoritma kriptografi yang berlaku,
serta metode pemodelan ancaman PASTA dan STRIDE.

**Requirements.** Penyusunan dokumen kebutuhan yang memuat kebutuhan fungsional dan **kebutuhan keamanan
secara eksplisit** beserta kriteria sukses terukur — sebagaimana tertuang pada Bagian 7 dan 8 dokumen
ini.

**Design.** Pemodelan ancaman STRIDE; penetapan autentikasi berbasis kepemilikan kunci; minimalisasi
data melalui komitmen NIK; registri Merkle sebagai dasar kelayakan; kendali akses empat peran; jejak
audit berantai-hash; serta pemisahan tugas antara pengaju dan pemberi persetujuan pada perubahan
registri.

**Implementation.** Pengembangan berbasis pengujian sebagai jaring pengaman; primitif dari pustaka
teraudit tanpa menggulung sendiri; pemisahan domain pada seluruh pencernaan hash; validasi masukan
berbasis skema yang menolak muatan cacat sebelum diproses; pengelolaan rahasia melalui berkas
lingkungan yang dikecualikan dari kendali versi; serta pemisahan jalur notifikasi dari logika bisnis
sehingga kegagalannya tidak menjalar.

**Verification.** Pengujian otomatis yang menekankan **pengujian negatif dan kekukuhan**; pengujian
interoperabilitas lintas bahasa; serta verifikasi menyeluruh pada perangkat bersama layanan yang
berjalan, dengan pemeriksaan keadaan basis data pada setiap transisi agar hasil pengamatan tidak semata
bergantung pada tampilan antarmuka.

**Release.** Pengelolaan rahasia; migrasi basis data terkendali dan non-interaktif; pembatasan laju
permintaan; serta penerapan TLS pada saat penggelaran.

**Response.** Jejak audit append-only berantai-hash yang bersifat tamper-evident dan dapat diverifikasi
ulang; serta rancangan mekanisme pencabutan dan pendaftaran ulang kunci identitas beserta prosedur tata
kelola administrator.

### 14.5 Pemetaan ke NIST SSDF

| Praktik | Penerapan pada SIDESA-CM |
|---|---|
| PO — Prepare the Organization | Aturan proyek terdokumentasi, konvensi pengujian dan riwayat perubahan, dasar kepatuhan algoritma |
| PS — Protect the Software | Rahasia dikecualikan dari repositori; integritas riwayat dijaga rantai audit; NIK tidak disimpan mentah |
| PW.1 — desain aman | Pemodelan ancaman STRIDE dan arsitektur berbasis kepemilikan kunci serta minimalisasi data |
| PW.4 — komponen tepercaya | Primitif kriptografi berasal dari pustaka teraudit, bukan implementasi sendiri |
| PW.5 — penulisan kode aman | Validasi masukan berbasis skema, pembatasan laju, penanganan galat tanpa membocorkan detail |
| PW.7 dan PW.8 — peninjauan dan pengujian | Peninjauan kode antartugas; pengujian negatif, interoperabilitas, dan verifikasi di perangkat |
| RV — Respond to Vulnerabilities | Jejak audit tamper-evident terpasang dan terverifikasi; rancangan pencabutan kunci |

### 14.6 Praktik Pengembangan

Kode ditulis per tugas dengan bantuan asisten kecerdasan buatan, sedangkan peninjauan dilakukan manusia
pada setiap selisih perubahan sebelum tugas berikutnya dimulai. **Test-Driven Development** diperlakukan
sebagai jaring pengaman wajib: pengujian yang gagal ditulis lebih dahulu, kemudian implementasi minimal,
lalu perubahan disimpan pada riwayat versi dalam potongan kecil dan sering.

Satu kebijakan diberlakukan secara ketat: **larangan melemahkan pengujian negatif** demi membuat seluruh
pengujian dinyatakan lulus. Pengujian kriptografi yang gagal diperlakukan sebagai indikasi kesalahan
yang harus ditelusuri sampai akar masalahnya, bukan sebagai pengujian yang perlu disesuaikan. Kebijakan
ini penting justru karena kecepatan penulisan kode berbantuan mesin membuat godaan menyesuaikan
pengujian menjadi besar, sementara literatur menunjukkan kode berbantuan asisten cenderung mengandung
kerentanan sekaligus meningkatkan rasa percaya diri penulisnya.

### 14.7 Strategi Pengujian

| Lapis | Cakupan | Contoh pengujian negatif |
|---|---|---|
| Pustaka kriptografi | Bukti Schnorr, pohon Merkle, bukti kelayakan | Bukti tanpa penguasaan rahasia ditolak; respons yang dirusak ditolak; bukti pada konteks berbeda ditolak; bukan-anggota registri ditolak; atribut yang diubah memutus keanggotaan |
| Peladen (unit dan integrasi) | Autentikasi, pendaftaran, registri, antrean, audit, notifikasi | Nonce terpakai ditolak; klaim kode kedua kali ditolak; permintaan lintas peran ditolak; badan permintaan cacat ditolak; entri audit yang diubah membuat rantai gagal |
| Peladen (menyeluruh) | Alur lengkap warga hingga pelayanan | Pemesanan tanpa bukti kelayakan ditolak; pemanggilan oleh peran tak berwenang ditolak |
| Interoperabilitas | Bukti Dart diverifikasi peladen TypeScript | Ketidaksesuaian format wire terdeteksi sebelum sampai ke lapangan |
| Aplikasi | Alur tiap peran, penyimpanan identitas, notifikasi | Kegagalan pendaftaran token tidak menggagalkan proses masuk |
| Perangkat nyata | Siklus penuh bersama layanan berjalan | Keadaan basis data diperiksa pada setiap transisi status |

### 14.8 Status Penerapan SSDLC

| Fase | Status | Keterangan |
|---|---|---|
| Training | Terpenuhi | Pembekalan kriptografi, regulasi, dan pemodelan ancaman |
| Requirements | Terpenuhi | Dokumen ini beserta dokumen desain |
| Design | Terpenuhi | Arsitektur aman, rancangan kriptografi, pemodelan ancaman STRIDE |
| Implementation | Parsial | Infrastruktur bersama terpasang; subsistem antrean dan penyatuan kripto pada satu primitif sedang dikerjakan |
| Verification | Parsial | Metodologi dan rangkaian pengujian terpasang; verifikasi subsistem antrean menyusul |
| Release | Parsial | Pembatasan laju dan migrasi terkendali terpenuhi; penerapan TLS menyusul |
| Response | Sebagian besar terpenuhi | Jejak audit tamper-evident terpasang dan terverifikasi; pencabutan kunci baru dirancang |

## 15. Kepatuhan dan Regulasi

| Dasar | Kewajiban | Penerapan pada produk |
|---|---|---|
| Ketentuan algoritma kriptografi bagi instansi (Kepka BSSN Nomor 443 Tahun 2025) | Penggunaan algoritma yang diperkenankan | Kurva P-384 dan fungsi hash SHA-384 pada seluruh konstruksi; AES-256 untuk data saat diam; P-256 dan SHA-256 mandiri tidak dipakai |
| Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi | Minimalisasi data pribadi | NIK tidak dikirim maupun disimpan mentah; hanya komitmennya tersimpan; bukti kelayakan tidak memuat data kependudukan; muatan notifikasi bebas data pribadi |
| Undang-Undang Informasi dan Transaksi Elektronik | Kekuatan hukum tanda tangan elektronik | Tidak relevan bagi produk ini karena aplikasi tidak menerbitkan tanda tangan elektronik; dokumen ditandatangani secara tatap muka |

Karena aplikasi tidak memproduksi tanda tangan elektronik, kepatuhan algoritma diposisikan pada
konstruksi kriptografis yang dipakai, yakni bukti-pengetahuan dan akumulator keanggotaan di atas kurva
P-384 dengan fungsi hash SHA-384. Posisi ini telah dikonfirmasi: Kepka 443 dipakai sebagai dasar
pemilihan algoritma, sedangkan klaim mengenai kekuatan hukum tanda tangan elektronik dihapus karena
aplikasi memang tidak memproduksinya.

## 16. Operasional dan Penggelaran

| Aspek | Ketentuan |
|---|---|
| Lingkungan | Pengembangan lokal dengan basis data dalam kontainer; penggelaran pada peladen desa atau layanan awan |
| Konfigurasi | Seluruh parameter lingkungan melalui berkas lingkungan; berkas contoh disertakan tanpa nilai rahasia |
| Rahasia | Kunci sesi, kredensial basis data, dan kredensial notifikasi hanya berada pada berkas lingkungan yang dikecualikan dari kendali versi |
| Migrasi | Dijalankan non-interaktif melalui berkas SQL bernomor waktu yang tersimpan pada repositori |
| Transport | TLS wajib pada penggelaran produksi |
| Pencadangan | Pencadangan basis data berkala; jejak audit ikut tercadangkan sehingga rantai tetap dapat diverifikasi |
| Pemantauan | Pemeriksaan kesehatan layanan; pencatatan galat tanpa memuat data pribadi |
| Pemulihan perangkat hilang | Pencabutan kunci lama dan pendaftaran ulang melalui operator dengan verifikasi identitas fisik |

## 17. Risiko dan Mitigasi

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R-1 | Posisi kepatuhan algoritma pada sistem tanpa tanda tangan dinilai belum jelas | Rendah | **Selesai.** Kepka 443 dipakai sebagai dasar pemilihan algoritma (P-384, SHA-384, AES-256); klaim kekuatan hukum tanda tangan dihapus karena aplikasi tidak memproduksinya |
| R-2 | Kunci identitas tidak terisolasi pada elemen aman perangkat keras | Sedang | **Diterima** sebagai konsekuensi melekat pemilihan Schnorr. Model ancaman terbatas pada gangguan pemesanan; kunci disimpan pada penyimpanan aman sistem; tersedia jalur pencabutan dan pendaftaran ulang |
| R-3 | Pemesanan dari akun yang sama dapat ditautkan satu sama lain | Rendah | Konsisten dengan pilihan rancangan; kredensial anonim dicatat sebagai pekerjaan lanjutan |
| R-4 | Literasi digital warga rendah sehingga adopsi lambat | Tinggi | Antarmuka sederhana berbahasa Indonesia; pendampingan operator; pelatihan dan sosialisasi lapangan |
| R-5 | Ketergantungan pada penyedia notifikasi pihak ketiga | Rendah | Muatan minimal tanpa data pribadi; kegagalan notifikasi tidak menggagalkan layanan; status tetap dapat dipantau dari aplikasi |
| R-6 | Perangkat warga hilang atau berpindah tangan | Sedang | Pencabutan kunci melalui operator; pendaftaran ulang menuntut verifikasi identitas fisik |
| R-7 | Keterbatasan jaringan di wilayah desa | Sedang | Ukuran bukti dijaga di bawah satu kilobita; penanganan kegagalan jaringan secara anggun |
| R-8 | Beban puncak pada jam layanan | Rendah | Kuota harian; pembatasan laju; verifikasi bukti yang efisien |

## 18. Status Implementasi dan Peta Jalan

### 18.1 Status Saat Ini

Komponen berikut telah terbangun dan teruji: pustaka kriptografi beserta pohon Merkle, hash berpemisah
domain, dan modul bukti-pengetahuan Schnorr; peladen dengan autentikasi, kendali akses empat peran,
registri, pendaftaran perangkat berbasis kode operator dengan bukti penguasaan kunci, jejak audit
berantai-hash yang terverifikasi, pembatasan laju, dan validasi masukan; subsistem notifikasi dengan
lapisan abstraksi pengirim dan muatan minimal; serta aplikasi Flutter dengan alur pendaftaran, masuk,
dan pemesanan janji temu dasar.

Pekerjaan yang sedang dan akan dikerjakan: penyatuan seluruh gerbang kriptografis pada satu primitif
bukti-pengetahuan Schnorr, serta pembangunan subsistem antrean secara penuh.

### 18.2 Peta Jalan

| Tahap | Lingkup | Keluaran |
|---|---|---|
| Tahap 1 | Penyatuan kripto pada bukti-pengetahuan Schnorr untuk ketiga gerbang, beserta padanan lintas bahasa | Pustaka dan peladen dengan satu primitif; uji interoperabilitas hijau |
| Tahap 2 | Subsistem antrean: jenis layanan, jadwal dan kuota, tiket dan nomor antrean, papan operator | Alur pesan hingga dilayani berfungsi menyeluruh |
| Tahap 3 | Status berjalan, estimasi tunggu, check-in, riwayat dan rekapitulasi | Pengalaman warga dan laporan operator lengkap |
| Tahap 4 | Penyambungan notifikasi antrean pada infrastruktur notifikasi | Pemberitahuan giliran dan perubahan jadwal |
| Tahap 5 | Pengerasan rilis: TLS, pencabutan kunci, prosedur tata kelola | Siap gelar terbatas |
| Tahap 6 | Uji lapangan bersama perangkat desa, pelatihan, dan serah terima | Umpan balik keterpakaian dan dokumen serah terima |

## 19. Kriteria Penerimaan

Produk dinyatakan memenuhi syarat apabila seluruh butir berikut terpenuhi dan terbukti melalui pengujian
otomatis maupun demonstrasi pada perangkat nyata.

- Warga yang belum terdaftar tidak dapat memesan antrean, dan penolakannya terbukti pada pengujian.
- Warga terdaftar dapat memesan dan memperoleh nomor antrean tanpa pernah mengirimkan NIK; muatan
  permohonan terbukti tidak memuat NIK.
- Bukti kelayakan yang ditangkap dan dikirim ulang ditolak sistem.
- Pihak yang tidak menguasai kunci privat tidak dapat memesan atas nama warga lain.
- Pendaftaran perangkat memerlukan verifikasi identitas fisik dan bukti penguasaan kunci; klaim ganda
  atas satu kode ditolak.
- Operator dapat menjalankan satu hari pelayanan penuh: memanggil, melayani, menandai tidak hadir.
- Warga menerima pemberitahuan ketika gilirannya mendekat, dan muatan pemberitahuan tidak memuat data
  pribadi.
- Perubahan satu entri jejak audit terdeteksi pada verifikasi rantai.
- Permintaan lintas peran ditolak pada seluruh endpoint yang diuji.
- Seluruh rangkaian pengujian otomatis berwarna hijau tanpa satu pun pengujian negatif yang dilemahkan.

## 20. Asumsi, Ketergantungan, dan Pertanyaan Terbuka

### 20.1 Asumsi

Operator memverifikasi kartu identitas warga secara fisik pada saat pendaftaran; kantor desa memiliki
petugas yang menjalankan papan antrean sepanjang jam layanan; perangkat warga adalah telepon Android
yang mendukung penyimpanan aman dan notifikasi; registri penduduk awal disediakan dan diverifikasi
bersama perangkat desa; serta tersedia jaringan internet yang memadai di kantor desa.

### 20.2 Ketergantungan

Ketersediaan layanan notifikasi pihak ketiga; ketersediaan peladen dan basis data; kesediaan perangkat
desa menjalankan prosedur pendaftaran dan pelayanan; serta pustaka kriptografi pihak ketiga yang
terpelihara.

### 20.3 Pertanyaan Terbuka

| Pertanyaan | Kepada |
|---|---|
| Panjang satu slot dan jumlah slot per hari layanan | Perangkat desa |
| Hari dan jam layanan, termasuk hari libur desa | Perangkat desa |
| Perangkat yang akan menayangkan penampil publik di kantor | Perangkat desa |
| Apakah verifikasi biometrik dipertahankan sebagai kunci akses aplikasi | Pembimbing dan perangkat desa |
| Kebijakan penyimpanan riwayat dan masa retensi data | Perangkat desa |

## 21. Glosarium

| Istilah | Penjelasan |
|---|---|
| Zero-knowledge proof | Bukti yang meyakinkan pemverifikasi bahwa suatu pernyataan benar tanpa mengungkap informasi apa pun selain kebenaran pernyataan itu |
| Bukti-pengetahuan Schnorr | Protokol pembuktian penguasaan skalar rahasia atas sebuah kunci publik, di sini dipakai dalam bentuk non-interaktif |
| Fiat-Shamir | Transformasi yang mengubah protokol interaktif menjadi non-interaktif dengan menurunkan tantangan dari fungsi hash |
| Pohon Merkle | Struktur pohon berbasis hash yang memungkinkan pembuktian keanggotaan sebuah daun terhadap satu nilai akar ringkas |
| Akar registri | Nilai hash puncak pohon Merkle yang mewakili keseluruhan registri penduduk |
| Jalur keanggotaan | Rangkaian nilai saudara yang memungkinkan penghitungan ulang akar dari sebuah daun |
| Pemisahan domain | Penambahan penanda konteks sebelum pencernaan hash agar nilai hash satu kegunaan tidak dapat dipindahkan ke kegunaan lain |
| Nonce | Nilai sekali pakai yang mengikat sebuah bukti pada satu permohonan tertentu |
| Komitmen | Nilai hash yang mewakili sebuah data tanpa mengungkap datanya |
| Tamper-evident | Sifat suatu catatan yang membuat perubahan terhadapnya dapat terdeteksi |
| Kepemilikan kunci | Model autentikasi yang menegakkan identitas melalui penguasaan kunci privat, bukan pengetahuan atas rahasia bersama |
| Pengujian negatif | Pengujian yang memastikan sistem menolak masukan yang salah, bukan sekadar menerima masukan yang benar |
| Kekukuhan (soundness) | Sifat protokol pembuktian yang menjamin pihak tanpa rahasia tidak dapat menghasilkan bukti yang diterima |
