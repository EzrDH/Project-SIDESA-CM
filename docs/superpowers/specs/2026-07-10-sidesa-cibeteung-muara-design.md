# PRD / Spesifikasi Desain — SIDESA-CM
### Sistem Digital Layanan Desa Cibeteung Muara (berbasis ECDSA & ZKP)

| | |
|---|---|
| **Nama kerja** | SIDESA-CM (nama final dapat diganti) |
| **Lokasi** | Desa Cibeteung Muara, Kec. Ciseeng, Kab. Bogor, Jawa Barat |
| **Konteks** | Pengabdian kepada Masyarakat (ABDIMAS) — Desa Binaan, Poltek SSN, D4 Rekayasa Kriptografi (minat Rekayasa Perangkat Lunak Kripto) |
| **Tanggal** | 2026-07-10 |
| **Status** | Draft desain — menunggu review |
| **Versi** | 0.2 (menambah §5A Autentikasi & Provisioning Peran) |
| **Kategori Sistem Elektronik** | **Rendah** (prototipe) — dikaji ulang saat implementasi nyata |
| **Kepatuhan kripto** | Kepka BSSN No. 443 Tahun 2025 (Algoritma Kriptografi Indonesia) |

---

## 1. Ringkasan Eksekutif

SIDESA-CM adalah aplikasi mobile (Android lebih dulu, Flutter agar mudah melebar ke iOS/web) untuk mempermudah layanan administrasi Desa Cibeteung Muara. Masalah utama: **warga sering membutuhkan persetujuan/tanda tangan Kepala Desa, sedangkan Kepala Desa tidak selalu berada di tempat dan waktu bertemunya tidak pasti.**

Solusi berbentuk **hybrid**:
1. **Layanan surat digital** — warga mengajukan surat lewat aplikasi; Operator Desa menyusun draft; **Kepala Desa menandatangani secara digital (ECDSA P-384) dari mana saja**; warga menerima surat ber-QR yang keasliannya dapat diverifikasi publik.
2. **Booking pertemuan** — untuk keperluan yang wajib tatap muka (konsultasi, mediasi), warga memesan slot dari kalender Kepala Desa.

Dua primitif kriptografi inti:
- **ECDSA (P-384, SHA-384)** → keaslian & *non-repudiation* tanda tangan Kepala Desa; surat palsu tak dapat dibuat, dan siapa pun dapat memverifikasi.
- **ZKP (Schnorr + Merkle membership)** → warga membuktikan **memenuhi syarat** suatu layanan tanpa membuka seluruh data pribadinya (minimalisasi data — UU PDP No. 27/2022).

Seluruh algoritma dipilih agar **patuh Kepka BSSN No. 443 Tahun 2025**.

---

## 2. Latar Belakang & Rumusan Masalah

**Kondisi saat ini.** Untuk mengurus surat (pengantar, keterangan tidak mampu, domisili, usaha, dll.), warga harus datang ke kantor desa dan menunggu tanda tangan basah Kepala Desa. Karena Kepala Desa memiliki agenda di luar kantor, warga sering datang berulang kali tanpa kepastian waktu.

**Dampak.** Pemborosan waktu warga, layanan lambat, dan ketergantungan penuh pada kehadiran fisik satu orang.

**Rumusan masalah.**
1. Bagaimana warga memperoleh persetujuan/tanda tangan Kepala Desa tanpa bergantung pada kehadiran fisiknya?
2. Bagaimana memastikan surat yang terbit **asli, tidak dapat dipalsukan, dan dapat diverifikasi**?
3. Bagaimana memverifikasi kelayakan warga atas suatu layanan **tanpa mengorbankan privasi data kependudukannya**?

---

## 3. Tujuan, Sasaran, & Kriteria Sukses

**Tujuan.** Mempercepat dan mengamankan layanan administrasi desa dengan pendekatan kriptografi yang sesuai regulasi nasional.

**Sasaran (measurable).**
- Waktu rata-rata penerbitan surat sederhana turun dari *hari/berkali kunjungan* menjadi **< 1 hari kerja tanpa warga menunggu di kantor**.
- **100% surat digital** dapat diverifikasi keasliannya lewat QR/halaman publik.
- **0** kebutuhan menyimpan KTP/KK mentah di server untuk verifikasi kelayakan (diganti commitment/ZKP).
- Minimal **3 jenis surat** berjalan penuh end-to-end pada prototipe.

**Kriteria sukses ABDIMAS.**
- Perangkat desa (operator) mampu mengoperasikan sistem secara mandiri setelah pelatihan.
- Sistem murah dirawat (biaya operasional rendah, lihat §14).
- Dokumentasi akademik lengkap dan dapat dipertanggungjawabkan (kepatuhan Kepka 443/2025, UU PDP, UU ITE).

---

## 4. Ruang Lingkup

**Masuk (MVP):**
- Registrasi & verifikasi identitas warga (oleh Operator).
- Registri penduduk berbasis **Merkle tree** (ditandatangani desa).
- Pengajuan **≥ 3 jenis surat**: (1) Surat Pengantar, (2) Surat Keterangan Tidak Mampu (SKTM), (3) Surat Keterangan Domisili.
- **ZK-proof kelayakan** (keanggotaan penduduk + minimal 1 atribut, mis. domisili RT / usia ≥ syarat).
- Alur 3 peran: Warga → Operator → Kepala Desa.
- **Tanda tangan digital ECDSA P-384** oleh Kepala Desa (kunci di Android Keystore).
- Penerbitan **PDF surat + QR + nomor surat** dan **halaman verifikasi publik**.
- **Booking** pertemuan dasar + notifikasi.
- **Audit log** append-only.

**Di luar lingkup (ditunda):**
- Integrasi resmi **PSrE/BSrE** (sertifikat elektronik berbadan hukum) — jalur produksi.
- Integrasi otomatis **Dukcapil** (verifikasi NIK daring).
- Pembayaran retribusi/e-payment.
- Aplikasi iOS/Web (arsitektur disiapkan, implementasi menyusul).
- Aduan anonim, analitik lanjutan, tanda tangan berjenjang (Sekdes).

---

## 5. Aktor & Peran

| Aktor | Tanggung jawab | Kepemilikan kunci |
|---|---|---|
| **Warga** | Registrasi, ajukan surat, kirim ZK-proof, pesan janji temu, unduh & bagikan surat | Keypair warga (di perangkat) untuk otentikasi & commitment identitas |
| **Operator Desa** (Kaur/Kasi) | Verifikasi berkas & identitas, kelola registri penduduk (Merkle), susun draft surat dari template, kelola jadwal | Akun ber-*role*; **tidak** memegang kunci penandatangan |
| **Kepala Desa** | Review draft, **tanda tangan digital**, konfirmasi janji temu | **Kunci privat ECDSA P-384** di Android Keystore/StrongBox (aset paling kritis) |
| **Publik / Verifikator** | Scan QR surat → cek keaslian di halaman web publik | Cukup kunci publik Kepala Desa (dipublikasikan) |

---

## 5A. Autentikasi & Provisioning Peran

> **Prinsip inti:** peran (role) **tidak diturunkan dari NIK**. NIK adalah **pengenal publik** (tercetak di KTP, dipakai di banyak layanan) — bukan rahasia. Menjadikan NIK penentu peran = celah keamanan (siapa pun yang tahu NIK Kepala Desa bisa mengaku sebagai Kepala Desa). **Autentikasi** (membuktikan identitas) dan **otorisasi** (peran) dipisah tegas.

### 5A.1 Autentikasi (login)
- Login = membuktikan **kepemilikan kunci di perangkat** (challenge-response: server kirim tantangan → app menandatanganinya dengan kunci, dibuka via **PIN/biometrik**) — **bukan** sekadar mengetik NIK.
- NIK boleh menjadi **label pengenal akun**, tetapi harus disertai faktor pembuktian kunci.
- Alur: `challenge → sign → server kenali akun → baca atribut role → routing dashboard (WARGA/OPERATOR/KADES)`. Atribut `role` sudah ditetapkan Admin sebelumnya, sehingga tak ada cara "naik pangkat" hanya dengan mengetik NIK orang lain.

### 5A.2 Cara Setiap Peran Diperoleh (Provisioning)

| Peran | Cara diperoleh | Verifikasi |
|---|---|---|
| **Warga** | Self-register di app (perangkat membangkitkan keypair) → kirim NIK + foto KTP | Operator mencocokkan dengan KTP/data kependudukan → setujui → `role=WARGA` + commitment masuk Merkle. Nekat memakai NIK KaDes tetap hanya dapat `role=WARGA`. |
| **Operator Desa** | **Dibuat oleh Admin** (tidak self-register), atas dasar penunjukan resmi | Verifikasi tatap muka; `role=OPERATOR` |
| **Kepala Desa** | **Ritual enrollment tatap muka** di kantor desa: kunci dibangkitkan di Keystore, kunci publik **diikat ke akun oleh Admin**, `role=KADES`, kunci publik **dipublikasikan** | Bukti dunia nyata (SK pengangkatan) + saksi + audit log |

### 5A.3 Model Admin (Root of Trust) — Bertahap

Admin adalah **akar kepercayaan**: berwenang membuat/mengikat akun istimewa, menetapkan role, dan merotasi kunci. Prinsip: **melekat pada jabatan** (berpindah lewat SK), dan **kedaulatan berpindah ke desa** — tidak selamanya dipegang tim taruna.

- **Fase 1 — Pembangunan & uji coba:** admin teknis sementara = **tim taruna**. Semua aksi tercatat, enrollment Kepala Desa dilakukan **bersama & disaksikan** perangkat desa, dan diakhiri **serah terima resmi** (reset kredensial, cabut akses tim taruna).
- **Fase 2 — Operasional:** admin institusional = **Sekretaris Desa (pengesah)**; pelaksana teknis = **Operator**; aksi paling sensitif (ikat/rotasi kunci Kepala Desa) memakai **dual-control (2 orang)**.
- **Pemisahan tugas:** Kepala Desa (penanda tangan) ≠ Admin; Operator tidak sendirian menguasai draft + role + kunci.

```
[ Admin Sistem (genesis) ]  ← dibuat saat deploy, sepengetahuan desa
      ├─► Kepala Desa   (role=KADES)    — enrollment tatap muka + SK
      ├─► Operator Desa (role=OPERATOR)
      └─(Operator memverifikasi)─► Warga (role=WARGA)  ← boleh self-register
```

### 5A.4 Batas Kuasa Admin
- **TIDAK bisa** mengekstrak kunci privat Kepala Desa (terkurung di Keystore) → **tak bisa memalsukan tanda tangan secara langsung.**
- **BISA** mengikat kunci publik & menetapkan role → titik rawan: **pengikatan kunci Kepala Desa** wajib verifikasi tatap muka + publikasi kunci + audit log + **dual-control** (mencegah admin nakal mendaftarkan kunci publik palsu miliknya).

### 5A.5 Rotasi & Pergantian Pejabat
- Pergantian Kepala Desa → **enrollment baru** + **revoke & rotasi** kunci lama. Surat lama tetap terverifikasi dengan status "kunci berlaku saat penandatanganan".

### 5A.6 Tata Kelola
- Dituangkan dalam **SOP + Berita Acara Serah Terima**: pengangkatan admin via SK, prosedur dual-control, prosedur rotasi kunci. Ini sekaligus nilai tambah akademik project.

---

## 6. Alur Pengguna (User Flows)

### 6.1 Onboarding & Identitas Warga (sekali)
1. Warga mengunduh app & mendaftar; aplikasi **membangkitkan keypair warga** di perangkat (RNG teruji).
2. Warga mengisi data identitas (NIK, nama, alamat) dan mengunggah bukti (foto KTP).
3. **Operator memverifikasi** identitas terhadap data kependudukan / KTP fisik.
4. Setelah sah, Operator membentuk **leaf commitment** warga (mis. `H(NIK ‖ atribut ‖ salt)` / Pedersen commitment) dan menambahkannya ke **Merkle tree registri penduduk**.
5. **Merkle root** versi terbaru **ditandatangani Kepala Desa (ECDSA)** dan dipublikasikan sebagai acuan.

### 6.2 Layanan Surat Digital (alur utama)
1. Warga memilih jenis surat → mengisi form / melampirkan berkas.
2. Aplikasi warga **membangun ZK-proof**: membuktikan (a) keanggotaan pada registri penduduk (Merkle membership) dan (b) syarat spesifik surat (mis. domisili RT tertentu / usia ≥ syarat) — **tanpa** mengirim seluruh data pribadi.
3. Server **memverifikasi proof**. Jika valid → permohonan masuk antrian Operator.
4. **Operator** memeriksa kelengkapan → menyusun **draft surat** dari template resmi → mengajukan ke Kepala Desa.
5. **Kepala Desa** menerima notifikasi → me-review draft → **menandatangani**: aplikasi menghitung `SHA-384` dokumen kanonik dan **ECDSA-sign (P-384)** dengan kunci di Keystore (dibuka biometrik/PIN).
6. Sistem menghasilkan **PDF surat final** + tanda tangan tertanam + **QR** + nomor surat; menyimpan metadata & signature.
7. Warga **mengunduh surat**. Siapa pun dapat **scan QR → halaman verifikasi** yang menampilkan status keaslian.

### 6.3 Booking Pertemuan (tatap muka)
1. Warga memilih keperluan + slot dari kalender Kepala Desa.
2. Operator/Kepala Desa mengonfirmasi atau menawarkan penjadwalan ulang.
3. Pengingat H-1 ke kedua pihak; **QR check-in** saat hadir.

### 6.4 Verifikasi Publik
1. Verifikator scan QR pada surat (atau buka tautan).
2. Sistem mengambil dokumen → menghitung ulang `SHA-384` → memverifikasi signature dengan kunci publik Kepala Desa.
3. Ditampilkan: *“Surat SAH — ditandatangani [Kepala Desa] pada [tanggal]; dokumen tidak diubah”* atau *“TIDAK VALID”*.

---

## 7. Kebutuhan Fungsional (FR)

| ID | Kebutuhan |
|---|---|
| FR-01 | Warga dapat mendaftar dan aplikasi membangkitkan keypair di perangkat. |
| FR-02 | Operator dapat memverifikasi & menyetujui identitas warga. |
| FR-03 | Sistem mengelola registri penduduk sebagai Merkle tree; root ditandatangani Kepala Desa. |
| FR-04 | Warga dapat mengajukan ≥ 3 jenis surat dengan form spesifik per jenis. |
| FR-05 | Aplikasi warga membangun ZK-proof kelayakan; server memverifikasinya sebelum permohonan diproses. |
| FR-06 | Operator dapat menyusun draft surat dari template resmi dan mengajukannya ke Kepala Desa. |
| FR-07 | Kepala Desa dapat me-review dan menandatangani draft secara digital (ECDSA P-384) dari perangkatnya. |
| FR-08 | Sistem menerbitkan PDF surat final + QR + nomor surat unik. |
| FR-09 | Halaman verifikasi publik memvalidasi keaslian surat tanpa perlu login. |
| FR-10 | Warga dapat memesan slot pertemuan dan menerima konfirmasi/pengingat. |
| FR-11 | Sistem mencatat seluruh aksi penting ke audit log append-only. |
| FR-12 | Admin/desa dapat me-*revoke* & merotasi kunci Kepala Desa bila diperlukan. |
| FR-13 | Notifikasi (FCM) untuk perubahan status permohonan & jadwal. |

---

## 8. Kebutuhan Non-Fungsional (NFR)

| ID | Kebutuhan |
|---|---|
| NFR-01 **Keamanan** | Seluruh algoritma patuh Kepka BSSN 443/2025 (lihat §10). Kunci privat non-exportable. TLS 1.3 wajib. |
| NFR-02 **Privasi** | Privacy-by-design & data minimization (UU PDP 27/2022): simpan commitment/hash, bukan KTP/KK mentah, untuk verifikasi kelayakan. |
| NFR-03 **Kinerja** | Pembuatan & verifikasi ZK-proof ≤ ~2 dtk pada perangkat kelas menengah; verifikasi tanda tangan publik ≤ 1 dtk. |
| NFR-04 **Ketersediaan** | Target uptime prototipe ≥ 99% jam kerja; degradasi anggun saat sinyal lemah. |
| NFR-05 **Usability** | Bahasa Indonesia, alur sederhana, ramah pengguna awam & literasi digital rendah. |
| NFR-06 **Keterpeliharaan** | Modul kripto terisolasi & teruji unit; kode terdokumentasi. |
| NFR-07 **Portabilitas** | Basis kode Flutter siap melebar ke iOS/web; backend independen platform. |
| NFR-08 **Auditability** | Audit log append-only berantai-hash (tamper-evident). |

---

## 9. Arsitektur Sistem

```
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│   APLIKASI MOBILE (Flutter)   │        │   BACKEND (Node.js + NestJS/TS)   │
│  ┌────────┬─────────┬───────┐ │        │  ┌─────────────────────────────┐  │
│  │ Warga  │Operator │KaDes  │ │        │  │ Auth & RBAC                 │  │
│  └────────┴─────────┴───────┘ │        │  │ Layanan Surat & Template    │  │
│  Modul kripto (pointycastle): │  HTTPS │  │ Modul Kripto:               │  │
│   - ECDSA P-384 / SHA-384     │◄──────►│  │   • verify-zkp              │  │
│   - Schnorr + Merkle proof    │ TLS1.3 │  │   • sign/verify-ecdsa       │  │
│  Android Keystore (kunci KaDes)│       │  │   • merkle-registry         │  │
└──────────────────────────────┘        │  │ Booking & Kalender          │  │
                                          │  │ Notifikasi (FCM)            │  │
┌──────────────────────────────┐         │  │ Audit Log (append-only)     │  │
│ HALAMAN VERIFIKASI PUBLIK     │◄────────┤  └───────────────┬─────────────┘  │
│ (web ringan, scan QR, no-auth)│         │        ┌─────────┴──────────┐     │
└──────────────────────────────┘         │        │ PostgreSQL │ File PDF │    │
                                          │        │ (data+audit)│ storage │   │
                                          │        └────────────────────────┘  │
                                          └───────────────────────────────────┘
```

**Prinsip desain:** setiap modul satu tanggung jawab, berkomunikasi lewat antarmuka jelas, dan dapat diuji mandiri. Modul kripto sengaja dipisah (`verify-zkp`, `sign/verify-ecdsa`, `merkle-registry`) agar dapat diuji unit secara ketat dan diaudit terpisah.

**Komponen:**
- **App mobile (Flutter):** 3 antarmuka berbasis peran, modul kripto klien, penyimpanan kunci aman.
- **Auth & RBAC:** login, sesi (JWT/opaque token), pemisahan hak akses per peran.
- **Layanan Surat:** template, draft, status, penerbitan PDF, penomoran.
- **Modul Kripto (server):** verifikasi ZKP, verifikasi/registrasi kunci ECDSA, pengelolaan Merkle registry.
- **Booking:** kalender, slot, konfirmasi, check-in.
- **Verifikasi Publik:** endpoint + halaman web ringan (read-only, stateless).
- **PostgreSQL:** data transaksi + audit log append-only.
- **File storage:** penyimpanan PDF surat (di server/VPS; enkripsi at-rest AES-256).

---

## 10. Desain Kriptografi (patuh Kepka BSSN No. 443 Tahun 2025)

> **Prinsip kepatuhan:** semua primitif dipilih dari Lampiran Kepka 443/2025. Untuk keamanan lebih, dipilih opsi yang memenuhi **seluruh** kategori (Rendah–Strategis).

### 10.1 Ringkasan Suite
| Fungsi | Algoritma | Catatan kepatuhan |
|---|---|---|
| Tanda tangan digital | **ECDSA kurva P-384** | Skema TTD sah (Diktum, item 11); kurva P-384 sah (item 9) |
| Fungsi hash | **SHA-384** | Sah (item 3). *SHA-256 TIDAK sah sebagai hash mandiri.* |
| ZKP (grup) | **P-384** (Schnorr, Pedersen) | Kurva sah (item 9); satu kurva untuk seluruh sistem |
| ZKP (Fiat-Shamir & Merkle) | **SHA-384** (atau SHA3-256) | Hash sah (item 3) |
| Enkripsi at-rest | **AES-256-GCM** | Sah semua kategori (item 1) |
| Transport | **TLS 1.3** (AES-256-GCM / ChaCha20-Poly1305) | ChaCha20 & AES-256 sah |
| RNG/DRBG | **AES-256-CTR-DRBG** atau **HMAC-SHA-384-DRBG** | Sah (item 5/6) |
| Password/KDF (login perangkat desa) | Argon2id (praktik terbaik; di luar cakupan daftar Kepka) | Untuk penyimpanan kredensial, bukan primitif kripto inti |

> **Perubahan penting dari draft awal:** ~~P-256~~ → **P-384**; ~~SHA-256~~ → **SHA-384**. P-256 dan SHA-256 (sebagai hash mandiri) **tidak** terdapat dalam daftar Kepka 443/2025.

### 10.2 Tanda Tangan Surat (ECDSA)
- Kepala Desa memiliki keypair **ECDSA P-384**; **kunci privat non-exportable di Android Keystore/StrongBox**, dibuka biometrik/PIN.
- Server hanya menyimpan **kunci publik** Kepala Desa (+ status masa berlaku).
- Objek yang ditandatangani = **hash kanonik** dokumen (`SHA-384` atas isi surat + metadata + nomor). Signature + kunci publik + timestamp disematkan ke PDF dan direkam di DB.
- Verifikasi publik: ambil dokumen → hitung ulang `SHA-384` → cek signature dengan kunci publik. Perubahan 1 byte → **invalid**.

### 10.3 Pembuktian Kelayakan Privat (ZKP)
- **Keanggotaan penduduk:** tiap warga sah = leaf commitment dalam **Merkle tree** (hash `SHA-384`); root ditandatangani desa. Warga membuktikan **Merkle membership** tanpa mengungkap leaf mana → terbukti “warga sah” tanpa “warga yang mana”.
- **Pembuktian syarat:** **Schnorr Sigma-protocol** (proof-of-knowledge atas rahasia di balik commitment), dijadikan **non-interaktif via Fiat-Shamir** (challenge = `SHA-384` atas seluruh komitmen + konteks permohonan → mengikat proof ke satu permohonan, mencegah replay).
- **Selective disclosure / range proof:** hanya atribut relevan (mis. usia ≥ 17, domisili RT = X) yang dibuktikan; sisanya tertutup.
- **Catatan kejujuran akademik:** untuk isi surat, identitas pemohon tetap diketahui Operator (surat memang tentang warga tersebut). ZKP melindungi tahap **verifikasi kelayakan** & data yang tidak wajib dibuka — bukan menganonimkan surat itu sendiri.

### 10.4 Manajemen Kunci
- Bangkitkan kunci di dalam Keystore (idealnya StrongBox); **tidak pernah** keluar dari secure hardware.
- **Rotasi & revocation:** daftar kunci Kepala Desa berstatus (`active`/`revoked`, `validFrom/validTo`); verifikasi publik memeriksa status pada saat tanda tangan dibuat.
- **Pemulihan:** prosedur re-enroll bila perangkat hilang; kunci cadangan tersegel offline untuk kontinuitas.

---

## 11. Model Data (entitas utama)

| Entitas | Field kunci |
|---|---|
| **Warga** | id, nama, commitment_identitas, public_key, merkle_leaf_index, status_verifikasi, created_at |
| **PenggunaDesa** | id, nama, role (operator/kades), credential_hash (Argon2id), status |
| **RegistriMerkle** | versi, root, signature_kades, created_at |
| **PermohonanSurat** | id, warga_id, jenis, data_form, zkproof_ref, status, timestamps |
| **Surat** | id, permohonan_id, nomor_surat, pdf_hash(SHA-384), signature(ECDSA), kades_pubkey, signed_at, qr_token |
| **Booking** | id, warga_id, keperluan, slot_waktu, status, checkin_token |
| **KunciKades** | id, public_key, status, valid_from, valid_to |
| **AuditLog** | id, actor, action, target, payload_hash, prev_hash, timestamp (rantai-hash append-only) |

---

## 12. Kepatuhan & Regulasi

- **Kepka BSSN No. 443 Tahun 2025** — Algoritma Kriptografi Indonesia (dasar pemilihan algoritma; lihat §10).
- **PerBSSN No. 11 Tahun 2024** — Penyelenggaraan Algoritma Kriptografi Indonesia & Penilaian Kesesuaian Modul Kriptografi (payung Kepka 443/2025).
- **UU No. 27 Tahun 2022 (PDP)** — perlindungan data pribadi; diterapkan lewat minimalisasi data & ZKP.
- **UU ITE (UU 11/2008 jo. UU 19/2016)** — pengakuan tanda tangan elektronik. Prototipe memakai kunci mandiri (self-managed) + *disclaimer*; **jalur produksi merekomendasikan integrasi PSrE/BSrE** (Balai Besar Sertifikasi Elektronik, BSSN) agar tanda tangan elektronik **tersertifikasi** dan bernilai hukum penuh.
- **PP No. 71 Tahun 2019** — Penyelenggaraan Sistem & Transaksi Elektronik (dasar klasifikasi kategori SE).
- **UU No. 6 Tahun 2014 (Desa)** & regulasi administrasi desa — kewenangan penerbitan surat.

**Klasifikasi bertahap:** prototipe dideklarasikan **Rendah**; saat implementasi nyata untuk masyarakat, dikaji ulang (kemungkinan **Tinggi** karena memuat data kependudukan). Suite algoritma yang dipilih sudah memenuhi hingga kategori Strategis, sehingga naik kelas tidak memerlukan perombakan kripto.

---

## 13. Threat Model & Mitigasi

| # | Ancaman (STRIDE) | Dampak | Mitigasi |
|---|---|---|---|
| 1 | **Pencurian kunci privat Kepala Desa** (Spoofing/Tampering) | Surat palsu atas nama KaDes | Kunci **Keystore/StrongBox non-exportable**, buka biometrik/PIN, audit log tiap TTD, mekanisme **revoke & rotasi** |
| 2 | **Pendaftaran identitas palsu** (Spoofing) | Surat terbit untuk pihak tak berhak | Onboarding **diverifikasi Operator** thd KTP/data kependudukan; Merkle tree hanya diubah admin; opsi dual-control |
| 3 | **Kebocoran server / PII** (Information Disclosure) | Data warga bocor | **Minimalisasi data via ZKP**, simpan commitment/hash bukan KTP mentah, **AES-256 at-rest**, akses per-role |
| 4 | **Pemalsuan/manipulasi surat** (Tampering) | Surat dipalsukan | **ECDSA + verifikasi publik via QR**; ubah 1 byte → invalid |
| 5 | **Penyangkalan** (Repudiation) | KaDes/warga menyangkal aksi | Tanda tangan digital + **audit log append-only berantai-hash** |
| 6 | **Replay / MITM** (Tampering/Spoofing) | Permohonan/proof dipakai ulang | **TLS 1.3**, nonce + timestamp, challenge Fiat-Shamir mengikat konteks permohonan |
| 7 | **Kehilangan perangkat** | Kunci hilang/disalahgunakan | **Revoke jarak jauh**, prosedur pemulihan & re-enroll, kunci cadangan tersegel |
| 8 | **Keabsahan hukum TTD** | Surat diragukan sah | Prototipe: self-signed + disclaimer; produksi: **integrasi BSrE (PSrE)** sesuai UU ITE |
| 9 | **Adopsi rendah/gaptek** | Aplikasi tak terpakai | UI sederhana Bahasa Indonesia, **pelatihan operator**, **jalur manual sebagai cadangan**, pendampingan transisi |
| 10 | **Serangan soundness ZKP** | Proof palsu lolos | Skema teruji, parameter benar, Fiat-Shamir benar (challenge = hash semua komitmen+konteks), **uji unit kripto khusus** |
| 11 | **Elevation of Privilege** (operator → kades) | Draft ditandatangani tanpa otorisasi | RBAC ketat; hanya kunci Keystore KaDes yang bisa TTD; pemisahan tugas |
| 12 | **DoS** | Layanan tak tersedia | Rate limiting + validasi input (prioritas rendah untuk skala desa) |

---

## 14. Rincian Biaya (berjenjang)

Asumsi: tenaga = taruna (nilai akademik, tanpa upah). **Transport = Rp0** (desa berada dekat kampus → cukup jalan kaki ke kantor desa). Rentang wajar Indonesia 2026.

| Pos | **Minimum** | **Hemat** (uji lapangan layak) | **Ideal** (didanai kampus) |
|---|---|---|---|
| Server/VPS (1 th) | Tier gratis → **Rp0** | VPS 2GB ~Rp75rb/bln → **Rp900rb** | VPS 4GB ~Rp150rb/bln → **Rp1.800rb** |
| Domain (1 th) | `.my.id` → **Rp15rb** | `.id` → **Rp200rb** | `.id`/`.desa.id` → **Rp200rb** |
| Sertifikat SSL | Let's Encrypt → **Rp0** | **Rp0** | **Rp0** |
| Distribusi app | APK langsung → **Rp0** | Play Store $25 → **±Rp400rb** | Play Store → **±Rp400rb** |
| Notifikasi | FCM gratis → **Rp0** | FCM + WA manual → **Rp0** | Gateway WA → **±Rp300rb** |
| Perangkat uji | HP pribadi → **Rp0** | 1 HP Android murah → **±Rp1.500rb** | HP + 1 mini-PC operator → **±Rp4.000rb** |
| **Transport ke desa** | jalan kaki → **Rp0** | jalan kaki → **Rp0** | jalan kaki → **Rp0** |
| Sosialisasi & pelatihan | cetak modul → **±Rp200rb** | modul + konsumsi → **±Rp700rb** | spanduk + cetak + konsumsi → **±Rp2.000rb** |
| Cadangan tak terduga | **Rp0** | **±Rp500rb** | **±Rp1.500rb** |
| **Perkiraan total** | **± Rp0,2–0,5 jt** | **± Rp3–4,5 jt** | **± Rp9–11 jt** |

Untuk ABDIMAS kampus, tier **Hemat (± Rp3–4,5 jt)** umumnya paling realistis: cukup untuk uji lapangan nyata tanpa membengkak.

---

## 15. Stack Teknologi & Environment

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Mobile | **Flutter (Dart)** + `pointycastle`; Android Keystore via platform-channel | Satu basis kode, siap iOS/web, kunci KaDes hardware-backed |
| Backend | **Node.js + NestJS (TypeScript)** + `@noble/curves` | Pustaka kripto diaudit (P-384/SHA-384/Schnorr), ekosistem besar, terstruktur |
| Database | **PostgreSQL** | ACID + jejak audit andal |
| Verifikasi publik | Web ringan (mis. Next.js/Express + halaman statis) | Stateless, read-only |
| Infra | VPS/cloud + **TLS 1.3** (Let's Encrypt), Docker (opsional) | Sederhana, murah, sudah 4G di lokasi |
| Notifikasi | Firebase Cloud Messaging (FCM) | Gratis, andal |
| Dev tools | Git, CI ringan, testing unit modul kripto | Kualitas & auditability |

---

## 16. Rencana Rilis / Milestone (~1 semester / 16 minggu, tim 2–4 orang)

| Milestone | Minggu | Keluaran |
|---|---|---|
| **M0 — Riset & Persiapan** | 1–2 | Koordinasi & izin desa, kumpul template surat resmi, finalisasi PRD & desain UI |
| **M1 — Fondasi** | 3–5 | Backend inti (Auth, RBAC, DB), skeleton app 3-peran, infra ECDSA (sign/verify) |
| **M2 — Kripto ZKP** | 6–8 | Merkle registry, Schnorr + Fiat-Shamir, endpoint verifikasi ZKP + uji unit |
| **M3 — Alur Surat E2E** | 9–11 | Warga ajukan → operator draft → KaDes TTD → PDF+QR → halaman verifikasi publik |
| **M4 — Booking & Pengerasan** | 12–13 | Booking + notifikasi + audit log + hardening keamanan |
| **M5 — Uji Lapangan** | 14–15 | Uji terbatas di desa, pelatihan operator, perbaikan berdasarkan umpan balik |
| **M6 — Penutup** | 16 | Dokumentasi akhir, laporan ABDIMAS, serah terima & panduan |

**Pembagian peran tim (dapat dirangkap):** (1) Mobile/Flutter, (2) Backend + integrasi kripto, (3) ZKP/kriptografi + dokumentasi akademik, (4) Uji lapangan + UX + sosialisasi.

---

## 17. Risiko Proyek & Asumsi

**Asumsi.**
- Sinyal 4G memadai di sekitar kantor desa & rumah warga.
- Perangkat desa bersedia menjadi Operator & mengikuti pelatihan.
- Tersedia template surat resmi & data penduduk untuk onboarding awal.
- Warga sasaran memiliki smartphone Android (untuk yang belum, disediakan jalur bantuan via Operator/kios desa).

**Risiko proyek.**
- Keterbatasan waktu 1 semester → dijaga ketat dengan ruang lingkup MVP (§4).
- Kompleksitas ZKP → mulai dari skema paling sederhana yang benar (Schnorr + Merkle) sebelum menambah range proof.
- Ketergantungan kehadiran narasumber desa → jadwalkan koordinasi sejak M0.

---

## 18. Pertanyaan Terbuka

> Catatan: nomor dokumen kripto **terkonfirmasi = Kepka BSSN No. 443 Tahun 2025** (nama berkas "kepka 144.pdf" keliru penamaan).

1. Jenis surat prioritas final (apakah SKTM & Domisili + Pengantar sudah tepat, atau ada yang lebih dibutuhkan warga?).
2. Ketersediaan data penduduk awal untuk membangun Merkle registry (format & sumbernya).
3. Nama & branding final aplikasi.

---

## 19. Glosarium & Referensi

**Glosarium.** ECDSA (Elliptic Curve Digital Signature Algorithm) · ZKP (Zero-Knowledge Proof) · Schnorr Sigma-protocol · Fiat-Shamir (transformasi interaktif→non-interaktif) · Merkle tree (struktur hash untuk bukti keanggotaan) · Pedersen commitment · Keystore/StrongBox (secure hardware Android) · PSrE/BSrE (Penyelenggara/Balai Besar Sertifikasi Elektronik) · RBAC (Role-Based Access Control) · DRBG (Deterministic Random Bit Generator).

**Referensi.**
- Kepka BSSN No. 443 Tahun 2025 — Algoritma Kriptografi Indonesia.
- PerBSSN No. 11 Tahun 2024.
- UU No. 27 Tahun 2022 (Pelindungan Data Pribadi).
- UU No. 11 Tahun 2008 jo. UU No. 19 Tahun 2016 (ITE).
- PP No. 71 Tahun 2019 (PSTE).
- UU No. 6 Tahun 2014 (Desa).
- FIPS 186-5 (ECDSA), SEC 2 (kurva P-384), RFC 8032 (EdDSA — referensi alternatif).
