# Desain: Reorientasi SIDESA-CM menjadi Layanan Janji Temu + Antrean Berbasis ZKP

- **Tanggal:** 2026-07-26
- **Status:** Disetujui pada tahap gambaran; menunggu tinjauan spec (dan validasi ke dosen pembimbing)
- **Pemicu:** Masukan dosen pembimbing agar implementasi kriptografi difokuskan pada *zero-knowledge proof* (ZKP) dan tidak lagi menerapkan tanda tangan digital ECDSA.
- **Sifat perubahan:** Perubahan konsep produk yang besar, bukan penambahan fitur. Fitur penerbitan/penandatanganan surat digital dihapus; aplikasi menjadi layanan janji temu berbasis slot waktu beserta tampilan status pelayanan.

## 1. Latar dan Motivasi

Versi terdahulu SIDESA-CM menerbitkan surat keterangan yang ditandatangani secara digital oleh Kepala
Desa (ECDSA P-384) beserta verifikasi kelayakan warga. Berdasarkan masukan dosen pembimbing, ruang
lingkup diarahkan ulang: penandatanganan dokumen resmi dikembalikan ke proses **tatap muka langsung**,
dan aplikasi tidak lagi memproduksi tanda tangan digital. Aplikasi berfokus menyelesaikan satu masalah
nyata warga, yaitu **ketidakpastian waktu bertemu Kepala Desa**: warga harus datang fisik tanpa
kepastian giliran. Aplikasi menyediakan **janji temu terjadwal dan nomor antrean**, dengan model rujukan
fitur Antrean pada aplikasi Mobile JKN.

Konsekuensinya, satu-satunya inti kriptografi yang tersisa adalah **verifikasi kelayakan yang menjaga
privasi**: sebelum warga memesan antrean, ia membuktikan dirinya penduduk terdaftar yang berhak, tanpa
mengungkap NIK. Ini justru lebih selaras dengan ZKP dibandingkan aplikasi surat sebelumnya, dan sejalan
dengan kajian pustaka sistematis penulis mengenai ZKP untuk verifikasi kelayakan di e-government.

### 1.1 Ironi metodologis yang menguntungkan
Pada Fase B, proyek sengaja bermigrasi dari protokol Schnorr ke tanda tangan ECDSA karena kunci berbasis
perangkat keras (Android Keystore/StrongBox) hanya mengekspos operasi ECDSA dan tidak memberikan akses
skalar privat. Karena kini tidak ada penandatanganan dokumen sama sekali, kebutuhan kunci berbasis
perangkat keras hilang, sehingga **kendala yang dahulu memaksa migrasi ke ECDSA lenyap** dan ZKP Schnorr
sejati kembali layak diterapkan. Penghapusan fitur tanda tangan justru membuka kembali ruang desain
kriptografis.

## 1.2 Keputusan yang sudah ditetapkan (27 Juli 2026)

Keputusan berikut menggantikan asumsi yang sebelumnya dipakai dalam dokumen ini. Sumbernya adalah
arahan pembimbing (R-1, R-2) dan jawaban perangkat desa atas empat butir penentu pada kuesioner
kebutuhan.

| Butir | Keputusan | Konsekuensi rancangan |
|---|---|---|
| R-1 Kepatuhan algoritma | Kepka 443 tetap dipakai sebagai dasar **pemilihan algoritma**, bukan sebagai klaim tanda tangan elektronik teregulasi | P-384 dan SHA-384 dipertahankan; klaim "tanda tangan bernilai hukum" dihapus dari seluruh dokumen |
| R-2 Penyimpanan kunci | Diterima sebagai konsekuensi yang melekat pada pemilihan Schnorr | Kunci identitas berada pada penyimpanan aman perangkat lunak; dinyatakan terbuka sebagai keterbatasan |
| Model antrean | **Slot waktu**: warga memilih jam tertentu, misalnya 09.30 | Model data berbasis slot, bukan nomor antrean harian semata; layar pemesanan menampilkan jam yang tersedia |
| Ketersediaan Kepala Desa | Tidak diperlakukan sebagai komitmen kaku. Bila ada kegiatan insidental, prioritas menyesuaikan dan warga terdampak **diusulkan pindah ke jam lain** | Diperlukan fitur penjadwalan ulang dengan usulan slot alternatif, beserta pemberitahuannya |
| Warga datang langsung | Tetap dilayani **asalkan ada slot kosong**; pemesan melalui aplikasi **diprioritaskan** | Walk-in mengisi slot yang belum diklaim; tidak ada penyisipan yang menggeser pemesan aplikasi |
| Jenis layanan tahap awal | Satu jenis saja, yaitu **janji temu**, ditambah **tampilan status pelayanan secara langsung** yang dipasang di kantor desa | Entitas jenis layanan disederhanakan; ditambahkan layar penampil publik "sedang dilayani nomor berapa" |

Dua akibat penting perlu dicatat. Pertama, model slot waktu menyederhanakan penanganan warga yang
datang langsung: karena setiap slot dapat diklaim, walk-in cukup mengisi slot yang kosong tanpa perlu
aturan penyisipan yang rumit. Kedua, tampilan status di kantor semula ditandai berada di luar cakupan;
dengan keputusan ini ia menjadi bagian dari lingkup dan dirancang sebagai halaman baca-saja tanpa
autentikasi.

## 2. Ruang Lingkup

### 2.1 Keputusan yang mengikat (hasil brainstorming)
1. Aplikasi **tidak** memproduksi tanda tangan digital. Penandatanganan dokumen dilakukan tatap muka.
2. Inti kripto adalah **ZKP untuk kelayakan**, dengan target privasi **"NIK-privat, tetap
   teridentifikasi"**: warga membuktikan kelayakan tanpa mengirim NIK, tetapi memesan dengan akun yang
   dikenali kantor desa (bukan anonim penuh).
3. **Autentikasi dan pendaftaran perangkat (enrolment) juga memakai ZKP Schnorr**, sehingga seluruh
   lapisan kripto memakai satu primitif dan **tidak ada ECDSA sama sekali**.
4. Konstruksi ZKP yang dipilih: **bukti-pengetahuan Schnorr (NIZK Fiat-Shamir) + keanggotaan Merkle**,
   bukan anonymous credential (BBS+/CL) maupun zk-SNARK, demi proporsionalitas dan dukungan lintas
   platform (TypeScript dan Dart).

### 2.2 Di luar cakupan (dihapus dari produk)
Penerbitan surat; siklus surat (SUBMITTED/DRAFTED/SIGNED/REJECTED); penandatanganan surat oleh Kepala
Desa; render PDF dan kode QR; halaman verifikasi publik surat; tanda tangan akar registri oleh Kepala
Desa; kunci identitas berbasis perangkat keras dan gerbang biometrik pada operasi kriptografis; seluruh
pustaka ECDSA (`ecdsa.ts` pada TypeScript dan Dart).

## 3. Arsitektur

Monorepo tetap tiga paket: pustaka kriptografi TypeScript (`@sidesa/crypto`), peladen NestJS +
PostgreSQL, aplikasi Flutter. Peran tetap empat: WARGA, OPERATOR, KADES, ADMIN, ditegakkan melalui
kendali akses berbasis peran. Perbedaan utama: Kepala Desa tidak lagi memegang kunci privat untuk
menandatangani apa pun; perannya menjadi pemilik agenda pertemuan.

## 4. Rancangan Kriptografi

### 4.1 Satu primitif: bukti-pengetahuan Schnorr
Seluruh operasi kripto adalah bukti-pengetahuan Schnorr non-interaktif (NIZK melalui transformasi
Fiat-Shamir) bahwa perangkat menguasai skalar rahasia $x$ untuk kunci publiknya $X = x\cdot G$, di atas
kurva P-384 dengan tantangan diturunkan lewat SHA-384 berdomain. Primitif ini **sudah ada dan teruji**
pada `packages/crypto/src/schnorr.ts`:

- `proveKnowledge(secret, publicKey, context) -> { R, s }`
- `verifyKnowledge(publicKey, proof, context) -> boolean`

dengan `context` sebuah untai bita yang mengikat bukti pada satu kegunaan dan satu permohonan. Domain
tantangan internal adalah `SIDESA-schnorr-v1`. Migrasi Fase B hanya menghentikan *penggunaannya*, bukan
menghapus modul dan pengujiannya; pekerjaan ini menghidupkannya kembali dan memperluasnya ke tiga
gerbang.

### 4.2 Tiga gerbang, konteks berbeda

**Gerbang 1 — Autentikasi (login).**
1. Peladen menerbitkan `nonce` sekali pakai.
2. Perangkat menghasilkan bukti Schnorr atas konteks `SIDESA-auth-v1|<accountId>|<nonce>`.
3. Peladen memanggil `verifyKnowledge(X, bukti, konteks)` terhadap $X$ terdaftar, menandai `nonce`
   terpakai, lalu menerbitkan token sesi.

Menggantikan tanda tangan ECDSA atas nonce. Membuktikan penguasaan kunci tanpa membuka $x$; `nonce`
mencegah pemutaran ulang.

**Gerbang 2 — Pendaftaran perangkat (enrolment).**
1. Operator memverifikasi kartu identitas secara fisik, lalu menerbitkan kode sekali pakai (identitas
   hasil pemeriksaan melekat pada kode).
2. Perangkat mengklaim dengan bukti Schnorr atas konteks `SIDESA-enroll-v1|<kode>|<Xhex>`.
3. Peladen memverifikasi bukti terhadap $X$ yang diajukan, mengikat akun ke $X$, dan membuat daun
   registri `leaf = H_d(\text{resident-leaf}, X \| A)` dengan $A$ atribut kelayakan.

Menggantikan tanda tangan ECDSA atas pasangan (kode, kunci). Tetap menutup serangan pendaftaran kunci
milik orang lain: tanpa $x$, bukti tak dapat dibentuk untuk $X$ yang diajukan.

**Gerbang 3 — Kelayakan (saat memesan antrean).**
Bukti kelayakan $\pi = (X, A, mp, \text{schnorr})$ terhadap akar registri $R$ (dipelihara peladen) dan
konteks `SIDESA-eligibility-v1|<accountId>|<serviceType>|<nonce>`:
1. hitung `leaf = H_d(\text{resident-leaf}, X \| A)`;
2. terima hanya jika `mp` memverifikasi `leaf` terhadap $R$;
3. terima hanya jika bukti Schnorr sah atas konteks oleh $X$;
4. tolak bila `nonce` telah terpakai (anti-replay).

Yang terungkap hanya $X$ dan atribut kasar $A$; **NIK tidak pernah menjadi bagian dari bukti**.

### 4.3 Registri penduduk
Registri adalah pohon Merkle dari daun `H_d(\text{resident-leaf}, X \| A)`, dengan penandaan ranah
daun/simpul untuk ketahanan pra-citra kedua. Berbeda dari versi lama, **akar tidak perlu ditandatangani
Kepala Desa**: tidak ada lagi pemverifikasi publik luring yang harus mempercayai akar secara mandiri;
kelayakan diverifikasi peladen pada saat pemesanan, sehingga peladen cukup menjadi pemelihara registri
berwenang. Pemutakhiran registri (penambahan/pencabutan penduduk) adalah aksi ber-otorisasi peran
OPERATOR/ADMIN yang dicatat pada log audit.

### 4.4 Minimalisasi data dan privasi NIK
NIK diverifikasi **secara fisik** saat enrolment (petugas melihat kartu identitas) dan **tidak pernah
didigitalkan** dalam bukti apa pun. Peladen menyimpan hanya `nikCommitment` (nilai hash) untuk keperluan
audit dan pencegahan pendaftaran ganda, tidak untuk verifikasi kelayakan. Dengan demikian basis data
tidak pernah memuat NIK mentah (UU PDP).

### 4.5 Format wire dan pemisahan domain
Kunci publik $X$ direpresentasikan terkompresi 49 bita. Bukti Schnorr terdiri atas titik komitmen
terkompresi $R$ (49 bita) dan skalar respons $s$ (48 bita). Seluruh pencernaan hash memakai pemisahan
domain: masukan biner diberi awalan panjang 32-bit big-endian sebelum dirangkai; konteks berbasis untai
memakai penanda ranah berpembatas (`SIDESA-*-v1|...`).

### 4.6 Keterbatasan yang harus dinyatakan: kunci tidak lagi berbasis perangkat keras
Schnorr memerlukan akses langsung ke skalar $x$ untuk menghitung $s = k + c\cdot x$. Android
Keystore/StrongBox tidak pernah mengekspos skalar tersebut, sehingga kunci identitas kini disimpan pada
penyimpanan yang dapat diakses aplikasi (`flutter_secure_storage`, boleh dibungkus Keystore namun tetap
dapat digunakan perangkat lunak), **bukan** terisolasi pada StrongBox dengan gerbang biometrik pada
operasi kriptografis. Biometrik tetap dapat mengunci akses aplikasi, tetapi kunci identitas tidak lagi
terkurung perangkat keras. Untuk aplikasi antrean tanpa penandatanganan dokumen, model ancamannya lebih
rendah: kunci yang dicuri hanya memungkinkan pemesanan antrean atas nama korban, bukan pemalsuan dokumen
resmi. Trade-off ini wajar tetapi wajib dilaporkan sebagai keterbatasan.

## 5. Fitur Produk

### 5.1 Warga
- **Kelayakan sekali-set**: setelah enrolment, perangkat menyimpan $x$ dan atribut untuk membentuk bukti
  kelayakan saat memesan.
- **Pesan janji temu**: pilih tanggal dan **slot waktu** yang tersedia (mis. 09.30); sistem menerbitkan
  tiket beserta nomor urut harian setelah gerbang kelayakan lolos.
- **Status pelayanan secara langsung**: nomor yang sedang dilayani, posisi giliran, estimasi waktu
  tunggu.
- **Usulan penjadwalan ulang**: bila slot terdampak kegiatan insidental Kepala Desa, warga menerima
  usulan slot alternatif beserta pemberitahuannya.
- **Notifikasi** (memakai kembali infrastruktur FCM yang telah dibangun): "giliran Anda sebentar lagi",
  konfirmasi/pembatalan jadwal.
- **Check-in** saat tiba di kantor desa.
- **Riwayat** kunjungan dan janji temu.

### 5.2 Operator
- Kelola slot dan kuota harian, termasuk menutup slot yang terdampak kegiatan insidental dan
  mengusulkan slot pengganti kepada warga terdampak.
- Menerima warga yang datang langsung ke dalam slot yang masih kosong, tanpa menggeser pemesan
  aplikasi.
- Papan antrean: panggil berikutnya, tandai **dilayani / tidak hadir**, lewati.
- Terbitkan kode enrolment setelah verifikasi kartu identitas.
- Kelola registri penduduk (tambah/cabut daun) dengan pencatatan audit.

### 5.3 Penampil Publik di Kantor Desa
Halaman baca-saja tanpa autentikasi yang ditayangkan pada layar di ruang tunggu, menampilkan nomor yang
sedang dilayani, slot yang sedang berjalan, dan daftar nomor berikutnya. Halaman ini tidak menampilkan
nama maupun keperluan warga, hanya nomor dan waktu, sehingga tidak menambah pengungkapan data pribadi
di ruang publik.

### 5.4 Kepala Desa
- Melihat agenda pertemuan harian dan ringkasan antrean. Tidak memegang kunci privat dan tidak
  menandatangani apa pun di aplikasi.

## 6. Model Data (perubahan Prisma)

**Dihapus:** `LetterRequest`, `Letter`, `LetterType`, `LetterStatus`, dan jalur verifikasi publik
(`qrToken`).

**Dipertahankan:** `Account` (dengan `publicKey` sebagai $X$, `role`, `status`, `displayName`,
`nikCommitment`, `attributes`, `leafIndex`), `AuthChallenge`, `EligibilityChallenge`, `EnrollmentCode`,
`RegistryVersion` (kolom tanda tangan akar menjadi tidak terpakai), `AuditLog`, `DeviceToken` (FCM).

**Diubah/diperluas:** model antrean berbasis slot. `Booking` diperluas atau digantikan `Appointment`
dengan medan: tanggal, **slot waktu** yang diklaim, nomor urut harian, asal pemesanan
(`APP` atau `WALK_IN`), status (`BOOKED` → `CALLED` → `SERVED` / `NO_SHOW` / `CANCELLED` /
`RESCHEDULE_SUGGESTED`), token check-in, dan stempel waktu transisi. Ditambah entitas `Slot` yang
merepresentasikan satu satuan waktu layanan pada satu tanggal beserta penanda tersedia, diklaim, atau
ditutup.

Slot menjadi satuan penjadwalan sekaligus satuan kuota, sehingga tidak diperlukan kuota harian
terpisah. Walk-in direkam sebagai `Appointment` dengan asal `WALK_IN` yang mengklaim slot kosong,
sehingga prioritas pemesan aplikasi terjaga secara struktural: slot yang telah diklaim melalui aplikasi
tidak dapat diambil alih. Penutupan slot karena kegiatan insidental Kepala Desa menandai slot sebagai
ditutup dan memindahkan janji temu terdampak ke status `RESCHEDULE_SUGGESTED` beserta usulan slot
pengganti.

**Migrasi Prisma** mengikuti aturan non-interaktif proyek (`migrate diff --script` → folder migrasi baru
→ `migrate deploy` → `generate`), termasuk migrasi penghapusan tabel surat.

## 7. Perubahan pada Pustaka Kripto

- **Dihidupkan kembali dan diperluas:** `schnorr.ts` (TypeScript) untuk auth, enrolment, dan kelayakan;
  padanannya ditambahkan pada sisi Dart agar interoperabel (perangkat membentuk bukti, peladen
  memverifikasi).
- **Diubah:** `eligibility.ts` — komponen kepemilikan dari tanda tangan ECDSA-atas-konteks menjadi bukti
  Schnorr atas konteks; `computeLeaf` tetap.
- **Dipensiunkan:** `ecdsa.ts` (TypeScript dan Dart) beserta seluruh pemakaiannya pada auth
  (`auth.service`), enrolment (`enroll.service`), dan penandatanganan surat (dihapus bersama subsistem
  surat).
- **Interoperabilitas lintas bahasa** tetap dijaga melalui vektor uji: bukti Schnorr yang dibentuk Dart
  diverifikasi `@sidesa/crypto`.

## 8. Sifat Keamanan dan Model Ancaman

- **Kelayakan tak sah ditolak**: bukan-anggota registri gagal pada keanggotaan Merkle; peniru yang
  menyalin $X$ gagal pada bukti Schnorr karena tak menguasai $x$.
- **Anti-replay**: konteks ber-`nonce` sekali pakai pada auth dan kelayakan.
- **Anti-penyamaran saat enrolment**: bukti Schnorr atas $X$ mencegah pendaftaran kunci milik orang lain.
- **Kerahasiaan NIK**: NIK tidak pernah didigitalkan dalam bukti; hanya komitmen tersimpan.
- **Keterbatasan privasi**: sistem pseudonim, bukan anonim penuh — $X$ terungkap sehingga pemesanan dari
  akun yang sama dapat ditautkan. Ini konsisten dengan pilihan "identified".
- **Audit**: aksi sensitif (terbit/klaim kode, ubah registri, kelola antrean) dicatat pada log audit
  berantai-hash.

## 9. Kepatuhan

Keputusan Kepala BSSN Nomor 443 Tahun 2025 mengatur algoritma tanda tangan dan enkripsi. Karena aplikasi
tidak lagi memproduksi tanda tangan teregulasi, narasi kepatuhan bergeser: **tidak ada tanda tangan
teregulasi yang diproduksi aplikasi**; kelayakan memakai ZKP di atas grup kurva P-384 dan fungsi hash
SHA-384; enkripsi data saat diam (bila ada) memakai AES-256. Pergeseran ini telah dikonfirmasi: Kepka 443 tetap dipakai
sebagai dasar pemilihan algoritma, sedangkan klaim mengenai kekuatan hukum tanda tangan elektronik
dihapus karena aplikasi memang tidak lagi memproduksinya.

## 10. Strategi Pengujian

- Kripto: pengujian positif dan negatif untuk bukti Schnorr pada tiap gerbang (pemalsuan tanpa rahasia
  ditolak, respons dirusak ditolak, konteks berbeda ditolak), keanggotaan Merkle, dan uji
  interoperabilitas lintas bahasa Dart→TypeScript.
- Peladen: e2e alur warga (enrolment Schnorr → login Schnorr → pesan antrean dengan bukti kelayakan →
  operator memanggil → dilayani), termasuk uji negatif (bukan-anggota ditolak, nonce dipakai ulang
  ditolak, lintas peran ditolak).
- Aplikasi: alur tiap peran, pembentukan bukti Schnorr, dan degradasi anggun tanpa jaringan.

## 11. Dampak terhadap Basis Kode Saat Ini

- **Dihapus:** modul surat peladen (`letters/`), verifikasi publik, template surat; layar surat pada
  aplikasi; render PDF (`letter_pdf.dart`); kunci hardware (`android_keystore.dart`, wiring biometrik).
- **Diubah:** `auth.service`, `enroll.service`, dan `eligibility` (ECDSA → Schnorr); Session pada
  aplikasi (login/enrol/pesan memakai bukti Schnorr); skema Prisma (hapus surat, tambah antrean).
- **Ditambah:** subsistem antrean (model, service, controller, layar warga dan operator); padanan Schnorr
  pada sisi Dart.
- **Dipertahankan utuh:** registri Merkle, enrolment Model B (kode operator), notifikasi FCM, log audit,
  pembatasan laju, validasi masukan.

## 12. Pekerjaan yang Menyusul (fase implementasi)

Dituangkan menjadi rencana implementasi tersendiri (skill writing-plans) setelah spec ini disetujui dan
divalidasi ke dosen. Urutan yang disarankan: (1) hidupkan Schnorr lintas bahasa + uji interop; (2)
migrasikan auth & enrolment ke Schnorr; (3) migrasikan kelayakan ke Schnorr; (4) hapus subsistem surat +
kunci hardware; (5) bangun subsistem antrean; (6) sambungkan notifikasi antrean ke FCM.

## 13. Pertanyaan Terbuka

Pertanyaan penentu arsitektur telah terjawab dan dicatat pada Subbagian 1.2. Yang tersisa bersifat
konfigurasi atau operasional, sehingga dapat ditetapkan menjelang penggelaran tanpa mengubah rancangan.

- Panjang satu slot dan jumlah slot per hari layanan.
- Hari dan jam layanan, termasuk hari libur desa di luar libur nasional.
- Apakah biometrik tetap dipertahankan sebagai kunci akses aplikasi meski bukan gerbang kriptografis.
- Berapa lama warga ditunggu setelah dipanggil sebelum ditandai tidak hadir.
- Batas waktu pembatalan oleh warga agar slot dapat dipakai orang lain.
- Perangkat apa yang akan menayangkan penampil publik di kantor desa.
