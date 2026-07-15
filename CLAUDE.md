# CLAUDE.md — Instruksi Project SIDESA-CM

Instruksi ini dibaca AI setiap sesi. Ikuti dengan patuh.

## Apa ini
Aplikasi layanan digital **Desa Cibeteung Muara** (Ciseeng, Bogor) — tanda tangan digital **ECDSA** + **ZKP** untuk surat & janji temu. Project ABDIMAS Poltek SSN (D4 Rekayasa Kriptografi).

## Gaya kerja: VIBE CODING + TDD sebagai rambu
- AI menulis kode **per tugas**; manusia me-review diff di antara tugas.
- **TDD wajib jadi jaring pengaman**: tulis test gagal → implementasi minimal → hijau → commit. Satu tugas = satu deliverable teruji.
- Biarkan **test watcher menyala** saat bekerja (`npm -w @sidesa/backend run test:watch`, atau `flutter test` berulang).
- **JANGAN PERNAH melemahkan test soundness/negatif** agar hijau. Test merah pada kripto/keamanan = ada yang salah → investigasi (superpowers:systematic-debugging).
- Commit kecil & sering. Vibe bebas untuk UI/glue; **ketat untuk kripto & auth**.

## KEPATUHAN KRIPTO (tidak bisa ditawar)
- Sesuai **Kepka BSSN No. 443 Tahun 2025**: ECDSA **P-384**, hash **SHA-384**, **AES-256**.
- **JANGAN** pakai **P-256** atau **SHA-256** sebagai hash mandiri. (SHA-256 hanya boleh di dalam DRBG.)
- Semua kripto lewat **`@sidesa/crypto`** — jangan menggulung primitif sendiri, jangan pakai pustaka kripto lain.
- Kripto Dart (`packages/app`) harus cocok format wire `@sidesa/crypto`: kunci publik terkompresi **49 byte**, tanda tangan compact **96 byte low-S** atas digest SHA-384.

## Fakta arsitektur kunci
- **Auth = kepemilikan kunci** (perangkat menandatangani nonce server), **bukan** NIK/password. NIK bukan autentikator.
- **Minimalisasi data (UU PDP)**: simpan `nikCommitment` (hash), **bukan** NIK mentah.
- Peran: `WARGA` / `OPERATOR` / `KADES` / `ADMIN`. **Kunci privat Kepala Desa tidak pernah ada di server** — server hanya memverifikasi tanda tangan.
- Audit log **append-only berantai-hash**.

## Struktur monorepo (npm workspaces)
| Paket | Isi | Test |
|---|---|---|
| `packages/crypto` | `@sidesa/crypto` (TS) — ECDSA/Merkle/Schnorr/eligibility | `npm run test:crypto` |
| `packages/backend` | NestJS + Prisma + PostgreSQL | `npm run test:backend` (butuh DB) |
| `packages/app` | Flutter (Material 3) | `cd packages/app && flutter test` |

## Menjalankan (dev)
```bash
npm run db:up        # nyalakan PostgreSQL (Docker container sidesa-pg)
npm run db:migrate   # terapkan migrasi Prisma + generate client
npm run test         # crypto + backend
npm run backend:dev  # NestJS mode watch
# Flutter:
cd packages/app && flutter run   # emulator Pixel_7 harus menyala
```

## Aturan penting
- **Migrasi Prisma**: lingkungan ini non-interaktif → **JANGAN** `prisma migrate dev`. Pakai:
  `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script` → simpan SQL ke folder migrasi baru → `prisma migrate deploy` → `prisma generate`.
- **`.env` jangan di-commit** (sudah gitignore). Rahasia hanya di `.env`; contoh di `.env.example`.
- **Commit** bergaya conventional (`feat/fix/test/docs`), akhiri dengan trailer `Co-Authored-By: Claude ...`. Commit hanya bila diminta atau bagian dari eksekusi rencana.
- **`git push` hanya bila user memintanya.**
- Vitest backend mengimpor `@sidesa/crypto` dari sumber via alias (bukan build dist).

## Di mana mencari
- PRD/spesifikasi: `docs/superpowers/specs/`
- Rencana implementasi per subsistem: `docs/superpowers/plans/`
- Panduan desain UI/UX (Material 3): `DESIGN.md`

## Peta jalan berikutnya
- **Fase A** (koding): wiring UI warga ↔ backend; layar Operator & Kepala Desa; gate ZKP di pengajuan surat; render PDF + QR.
- **Fase B**: Android Keystore/StrongBox + biometrik; notifikasi FCM; pengerasan (audit calls, rate limit, rotasi kunci).
- **Fase C/D**: integrasi PSrE/BSrE (UU ITE), deploy TLS, seed registri penduduk, pelatihan & uji lapangan, SOP + serah terima.
