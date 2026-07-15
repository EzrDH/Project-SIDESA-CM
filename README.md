# SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara

Aplikasi layanan administrasi **Desa Cibeteung Muara** (Kec. Ciseeng, Kab. Bogor) berbasis **tanda tangan digital (ECDSA)** dan **Zero-Knowledge Proof (ZKP)**. Warga dapat mengajukan surat dan membuat janji temu; **Kepala Desa menandatangani surat secara digital dari mana saja**, dan keaslian surat dapat diverifikasi publik.

Project Pengabdian kepada Masyarakat (ABDIMAS) — Politeknik Siber dan Sandi Negara (Poltek SSN), D4 Rekayasa Kriptografi.

> **Kepatuhan kripto:** seluruh algoritma sesuai **Kepka BSSN No. 443 Tahun 2025** — ECDSA kurva **P-384**, hash **SHA-384**, AES-256. Tidak memakai P-256 atau SHA-256 sebagai hash mandiri.

## Fitur inti

- **Autentikasi kepemilikan-kunci** (bukan NIK/password): perangkat menandatangani nonce server (ECDSA P-384) — NIK bukan autentikator.
- **Layanan surat digital**: warga ajukan → operator susun draft → Kepala Desa tanda tangani (ECDSA) → surat terbit ber-QR → **verifikasi publik**.
- **Verifikasi kelayakan privat (ZKP)**: warga membuktikan memenuhi syarat (penduduk terdaftar via Merkle membership + Schnorr) tanpa membuka seluruh data pribadi (minimalisasi data, UU PDP No. 27/2022).
- **Booking janji temu** dengan Kepala Desa (anti double-book + QR check-in).
- **RBAC 4 peran** (Warga / Operator / Kepala Desa / Admin) + **audit log append-only berantai-hash**.

## Struktur (monorepo)

| Paket | Isi | Uji |
|---|---|---|
| [`packages/crypto`](packages/crypto) | `@sidesa/crypto` (TypeScript) — ECDSA P-384, SHA-384, Merkle, Schnorr, eligibility proof | 26 |
| [`packages/backend`](packages/backend) | NestJS + Prisma + PostgreSQL — auth, RBAC, registry/ZKP, letter service, booking, audit | 47 |
| [`packages/app`](packages/app) | Flutter (Material 3) — UI warga, kripto Dart (pointycastle), API client, auth flow | 12 |

Total **± 81 uji otomatis** (TDD). Interop kripto **Dart → TypeScript** terbukti (tanda tangan Flutter diterima `@sidesa/crypto`).

## Menjalankan

**Prasyarat:** Node.js 20, Flutter 3.4+, Docker (untuk PostgreSQL).

```bash
# 1. Install semua workspace
npm install

# 2. Crypto core
npm -w @sidesa/crypto test

# 3. Backend (butuh PostgreSQL)
docker run --name sidesa-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=sidesa -p 5432:5432 -d postgres:16
cp packages/backend/.env.example packages/backend/.env
cd packages/backend && npx prisma migrate deploy && npx prisma generate && npm test

# 4. Aplikasi Flutter
cd packages/app && flutter pub get && flutter test
flutter run   # dengan emulator/HP tersambung
```

## Dokumentasi

- **PRD / Spesifikasi**: [`docs/superpowers/specs/`](docs/superpowers/specs)
- **Rencana implementasi** (per subsistem): [`docs/superpowers/plans/`](docs/superpowers/plans)
- **Panduan desain UI/UX**: [`DESIGN.md`](DESIGN.md)

## Status

Fondasi kriptografi + seluruh backend inti + fondasi & UI mobile warga **selesai dan teruji**. Yang menyusul: sambungan penuh UI↔backend, layar operator/kepala desa, penyimpanan kunci Android Keystore + biometrik, notifikasi, dan render PDF.

## Lisensi

Project akademik/pengabdian masyarakat. Gunakan secara bertanggung jawab.
