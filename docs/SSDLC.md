# Penerapan Secure SDLC (SSDLC) pada SIDESA-CM

| | |
|---|---|
| **Project** | SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara |
| **Konteks** | ABDIMAS Poltek SSN, D4 Rekayasa Kriptografi |
| **Framework utama** | Microsoft Security Development Lifecycle (SDL) |
| **Framework pelengkap** | NIST Secure Software Development Framework (SSDF, SP 800-218) |
| **Dasar kepatuhan kripto** | Kepka BSSN No. 443 Tahun 2025 |

## 1. Pendahuluan

**Secure SDLC (SSDLC)** adalah pendekatan membangun perangkat lunak dengan menyisipkan aktivitas keamanan pada **setiap** tahap pengembangan — bukan menambalnya di akhir. Untuk SIDESA-CM yang menangani **tanda tangan digital resmi** dan **data kependudukan**, keamanan bukan fitur tambahan melainkan syarat utama; karena itu proses pengembangannya mengikuti SSDLC.

## 2. Pemilihan Framework

Dipilih **Microsoft SDL** sebagai kerangka utama karena berbasis **fase** yang selaras dengan alur kerja nyata project (dari kebutuhan hingga respons), dan paling lazim diajarkan sehingga mudah dipresentasikan. Sebagai pelengkap, praktik project dipetakan ke **NIST SSDF** — standar modern yang selaras konteks pemerintahan (relevan dengan lingkungan BSSN).

| Framework | Peran | Alasan pemilihan |
|---|---|---|
| **Microsoft SDL** | Kerangka utama | Berbasis fase (Training → … → Response); pemetaan langsung ke pekerjaan; mudah dipresentasikan |
| **NIST SSDF (SP 800-218)** | Pelengkap/rujukan | Standar pemerintah; praktik PO/PS/PW/RV; memperkuat kredibilitas & keselarasan standar |
| **OWASP SAMM** | Opsional | Bila diperlukan penilaian tingkat kematangan keamanan |

## 3. Penerapan per Fase Microsoft SDL

### 3.1 Training (Pembekalan)
Tim membekali diri dengan pengetahuan kriptografi terapan dan regulasi: **Kepka BSSN No. 443 Tahun 2025** (algoritma kriptografi Indonesia), prinsip ECDSA, Merkle tree, dan Zero-Knowledge Proof (Schnorr/Fiat-Shamir), serta prinsip minimalisasi data (UU PDP No. 27/2022).

### 3.2 Requirements (Kebutuhan)
Disusun **PRD/Spesifikasi** yang memuat kebutuhan fungsional **dan** kebutuhan keamanan secara eksplisit: kepatuhan algoritma (P-384/SHA-384/AES-256), autentikasi berbasis kepemilikan kunci, minimalisasi data, audit, serta kriteria sukses terukur.
*Artefak:* `docs/superpowers/specs/2026-07-10-sidesa-cibeteung-muara-design.md`.

### 3.3 Design (Perancangan Aman)
- **Threat modeling STRIDE** (§13 PRD): 12 ancaman diidentifikasi beserta mitigasinya (pencurian kunci, identitas palsu, kebocoran PII, pemalsuan surat, repudiation, replay/MITM, dst.).
- **Arsitektur aman:** autentikasi = **kepemilikan kunci** (perangkat menandatangani nonce server), **bukan** NIK/password; **minimalisasi data** (menyimpan `nikCommitment`/hash, bukan NIK mentah); **RBAC** 4 peran; **kunci privat Kepala Desa tidak pernah berada di server** (server hanya memverifikasi); **audit log append-only berantai-hash**.
- **Pemisahan tugas & model admin bertahap** (§5A PRD) sebagai akar kepercayaan.

### 3.4 Implementation (Implementasi Aman)
- **Test-Driven Development (TDD)** sebagai jaring pengaman: test gagal → implementasi minimal → hijau → commit.
- **Primitif kripto dari pustaka teraudit** (`@noble/curves`); **tidak** menggulung primitif sendiri; kripto Dart mengikuti format wire yang sama (kunci terkompresi 49 byte, tanda tangan compact 96 byte low-S).
- **Domain separation** pada semua hashing (Merkle, konteks bukti kelayakan, rantai audit).
- **Kunci identitas di hardware** (Fase B1): ECDSA P-384 dibangkitkan di **Android Keystore (StrongBox, fallback TEE)**, non-exportable, `setUserAuthenticationRequired` sehingga **setiap** penandatanganan menuntut biometrik segar melalui `BiometricPrompt` yang terikat `CryptoObject`. Kunci privat **tidak pernah** memasuki memori aplikasi; sisi native mengonversi tanda tangan DER → compact low-S agar sepadan dengan format wire.
- **Validasi input** (Fase B3): `ValidationPipe` global + DTO `class-validator` menolak body malformed (mis. bentuk tanda tangan bukan 192-hex, jenis surat di luar enum) **sebelum** mencapai handler.
- **Manajemen rahasia:** `.env` dikecualikan dari version control; hanya `.env.example` yang di-commit.

### 3.5 Verification (Verifikasi)
- **104 pengujian otomatis** (kripto 26, backend 57, mobile 21) — termasuk **uji soundness/negatif** yang membuktikan penolakan terhadap **pemalsuan, replay, dan manipulasi**.
- **Uji interop lintas-bahasa**: tanda tangan yang dibuat aplikasi Flutter (Dart) diverifikasi backend (TypeScript) — memastikan kebenaran implementasi, bukan sekadar pemanggilan pustaka. Termasuk tanda tangan yang dihasilkan **kunci hardware** (jalur DER → compact low-S).
- **Verifikasi end-to-end di perangkat** (emulator Pixel_7 + backend live): siklus warga → operator → Kepala Desa → PDF/QR, termasuk penolakan permohonan **tanpa bukti kelayakan** dan **replay nonce**.
- **Code review antar-tugas** (pendekatan vibe coding: manusia me-review diff setiap tugas).

### 3.6 Release (Rilis)
- Rahasia & artefak besar dikecualikan dari repositori; disiplin migrasi basis data terkontrol (`prisma migrate diff` + `deploy`, non-interaktif).
- **Rate limiting** *(terpenuhi, Fase B3)*: batas per-IP 120 permintaan/menit secara global dan **15/menit pada endpoint autentikasi** sebagai peredam brute-force.
- *Menyusul:* penerapan TLS pada deploy, integrasi **PSrE/BSrE** agar tanda tangan bernilai hukum penuh (UU ITE), serta **enrolment perangkat** dan **key attestation**.

### 3.7 Response (Respons)
- **Audit log append-only berantai-hash** *(terpasang, Fase B3)*: setiap aksi sensitif — `LETTER_DRAFT`, `LETTER_REJECT`, `LETTER_SIGN`, `REGISTRY_APPROVE`, `REGISTRY_PUBLISH` — dicatat sebagai entri yang mengikat **hash entri sebelumnya** (SHA-384, domain-separated). Endpoint `GET /audit/verify` (khusus KADES/ADMIN) menghitung ulang seluruh rantai dan melaporkan keabsahannya; pengujian membuktikan **perubahan satu baris membuat verifikasi gagal** — jejak bersifat **tamper-evident**.
- **Dirancang** mekanisme **rotasi & revoke kunci** Kepala Desa serta **SOP + Berita Acara Serah Terima** untuk tata kelola admin; *implementasi menyusul*.

## 4. Pemetaan ke NIST SSDF (SP 800-218)

| Praktik SSDF | Penerapan di SIDESA-CM |
|---|---|
| **PO** — *Prepare the Organization* | Aturan project (`CLAUDE.md`), kepatuhan Kepka 443/2025, konvensi TDD & commit |
| **PS** — *Protect the Software* | `.env` dikecualikan; integritas dijaga tanda tangan & audit berantai-hash; kunci identitas non-exportable di hardware |
| **PW.1** — desain aman | Threat model STRIDE + arsitektur (kepemilikan kunci, minimalisasi data) |
| **PW.4** — komponen tepercaya | Pustaka kripto teraudit (`@noble/curves`); tidak menggulung primitif |
| **PW.5** — penulisan kode aman | Validasi input berbasis DTO; rate limiting; penanganan galat tanpa membocorkan detail |
| **PW.7 / PW.8** — review & pengujian | Code review antar-tugas; **104 test** termasuk uji negatif/soundness + interop + e2e di perangkat |
| **RV** — *Respond to Vulnerabilities* | Audit log tamper-evident **terpasang & terverifikasi**; desain rotasi/revoke kunci |

## 5. Status Penerapan

| Fase | Status |
|---|---|
| Training, Requirements, Design, Implementation, Verification | **Terpenuhi** — inti SSDLC (khususnya Design & Verification) sudah kuat |
| Release | **Parsial** — rate limiting terpenuhi; deploy TLS, PSrE/BSrE, enrolment & key attestation menyusul |
| Response | **Sebagian besar terpenuhi** — audit tamper-evident terpasang & terverifikasi; rotasi/revoke kunci menyusul |

## 6. Kesimpulan

Pengembangan SIDESA-CM telah menerapkan Secure SDLC berbasis **Microsoft SDL** dan selaras dengan **NIST SSDF**. Kekuatan utama ada pada fase **Design** (pemodelan ancaman STRIDE + arsitektur aman) dan **Verification** (pengujian soundness/negatif serta verifikasi end-to-end di perangkat). Fase **Implementation** diperkuat pada Fase B melalui **kunci identitas berbasis hardware dengan gerbang biometrik** dan **validasi input**, sementara fase **Response** kini ditopang **audit log tamper-evident yang benar-benar terpasang dan terverifikasi**. Sisa pekerjaan menuju produksi: TLS, integrasi PSrE/BSrE, enrolment perangkat, key attestation, serta rotasi/revoke kunci.
