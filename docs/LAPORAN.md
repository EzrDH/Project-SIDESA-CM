# Laporan Kemajuan Project SIDESA-CM

| | |
|---|---|
| **Judul** | SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara |
| **Konteks** | Pengabdian kepada Masyarakat (ABDIMAS), Desa Binaan — Poltek SSN, D4 Rekayasa Kriptografi |
| **Lokasi** | Desa Cibeteung Muara, Kec. Ciseeng, Kab. Bogor, Jawa Barat |
| **Repositori** | https://github.com/EzrDH/Project-SIDESA-CM |
| **Status** | Fondasi kripto + backend inti + fondasi & UI mobile — selesai & teruji |

## 1. Ringkasan Eksekutif

SIDESA-CM adalah aplikasi mobile untuk mempermudah layanan administrasi Desa Cibeteung Muara. Masalah utama: warga sering membutuhkan tanda tangan Kepala Desa yang tidak selalu ada di tempat. Solusinya **hybrid**: (1) surat digital dengan **tanda tangan ECDSA** yang bisa ditandatangani Kepala Desa dari mana saja dan diverifikasi publik lewat QR; (2) **booking** janji temu untuk keperluan tatap muka. **Zero-Knowledge Proof (ZKP)** dipakai agar warga membuktikan kelayakan tanpa membuka seluruh data pribadinya. Seluruh algoritma **patuh Kepka BSSN No. 443 Tahun 2025** (P-384/SHA-384/AES-256).

Sampai laporan ini: pustaka kripto, seluruh backend inti (auth, ZKP registry, layanan surat, booking), serta fondasi dan UI mobile warga telah **dibangun dan teruji** — total **± 81 pengujian otomatis** hijau, dengan interop kripto mobile↔server terbukti.

## 2. Latar Belakang & Rumusan Masalah

Untuk mengurus surat, warga harus datang ke kantor desa dan menunggu tanda tangan basah Kepala Desa yang agendanya tidak pasti. Akibatnya: waktu terbuang, layanan lambat, dan ketergantungan pada kehadiran fisik satu orang.

Rumusan masalah: (1) bagaimana memperoleh persetujuan Kepala Desa tanpa bergantung kehadiran fisik? (2) bagaimana memastikan surat asli, tidak dapat dipalsukan, dan dapat diverifikasi? (3) bagaimana memverifikasi kelayakan warga tanpa mengorbankan privasi data kependudukan?

## 3. Solusi & Fitur

- **Autentikasi kepemilikan kunci** (perangkat menandatangani nonce server), bukan NIK/password.
- **Surat digital**: warga ajukan → operator susun draft → Kepala Desa tanda tangani (ECDSA) → surat terbit ber-QR → verifikasi publik.
- **Bukti kelayakan privat (ZKP)**: keanggotaan penduduk (Merkle) + kepemilikan kunci (Schnorr) + selective disclosure.
- **Booking** janji temu (anti double-book + QR check-in).
- **RBAC 4 peran** + **audit log append-only berantai-hash**.

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
| `packages/backend` | NestJS + Prisma + PostgreSQL — auth, RBAC, registry/ZKP, surat, booking, audit | 48 |
| `packages/app` | Flutter (Material 3) — kripto Dart, API client, auth flow, UI warga | 15 |

## 6. Kepatuhan & Keamanan Kriptografi

Sesuai **Kepka BSSN No. 443 Tahun 2025**: **ECDSA P-384**, **SHA-384**, **AES-256**. **Tidak** memakai P-256 atau SHA-256 sebagai hash mandiri. Primitif dari pustaka **teraudit** (`@noble/curves`); protokol tingkat-atas (Merkle, Schnorr+Fiat-Shamir, komposisi eligibility, domain separation, normalisasi low-S) diimplementasikan sendiri. Interop kripto **Dart→TypeScript** terbukti (tanda tangan Flutter diterima backend).

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

| Subsistem | Yang dibangun | Uji |
|---|---|---|
| Crypto Core | ECDSA P-384, SHA-384, Merkle, Schnorr, eligibility proof; uji soundness/negatif; interop Dart↔TS | 26 ✅ |
| Backend Foundation | Auth challenge-response, RBAC, audit hash-chain | ⤵ |
| Registry & ZKP | Merkle registri, root ber-TTD KaDes, verifikasi ZK-proof warga | ⤵ |
| Letter Service | Surat: ajukan→draft→TTD ECDSA→terbit + verifikasi publik | ⤵ |
| Booking | Janji temu (anti double-book, QR check-in) | (total backend 48) ✅ |
| Mobile Foundation + UI | Tema Material 3, kripto Dart, API client, Session/auth, UI warga | 15 ✅ |
| Integrasi (Fase A1) | Session + `/letters/mine` + ApiClient ber-token + form tersambung | (termasuk di atas) |

Bukti tambahan: aplikasi telah **dijalankan di emulator Pixel 7** (layar login, beranda, form pengajuan ter-render sesuai desain).

## 9. Cara Menjalankan & Demo di Emulator

**Prasyarat:** Node.js 20, Flutter 3.4+, Docker, Android Studio + emulator (Pixel_7).

1. **Nyalakan basis data:** `npm run db:up`
2. **Terapkan migrasi (sekali):** `npm run db:migrate`
3. **Jalankan backend (API hidup di localhost:3000):** `npm run backend:dev`
4. **Nyalakan emulator:** `flutter emulators --launch Pixel_7` (tunggu boot selesai)
5. **Jalankan aplikasi:** `cd packages/app && flutter run`
   - App memakai base URL `http://10.0.2.2:3000` (host dari sudut pandang emulator Android).
   - Saat ini berjalan **mode demo** (data contoh); login nyata ke backend menyusul (butuh akun warga ACTIVE via seed).
6. **Di aplikasi:** tap **"Masuk dengan sidik jari"** → Beranda → jelajah (Ajukan Surat, Surat Saya, Janji, Profil).
7. **Iterasi cepat:** tekan `r` di terminal `flutter run` untuk **hot reload**.
8. **Tangkap layar:** `adb exec-out screencap -p > layar.png`

**Untuk demo sisi kriptografi** (tanpa perlu app live): jalankan `npm run test:crypto` (26 hijau, termasuk uji soundness) dan `npm run test:backend` (48 hijau). Panduan lengkap ada di `docs/DEMO-CRYPTO-RUNBOOK.md`.

## 10. Sisa Pekerjaan / Peta Jalan

- **Fase A (integrasi)**: sambungkan seluruh layar warga ke backend; layar Operator & Kepala Desa; render PDF + QR.
- **Fase B (on-device)**: Android Keystore/StrongBox + biometrik; notifikasi FCM; pengerasan (rotasi kunci, rate limit).
- **Fase C/D (produksi & lapangan)**: integrasi PSrE/BSrE (UU ITE), deploy TLS, seed registri penduduk, pelatihan & uji lapangan, SOP + serah terima.

## 11. Penutup

Sampai tahap ini, seluruh **jantung kriptografi**, **backend inti**, dan **fondasi & UI mobile** telah selesai dan teruji (± 81 pengujian), dengan proses yang mengikuti Secure SDLC. Kekuatan utama pada fase Design (pemodelan ancaman) dan Verification (uji soundness) — dua fase paling menentukan dalam keamanan perangkat lunak. Sisa pekerjaan bersifat integrasi UI, penguatan on-device, dan penyiapan produksi/lapangan.
