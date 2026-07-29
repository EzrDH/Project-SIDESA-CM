# SIDESA-CM — Sistem Digital Layanan Desa Cibeteung Muara

Layanan **janji temu dan antrean digital** untuk **Desa Cibeteung Muara** (Kec. Ciseeng, Kab. Bogor). Warga memesan waktu bertemu Kepala Desa melalui aplikasi, dan sistem memastikan pemohon memang penduduk yang berhak — **tanpa pernah mengumpulkan NIK**.

Seluruh lapisan identitas bertumpu pada **satu primitif**: bukti tanpa pengetahuan **Schnorr** (*zero-knowledge proof of knowledge*) di atas kurva **P-384** dengan tantangan berdomain **SHA-384**.

Project Pengabdian kepada Masyarakat (ABDIMAS) — Politeknik Siber dan Sandi Negara (Poltek SSN), D4 Rekayasa Kriptografi.

> **Sistem ini tidak memiliki fitur tanda tangan dokumen digital.** Fokus kriptografinya sepenuhnya pada pembuktian kelayakan yang menjaga privasi. Lihat [KA-1 pada dokumen arsitektur](docs/ARSITEKTUR.md#12-keputusan-arsitektur-dan-konsekuensinya).

## Masalah yang diselesaikan

Warga yang perlu bertemu Kepala Desa datang tanpa kepastian giliran, lalu menunggu berjam-jam atau pulang tanpa terlayani. Memindahkan antrean ke aplikasi memunculkan masalah kedua: layanan hanya untuk penduduk desa, dan cara lazim memverifikasinya adalah meminta NIK — yang mengubah basis data janji temu menjadi basis data kependudukan.

**Kelayakan dibuktikan secara kriptografis, sehingga NIK tidak pernah melintasi jaringan maupun tersimpan di peladen.**

## Fitur inti

- **Autentikasi kepemilikan-kunci** — perangkat membuktikan penguasaan skalar privat atas nonce sekali pakai. Tidak ada kata sandi; **NIK bukan autentikator** (semipublik dan tercetak pada KTP).
- **Pendaftaran perangkat berbukti** — mengklaim kode dari operator menuntut bukti penguasaan kunci, sehingga kunci milik orang lain tidak dapat didaftarkan.
- **Verifikasi kelayakan privat** — keanggotaan registri (pohon Merkle) + penguasaan kunci, tanpa membuka data kependudukan. Selaras minimalisasi data UU PDP No. 27/2022.
- **Janji temu dengan Kepala Desa** — pengajuan, konfirmasi, pembatalan, dan *check-in* di kantor desa.
- **RBAC 4 peran** (Warga / Operator / Kepala Desa / Admin) + **log audit *append-only* berantai-hash**.

Ketiga gerbang identitas menjalankan protokol yang sama dan hanya dibedakan konteks yang mengikat buktinya — keseragaman itu ditegakkan oleh pengujian penjaga otomatis.

## Struktur (monorepo)

| Paket | Isi | Uji |
|---|---|---|
| [`packages/crypto`](packages/crypto) | `@sidesa/crypto` (TypeScript) — Schnorr NIZK P-384, SHA-384 berdomain, Merkle, bukti kelayakan | 34 |
| [`packages/backend`](packages/backend) | NestJS + Prisma + PostgreSQL — gerbang identitas, registri, janji temu, audit, notifikasi | 100 |
| [`packages/app`](packages/app) | Flutter (Material 3) — UI seluruh peran, kripto Dart (`pointycastle`), klien API | 34 |

**Total 168 pengujian otomatis** (TDD). Kesepakatan kripto **Dart ↔ TypeScript** ditegakkan pengujian jawaban-diketahui lintas bahasa, bukan sekadar artefak bersama.

> **Kepatuhan kripto:** kurva **P-384**, hash **SHA-384**. **P-256 dan SHA-256 sebagai hash mandiri tidak digunakan di mana pun.**

## Menjalankan

**Prasyarat:** Node.js 20, Flutter 3.4+, Docker (untuk PostgreSQL).

```bash
npm install
npm run db:up
npm run db:migrate
npm test
```

`npm test` menjalankan rangkaian kripto dan backend **lalu membangun keduanya** — pembangunan ikut dirantai karena pengujian memakai alias ke sumber, sehingga rangkaian hijau tidak menjamin pembangunan sehat.

```bash
npm run test:all
```

Menambahkan rangkaian Flutter di depan perintah di atas.

```bash
npm run backend:dev
cd packages/app && flutter run
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| **[`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md)** | **Dokumen arsitektur — mulai dari sini** |
| [`docs/SIDESA-CM_PRD_Final.md`](docs/SIDESA-CM_PRD_Final.md) | Kebutuhan produk lengkap |
| [`docs/SIDESA-CM_PRD_Ringkas.md`](docs/SIDESA-CM_PRD_Ringkas.md) | Versi ringkas berdaftar isi |
| [`docs/superpowers/specs/`](docs/superpowers/specs) | Spesifikasi desain |
| [`docs/superpowers/plans/`](docs/superpowers/plans) | Rencana implementasi per subsistem |
| [`DESIGN.md`](DESIGN.md) | Panduan desain UI/UX (Material 3) |

## Status

**Tahap 1 selesai** — ketiga gerbang identitas berjalan di atas Schnorr, dengan penolakan seragam atas masukan cacat.

Berikutnya: **Tahap 2** menghapus subsistem surat, ECDSA, PDF/QR, dan keystore hardware yang masih tersisa di kode; **Tahap 3** (antrean *real-time*) menunggu wawancara perangkat desa, karena aturan slot waktu harus berasal dari praktik nyata.

**Batasan terbuka:** kunci berbasis Android Keystore/StrongBox **tidak dapat dipakai** — bukti Schnorr membutuhkan skalar privat, sedangkan elemen aman menurut rancangannya tidak pernah melepaskannya. Lihat [Batasan yang Diketahui](docs/ARSITEKTUR.md#14-batasan-yang-diketahui).

## Lisensi

Project akademik/pengabdian masyarakat. Gunakan secara bertanggung jawab.
