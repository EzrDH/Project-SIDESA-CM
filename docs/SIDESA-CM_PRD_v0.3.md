# SIDESA-CM — Product Requirements Document (PRD) v0.3

**Produk:** SIDESA-CM — Layanan Digital Desa Cibeteung Muara
**Versi:** 0.3 (reorientasi: layanan janji temu + antrean berbasis ZKP)
**Tanggal:** 2026-07-26
**Penyusun:** Muhammad Ezra Dhiatara — D4 Rekayasa Kriptografi, Politeknik Siber dan Sandi Negara
**Mitra:** Pemerintah Desa Cibeteung Muara, Kecamatan Ciseeng, Kabupaten Bogor
**Status:** Draf untuk ditinjau (menggantikan arah v0.2)

> **Perubahan besar dari v0.2.** Atas masukan dosen pembimbing, fitur penerbitan dan penandatanganan
> surat digital **dihapus**. Penandatanganan dokumen kembali dilakukan **tatap muka**. Aplikasi
> difokuskan menyelesaikan masalah ketidakpastian waktu bertemu Kepala Desa melalui **janji temu dan
> nomor antrean**, dengan **verifikasi kelayakan berbasis zero-knowledge proof (ZKP)** sebagai inti
> kriptografinya. Tidak ada tanda tangan digital ECDSA pada aplikasi.

---

## 1. Ringkasan Eksekutif

SIDESA-CM adalah aplikasi layanan warga Desa Cibeteung Muara yang menyediakan **penjadwalan janji temu
dan nomor antrean** untuk keperluan yang mengharuskan pertemuan langsung dengan Kepala Desa atau
perangkat desa. Masalah yang dipecahkan: warga harus datang ke kantor desa tanpa kepastian giliran,
sehingga waktu terbuang dan pelayanan menumpuk. Aplikasi memberi kepastian giliran, transparansi
antrean, dan pemberitahuan otomatis, dengan model rujukan fitur Antrean pada Mobile JKN.

Nilai kriptografis produk terletak pada **verifikasi kelayakan yang menjaga privasi**: sebelum memesan
antrean, warga membuktikan dirinya penduduk terdaftar yang berhak **tanpa mengungkap NIK**, memakai
bukti-pengetahuan Schnorr (ZKP) dan keanggotaan pohon Merkle.

## 2. Masalah dan Peluang

- **Masalah warga.** Keperluan yang butuh Kepala Desa (konsultasi, pengaduan, legalisir/tatap muka)
  menuntut kehadiran fisik tanpa kepastian waktu. Warga menunggu lama atau bolak-balik.
- **Masalah perangkat desa.** Antrean tak terkelola, beban menumpuk pada jam tertentu, tidak ada data
  kebutuhan layanan.
- **Peluang.** Penjadwalan dan antrean digital memberi kepastian bagi warga dan meratakan beban bagi
  kantor, sekaligus menjadi wadah penerapan ZKP untuk kelayakan yang menjaga data pribadi.

## 3. Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik |
|---|---|
| Memberi kepastian giliran | Warga memperoleh nomor antrean/slot sebelum datang; estimasi waktu tunggu tersedia |
| Mengurangi penumpukan | Distribusi kedatangan lebih merata antar jam layanan |
| Menjaga privasi data kependudukan | NIK tidak pernah dikirim/disimpan mentah; kelayakan terbukti tanpa NIK |
| Menegakkan kelayakan | Hanya penduduk terdaftar yang dapat memesan; percobaan non-anggota ditolak |
| Keandalan | Alur pesan→panggil→dilayani berjalan pada perangkat nyata; notifikasi tiba |

## 4. Pengguna dan Peran

- **Warga (WARGA).** Penduduk terdaftar. Memesan janji temu/antrean, memantau status, menerima
  notifikasi, check-in.
- **Operator (OPERATOR).** Petugas desa. Mengelola slot dan kuota, menjalankan papan antrean
  (panggil/dilayani/tidak hadir), menerbitkan kode enrolment setelah memeriksa kartu identitas, dan
  mengelola registri penduduk.
- **Kepala Desa (KADES).** Melihat agenda pertemuan harian dan ringkasan antrean. Tidak memegang kunci
  privat dan tidak menandatangani apa pun di aplikasi.
- **Administrator (ADMIN).** Konfigurasi sistem, tata kelola akun, dan audit.

## 5. Produk Rujukan

Fitur Antrean Mobile JKN (BPJS Kesehatan): pengguna memilih fasilitas/poli dan memperoleh nomor antrean
serta status giliran untuk keperluan kontrol/temu. SIDESA-CM mengadaptasi pola ini ke konteks layanan
desa Cibeteung Muara.

## 6. Kebutuhan Fungsional

### 6.1 Onboarding dan Autentikasi
- **FR-1 Enrolment perangkat.** Operator memverifikasi kartu identitas warga secara fisik lalu
  menerbitkan kode sekali pakai. Perangkat warga mengklaim kode dengan **bukti kepemilikan kunci
  (ZKP Schnorr)**, mengikat akun ke kunci publiknya. Akun dibuat hanya saat kode diklaim.
- **FR-2 Autentikasi.** Login memakai **pembuktian kepemilikan kunci (ZKP Schnorr)** atas nonce peladen;
  tanpa kata sandi dan tanpa NIK. Sesi berupa token.

### 6.2 Kelayakan Menjaga Privasi
- **FR-3 Gerbang kelayakan.** Sebelum memesan, warga membentuk **bukti kelayakan**: keanggotaan pada
  registri penduduk (pohon Merkle) + bukti kepemilikan kunci atas konteks permohonan ber-nonce. NIK
  tidak pernah dikirim. Percobaan oleh non-anggota atau tanpa penguasaan kunci ditolak.

### 6.3 Janji Temu dan Antrean
- **FR-4 Jenis layanan.** Sistem menyediakan daftar jenis layanan yang dapat dikonfigurasi (mis.
  konsultasi, pengaduan, keperluan tatap muka Kepala Desa).
- **FR-5 Pemesanan.** Warga memilih jenis layanan dan tanggal/slot; setelah gerbang kelayakan lolos,
  sistem menerbitkan **nomor antrean** (dan/atau slot waktu).
- **FR-6 Kuota dan slot.** Operator menetapkan kuota harian dan slot per jenis layanan; sistem menolak
  pemesanan yang melampaui kuota atau bentrok slot.
- **FR-7 Status real-time.** Warga melihat nomor yang sedang dilayani, posisi gilirannya, dan estimasi
  waktu tunggu.
- **FR-8 Papan antrean operator.** Operator memanggil nomor berikutnya, menandai **dilayani / tidak
  hadir / lewati**.
- **FR-9 Check-in.** Warga melakukan check-in saat tiba di kantor desa.
- **FR-10 Riwayat.** Warga dan operator dapat melihat riwayat janji temu dan kunjungan.

### 6.4 Notifikasi
- **FR-11 Pemberitahuan.** Notifikasi push (FCM) untuk "giliran Anda sebentar lagi", konfirmasi, dan
  pembatalan. Muatan notifikasi minimal dan tanpa data pribadi (hanya penanda kejadian dan acuan),
  detail diambil aplikasi lewat kanal terautentikasi.

### 6.5 Registri dan Audit
- **FR-12 Registri penduduk.** Operator/Admin menambah atau mencabut penduduk dari registri Merkle;
  seluruh perubahan dicatat.
- **FR-13 Log audit.** Aksi sensitif (terbit/klaim kode, ubah registri, kelola antrean) dicatat pada log
  audit **append-only berantai-hash** yang dapat diverifikasi ulang.

## 7. Kebutuhan Nonfungsional

- **NFR-1 Privasi (UU PDP).** NIK tidak pernah dikirim atau disimpan mentah; hanya komitmen tersimpan.
  Muatan notifikasi bebas data pribadi.
- **NFR-2 Kriptografi.** Inti kripto berupa ZKP Schnorr (NIZK) + keanggotaan Merkle di atas kurva P-384
  dan hash SHA-384. **Tidak ada tanda tangan digital ECDSA pada aplikasi.** Enkripsi data saat diam (bila
  diperlukan) memakai AES-256.
- **NFR-3 Kepatuhan.** Karena aplikasi tidak memproduksi tanda tangan teregulasi, posisi terhadap
  Keputusan Kepala BSSN Nomor 443 Tahun 2025 perlu dikonfirmasi (lihat Risiko R-1).
- **NFR-4 Keamanan.** Anti-replay dengan nonce sekali pakai; anti-penyamaran pada enrolment; pembatasan
  laju permintaan; validasi masukan berbasis skema.
- **NFR-5 Keandalan/Keterpakaian.** Alur inti berjalan pada perangkat nyata; antarmuka mengikuti panduan
  Material 3; dapat dipakai warga awam.
- **NFR-6 Konektivitas.** Fungsi inti mensyaratkan jaringan; kegagalan jaringan ditangani anggun.

## 8. Di Luar Cakupan (v0.3)

- Penerbitan dan penandatanganan surat digital; render PDF; kode QR; verifikasi publik dokumen.
- Kunci identitas berbasis perangkat keras (StrongBox) dan gerbang biometrik pada operasi kriptografis.
- Anonimitas penuh (unlinkability) pada pemesanan; sistem bersifat "identified, NIK-private".
- Integrasi Penyelenggara Sertifikasi Elektronik (PSrE/BSrE).

## 9. Asumsi dan Ketergantungan

- Operator memverifikasi kartu identitas warga secara fisik pada saat enrolment.
- Kantor desa memiliki petugas yang menjalankan papan antrean.
- Perangkat warga adalah Android yang mendukung penyimpanan aman perangkat lunak dan notifikasi.
- Registri penduduk awal disediakan/diverifikasi bersama perangkat desa.

## 10. Risiko

| ID | Risiko | Mitigasi |
|---|---|---|
| R-1 | Pergeseran kepatuhan Kepka 443 (tanpa tanda tangan) dianggap keluar kerangka | Konfirmasi ke dosen pembimbing; dokumentasikan bahwa tak ada tanda tangan teregulasi diproduksi, ZKP di atas P-384/SHA-384 |
| R-2 | Kunci identitas tak lagi terisolasi perangkat keras (konsekuensi Schnorr) | Model ancaman lebih rendah (tak ada dokumen dipalsukan); simpan kunci di secure storage; nyatakan sebagai keterbatasan |
| R-3 | Ketertautan antarpemesanan (pseudonim, bukan anonim) | Konsisten dengan pilihan "identified"; opsi anonymous credential dicatat sebagai pekerjaan lanjutan |
| R-4 | Adopsi warga rendah / literasi digital | Antarmuka sederhana; pendampingan operator; pelatihan lapangan |
| R-5 | Ketergantungan Google FCM untuk notifikasi | Muatan minimal; degradasi anggun bila push tak tersedia |

## 11. Peta Jalan Ringkas

- **Tahap 1 — Kripto ZKP.** Hidupkan Schnorr lintas bahasa + uji interop; migrasikan auth, enrolment, dan
  kelayakan ke Schnorr; pensiunkan ECDSA.
- **Tahap 2 — Pembersihan.** Hapus subsistem surat, PDF/QR, verifikasi publik, dan kunci hardware.
- **Tahap 3 — Antrean.** Bangun jenis layanan, kuota/slot, pemesanan+nomor antrean, papan antrean
  operator, status real-time, check-in, riwayat.
- **Tahap 4 — Notifikasi.** Sambungkan notifikasi antrean ke infrastruktur FCM yang telah ada.
- **Tahap 5 — Uji lapangan.** Uji bersama perangkat desa; kumpulkan umpan balik keterpakaian.

## 12. Lampiran: Perbandingan Ringkas v0.2 → v0.3

| Aspek | v0.2 (surat bertanda tangan) | v0.3 (antrean + ZKP) |
|---|---|---|
| Inti produk | Penerbitan surat bertanda tangan digital | Janji temu + nomor antrean |
| Penandatanganan | ECDSA P-384 oleh Kepala Desa di aplikasi | Tatap muka langsung, di luar aplikasi |
| Inti kripto | Tanda tangan ECDSA + kelayakan (Merkle + ECDSA) | ZKP Schnorr (auth, enrolment, kelayakan) + Merkle |
| Kunci identitas | Berbasis perangkat keras + biometrik | Secure storage perangkat lunak |
| Verifikasi publik | Halaman verifikasi surat via QR | Tidak ada (kelayakan diperiksa peladen) |
| Privasi | Pseudonim, NIK tak disimpan mentah | Sama; ZKP menegaskan NIK tak pernah didigitalkan |
| Referensi | — | Fitur Antrean Mobile JKN |
