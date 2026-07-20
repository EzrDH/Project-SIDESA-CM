# Laporan Kemajuan Project SIDESA-CM

| | |
|---|---|
| **Judul** | SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara |
| **Konteks** | Pengabdian kepada Masyarakat (ABDIMAS), Desa Binaan — Poltek SSN, D4 Rekayasa Kriptografi |
| **Lokasi** | Desa Cibeteung Muara, Kec. Ciseeng, Kab. Bogor, Jawa Barat |
| **Repositori** | https://github.com/EzrDH/Project-SIDESA-CM |
| **Status** | **Fase A selesai** (siklus layanan end-to-end) + **Fase B: pengerasan & kunci hardware selesai** — seluruhnya teruji |

## 1. Ringkasan Eksekutif

SIDESA-CM adalah aplikasi mobile untuk mempermudah layanan administrasi Desa Cibeteung Muara. Masalah utama: warga sering membutuhkan tanda tangan Kepala Desa yang tidak selalu ada di tempat. Solusinya **hybrid**: (1) surat digital dengan **tanda tangan ECDSA** yang bisa ditandatangani Kepala Desa dari mana saja dan diverifikasi publik lewat QR; (2) **booking** janji temu untuk keperluan tatap muka. **Bukti kelayakan privasi (privacy-preserving eligibility)** dipakai agar warga membuktikan haknya tanpa membuka data kependudukan. Seluruh algoritma **patuh Kepka BSSN No. 443 Tahun 2025** (P-384/SHA-384/AES-256).

Sampai laporan ini, **siklus layanan berjalan utuh dan terbukti di perangkat**: warga mengajukan surat (dijaga bukti kelayakan) → operator memverifikasi → Kepala Desa menandatangani (ECDSA P-384 **di perangkat**) → warga mengunduh **PDF ber-QR** → siapa pun dapat memverifikasi keasliannya secara publik. Di atas itu telah ditambahkan **kunci hardware (Android Keystore StrongBox/TEE) yang dikunci biometrik**, **audit log tamper-evident**, **rate limiting**, dan **validasi input**. Total **104 pengujian otomatis** hijau (kripto 26, backend 57, mobile 21), dengan interop kripto mobile↔server terbukti.

## 2. Latar Belakang & Rumusan Masalah

Untuk mengurus surat, warga harus datang ke kantor desa dan menunggu tanda tangan basah Kepala Desa yang agendanya tidak pasti. Akibatnya: waktu terbuang, layanan lambat, dan ketergantungan pada kehadiran fisik satu orang.

Rumusan masalah: (1) bagaimana memperoleh persetujuan Kepala Desa tanpa bergantung kehadiran fisik? (2) bagaimana memastikan surat asli, tidak dapat dipalsukan, dan dapat diverifikasi? (3) bagaimana memverifikasi kelayakan warga tanpa mengorbankan privasi data kependudukan?

## 3. Solusi & Fitur

- **Autentikasi kepemilikan kunci** (perangkat menandatangani nonce server), bukan NIK/password.
- **Surat digital**: warga ajukan → operator susun draft → Kepala Desa tanda tangani (ECDSA) → surat terbit ber-QR → verifikasi publik → **warga unduh PDF**.
- **Bukti kelayakan privat**: keanggotaan penduduk (**Merkle** terhadap root ber-TTD Kepala Desa) + **bukti kepemilikan kunci terikat konteks sekali-pakai** + selective disclosure atribut. **NIK tidak pernah dikirim.**
- **Kunci identitas di hardware** (Android Keystore StrongBox/TEE) dengan **gerbang biometrik** tiap penandatanganan.
- **Booking** janji temu (anti double-book + QR check-in).
- **RBAC 4 peran** + **audit log append-only berantai-hash** + rate limiting + validasi input.

## 4. Metodologi Pengembangan (Workflow Lengkap)

### 4.1 Pendekatan: Vibe Coding + TDD
Kode ditulis **per tugas** oleh AI (Claude Code); manusia me-review diff di antara tugas. **Test-Driven Development** menjadi jaring pengaman: tulis test gagal → implementasi minimal → hijau → commit. Vibe bebas untuk UI/glue, **ketat untuk kripto & auth**.

### 4.2 Siklus per subsistem
Setiap subsistem menempuh siklus berikut:
1. **Brainstorming** — memperjelas kebutuhan, mengoreksi asumsi (mis. koreksi kripto ke P-384/SHA-384 sesuai Kepka 443/2025).
2. **PRD/Spesifikasi** — kebutuhan fungsional + keamanan + threat model + biaya.
3. **Rencana implementasi** — dipecah menjadi tugas TDD kecil (bite-sized).
4. **Eksekusi TDD** — per tugas: test gagal → run (merah) → implementasi → run (hijau) → **commit lalu push ke GitHub**.
5. **Review** manusia di antara tugas.

### 4.3 Disiplin pendukung
- **Kepatuhan kripto** dijaga di setiap keputusan (semua lewat pustaka `@sidesa/crypto`, tidak menggulung primitif).
- **Migrasi basis data** non-interaktif (`prisma migrate diff` + `deploy`).
- **Rahasia** (`.env`) tidak pernah di-commit; auto **commit + push** tiap perkembangan.
- Dokumentasi hidup: PRD, rencana, DESIGN, runbook, SSDLC.

### 4.4 Secure SDLC & Security Requirements
Proyek mengikuti **Secure SDLC** berbasis **Microsoft SDL** (selaras **NIST SSDF**) — lihat `docs/SSDLC.md`. Untuk **security requirements & analisis ancaman** digunakan pendekatan **PASTA** (risk-centric, digerakkan objektif/kepatuhan), dengan **STRIDE** mengisi tahap Threat Analysis.

## 5. Arsitektur Sistem

Aplikasi mobile Flutter (3 antarmuka peran) berkomunikasi dengan backend Node.js/NestJS via HTTPS. Backend memuat modul Auth & RBAC, Layanan Surat, Modul Kripto (verify-zkp, sign/verify-ecdsa, merkle-registry), Booking, dan Audit Log; data pada PostgreSQL. Halaman verifikasi publik bersifat read-only tanpa autentikasi. Kunci privat Kepala Desa **tidak pernah** berada di server.

**Monorepo (npm workspaces):**

| Paket | Isi | Uji |
|---|---|---|
| `packages/crypto` | `@sidesa/crypto` (TS) — ECDSA P-384, SHA-384, Merkle, Schnorr, eligibility | 26 |
| `packages/backend` | NestJS + Prisma + PostgreSQL — auth, RBAC, registry/eligibility, surat, booking, audit | 57 |
| `packages/app` | Flutter (Material 3) — kripto Dart, kunci hardware, API client, UI 3 peran, PDF/QR | 21 |

## 6. Kepatuhan & Keamanan Kriptografi

Sesuai **Kepka BSSN No. 443 Tahun 2025**: **ECDSA P-384**, **SHA-384**, **AES-256**. **Tidak** memakai P-256 atau SHA-256 sebagai hash mandiri. Primitif dari pustaka **teraudit** (`@noble/curves`); protokol tingkat-atas (Merkle tree, komposisi bukti kelayakan, domain separation, normalisasi low-S, rantai-hash audit) diimplementasikan sendiri. Interop kripto **Dart→TypeScript** terbukti (tanda tangan Flutter diterima backend).

**Konstruksi bukti kelayakan (kondisi terkini).** Bukti terdiri atas dua bagian: (a) **keanggotaan** — bukti Merkle bahwa leaf `H(kunci publik ‖ atribut)` berada di bawah **root registri yang ditandatangani ECDSA oleh Kepala Desa**; (b) **kepemilikan** — **tanda tangan ECDSA atas *context*** yang memuat akun, jenis surat, dan **nonce sekali-pakai** dari server. NIK tidak pernah dikirim (server menyimpan `nikCommitment`, bukan NIK mentah).

> **Catatan perubahan (Fase B2).** Sub-bukti *kepemilikan* semula memakai **Schnorr + Fiat-Shamir**. Karena kunci di Android Keystore/StrongBox **hanya mengekspos ECDSA** (skalar privat tidak pernah dapat diakses aplikasi), sub-bukti tersebut **dimigrasikan ke tanda tangan ECDSA atas context**. Keduanya setara untuk tujuan ini — membuktikan penguasaan kunci terdaftar **dan** mengikatnya pada satu permohonan — sementara sifat privasi (NIK tidak dibuka, atribut selektif) **tidak berubah**. Primitif Schnorr **masih ada dan teruji** di `@sidesa/crypto`, namun **tidak lagi dipakai** oleh bukti kelayakan.

> **Batas klaim (kejujuran akademik).** Skema ini bersifat **pseudonim, bukan anonim penuh**: kunci publik warga terungkap kepada server, sehingga permohonan dari kunci yang sama dapat dikaitkan. Yang dilindungi adalah **data kependudukan (NIK/atribut penuh)**, bukan ketertautan antar-permohonan. Anonimitas penuh memerlukan konstruksi zk-SNARK/anonymous credential — di luar cakupan saat ini.

## 7. Security Requirements — Pendekatan PASTA

| Tahap PASTA | Status | Penerapan |
|---|---|---|
| 1. Define Objectives | Terpenuhi | Objektif layanan + kepatuhan Kepka 443/UU PDP/UU ITE |
| 2. Define Technical Scope | Terpenuhi | Arsitektur monorepo + stack kripto |
| 3. Application Decomposition | Terpenuhi | 3 peran, trust boundary, auth kepemilikan-kunci |
| 4. Threat Analysis | Terpenuhi | STRIDE — 12 ancaman + mitigasi |
| 5. Vulnerability Analysis | Parsial | Uji negatif/soundness; audit dependensi |
| 6. Attack Modeling | Parsial | Skenario ancaman (attack tree menyusul) |
| 7. Risk & Impact Analysis | Parsial | Tabel mitigasi + risiko residual (self-signed, pseudonim) |

## 8. Progres Pembangunan (dan bukti pengujian)

### 8.1 Fondasi (selesai)

| Subsistem | Yang dibangun | Uji |
|---|---|---|
| Crypto Core | ECDSA P-384, SHA-384, Merkle, eligibility proof; uji soundness/negatif; interop Dart↔TS | 26 ✅ |
| Backend Foundation | Auth challenge-response, RBAC, audit hash-chain | ⤵ |
| Registry & Eligibility | Merkle registri, root ber-TTD KaDes, verifikasi bukti kelayakan warga | ⤵ |
| Letter Service | Surat: ajukan→draft→TTD ECDSA→terbit + verifikasi publik | ⤵ |
| Booking | Janji temu (anti double-book, QR check-in) | (total backend 57) ✅ |
| Mobile Foundation + UI | Tema Material 3, kripto Dart, API client, Session/auth, UI 3 peran | 21 ✅ |

### 8.2 Fase A — siklus layanan end-to-end (selesai)

| Tahap | Capaian | Bukti on-device (emulator Pixel_7 + backend live) |
|---|---|---|
| A1.5 | Warga login ECDSA & ajukan surat | Surat masuk PostgreSQL, tampil di *Surat Saya* |
| A2 | Layar Operator + verifikasi | `SUBMITTED → DRAFTED`, surat memperoleh nomor |
| A3 | Layar Kepala Desa + **TTD ECDSA di perangkat** | `DRAFTED → SIGNED`, tanda tangan & token QR tersimpan |
| A4 | **Gate bukti kelayakan** pada pengajuan surat | Bukti valid → surat dibuat; **tanpa bukti/replay → ditolak** |
| A5 | **Render PDF + QR** | Pratinjau A4: kop desa, isi surat yang ditandatangani, QR verifikasi |

Verifikasi publik (tanpa login) atas surat terbit: `GET /verify/<qrToken>` → `valid: true` beserta nama penanda tangan dan isi kanonik.

### 8.3 Fase B — pengerasan (selesai)

| Tahap | Capaian | Bukti |
|---|---|---|
| B1 | **Kunci hardware biometrik** — ECDSA P-384 di Android Keystore (StrongBox→TEE fallback), `setUserAuthenticationRequired`, prompt biometrik terikat `CryptoObject`; DER→compact low-S agar cocok format wire | Login **dan** TTD surat via sidik jari; server menerima tanda tangan hardware |
| B2 | **Migrasi ownership eligibility → ECDSA-over-context** | Kunci hardware kini berlaku untuk **semua peran**, termasuk warga |
| B3 | **Audit log berantai-hash** terpasang pada aksi sensitif + `GET /audit/verify`; **rate limiting**; **validasi input (DTO)** | Rantai audit terverifikasi; **1 baris diubah → verifikasi gagal**; input malformed ditolak 400 |

Kunci privat **tidak pernah** memasuki memori aplikasi maupun server; hanya tanda tangan yang keluar dari perangkat.

## 9. Cara Menjalankan & Demo di Emulator

**Prasyarat:** Node.js 20, Flutter 3.4+, Docker, Android Studio + emulator (Pixel_7).

1. **Nyalakan basis data:** `npm run db:up`
2. **Terapkan migrasi (sekali):** `npm run db:migrate`
3. **Jalankan backend (API hidup di localhost:3000):** `npm run backend:dev`
4. **Nyalakan emulator:** `flutter emulators --launch Pixel_7` (tunggu boot selesai)
5. **Siapkan akun 3 peran (sekali):** `cd packages/backend && SEED=1 npx vitest run test/seed-dev.test.ts`
   — membuat akun ACTIVE warga/operator/kades **sekaligus mendaftarkan warga ke registri ber-TTD Kepala Desa** (wajib untuk gate kelayakan), lalu mencetak kredensialnya.
6. **Jalankan aplikasi sebagai satu peran:**
   `cd packages/app && flutter run --dart-define=SIDESA_API=http://10.0.2.2:3000 --dart-define=SIDESA_ACCOUNT=<akun> --dart-define=SIDESA_PRIVKEY=<privkey>`
   — tap **"Masuk"**; aplikasi mendarat otomatis sesuai **peran akun** (warga / operator / Kepala Desa).
7. **Ganti peran:** hentikan (`q`) lalu jalankan lagi dengan pasangan akun peran lain.
8. **Tangkap layar:** `adb exec-out screencap -p > layar.png`

> **Panduan lengkap uji 3 peran** (termasuk skenario end-to-end, mode biometrik, dan pemecahan masalah): `docs/RUNBOOK-UJI-PERAN.md`.
> **Panduan demo sisi kriptografi:** `docs/DEMO-CRYPTO-RUNBOOK.md`. Tanpa app live pun bisa: `npm run test:crypto` (26 hijau, termasuk uji soundness) dan `npm run test:backend` (57 hijau).

**Catatan:** peran **tidak** dipilih di UI — ditentukan server saat login. Penanaman akun lewat `--dart-define` adalah **jalan pintas pengembangan** sampai layar **enrolment perangkat** dibangun; produk akhir tetap **satu aplikasi** untuk semua peran.

## 10. Sisa Pekerjaan / Peta Jalan

**Selesai:** Fase A (siklus layanan end-to-end) dan Fase B (kunci hardware biometrik, migrasi kripto, pengerasan).

Sisa pekerjaan:
- **Enrolment perangkat** — perangkat membangkitkan kunci → didaftarkan operator/admin → menerima `accountId` → disimpan lokal (menghapus ketergantungan `--dart-define`).
- **Shell peran ADMIN** — peran sudah ada di skema namun belum memiliki antarmuka.
- **Key Attestation** — server memverifikasi bahwa kunci benar berada di StrongBox dan dikunci biometrik (butuh perangkat fisik; emulator hanya menyediakan TEE).
- **Notifikasi FCM** — pemberitahuan saat status surat berubah.
- **Rotasi & revoke kunci** Kepala Desa/registri (desain sudah ada, implementasi menyusul).
- **Fase C/D (produksi & lapangan)**: integrasi PSrE/BSrE (UU ITE), deploy TLS, seed registri penduduk sebenarnya, pelatihan & uji lapangan, SOP + serah terima.

## 11. Penutup

Sampai tahap ini, **siklus layanan desa berjalan utuh dan terbukti di perangkat** — dari pengajuan warga yang dijaga bukti kelayakan, verifikasi operator, tanda tangan ECDSA P-384 oleh Kepala Desa langsung dari perangkatnya, hingga surat ber-QR yang dapat diverifikasi siapa pun. Di atasnya berdiri pengerasan berlapis: **kunci identitas di hardware dengan gerbang biometrik**, **audit tamper-evident**, **rate limiting**, dan **validasi input** — seluruhnya ditopang **104 pengujian otomatis** termasuk uji negatif/soundness. Proses mengikuti Secure SDLC dengan kekuatan utama pada fase Design (pemodelan ancaman) dan Verification (uji soundness). Sisa pekerjaan bersifat penyiapan produksi: enrolment perangkat, atestasi kunci, serta integrasi PSrE/BSrE dan uji lapangan.
