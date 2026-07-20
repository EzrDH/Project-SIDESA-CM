# Runbook Demo — Sisi Kriptografi SIDESA-CM
**Untuk mata kuliah: Implementasi Kriptografi.** Durasi target: ~7 menit + Q&A.

> Untuk **menjalankan & mencoba aplikasi per peran** (Warga / Operator / Kepala Desa),
> lihat [RUNBOOK-UJI-PERAN.md](RUNBOOK-UJI-PERAN.md).

Pesan inti yang ingin ditanamkan ke penilai:
1. Algoritma **patuh Kepka BSSN No. 443 Tahun 2025** (ECDSA **P-384**, **SHA-384**).
2. Protokol tingkat-atas (Merkle tree, komposisi bukti kelayakan, domain separation, normalisasi low-S, rantai-hash audit) **diimplementasikan sendiri**; primitif dari pustaka **teraudit** (`@noble/curves`).
3. Keamanannya **dibuktikan uji negatif** (pemalsuan/replay/manipulasi ditolak).

---

## 0. Persiapan (5 menit sebelum mulai)
```bash
npm run db:up            # nyalakan PostgreSQL
npm run test:crypto      # pastikan 26 test HIJAU
npm run test:backend     # (opsional) 57 test HIJAU
```
- Buka di editor: `packages/crypto/src/{ecdsa,merkle,schnorr,eligibility}.ts` dan file test-nya.
- (Opsional) Siapkan emulator + screenshot layar "Surat selesai (Cap Digital)" dan "Verifikasi publik" sebagai cadangan.
- **Aturan emas:** jalankan semua perintah sekali sebelum demo — hindari kejutan live.

---

## Alur Demo (~7 menit)

### 1) Pembukaan (30 dtk)
> "Ini aplikasi layanan Desa Cibeteung Muara. Dua pilar kripto: **ECDSA P-384** untuk tanda tangan digital Kepala Desa — dibuat **di perangkatnya**, dikunci **biometrik**, diverifikasi publik lewat QR; dan **bukti kelayakan privasi** (keanggotaan Merkle + tanda tangan terikat konteks sekali-pakai) agar warga membuktikan haknya **tanpa mengirim NIK**. Semua patuh **Kepka BSSN 443/2025** — P-384, SHA-384."

### 2) Primitif & uji soundness — **INTI** (2 mnt)
```bash
npm run test:crypto
```
> "26 test hijau: hashing SHA-384, ECDSA P-384, Merkle tree, Schnorr, bukti kelayakan."

Buka `test/schnorr.test.ts` dan `test/eligibility.test.ts`, tunjuk test **negatif**:
- *rejects a proof for a different public key (soundness)*
- *rejects a proof replayed under a different context*
- *rejects an impersonator who copies a real public key but lacks the secret*

> "Test negatif inilah bukti kripto benar-benar aman: pemalsuan, replay, dan impersonasi **ditolak**."

### 3) Bedah satu konstruksi (2 mnt)
Buka `packages/crypto/src/eligibility.ts` — **konstruksi bukti kelayakan yang dipakai sistem**. Dua bagian:
1. **Keanggotaan** — bukti **Merkle** bahwa leaf `H("SIDESA-resident-leaf-v1" ‖ kunci publik ‖ atribut)` berada di bawah **root registri yang ditandatangani ECDSA oleh Kepala Desa**.
2. **Kepemilikan** — **tanda tangan ECDSA atas *context*** `SIDESA-letter-eligibility-v1|akun|jenis|nonce`, dengan **nonce sekali-pakai** dari server.

> "Karena tanda tangan mengikat **konteks permohonan beserta nonce sekali-pakai**, bukti tidak dapat dipakai ulang di permohonan lain — nonce dibakar setelah dipakai. Yang **tidak** dikirim: NIK. Server hanya menyimpan `nikCommitment`."

**Bila ditanya soal Schnorr:** sub-bukti kepemilikan **semula** memakai Schnorr + Fiat-Shamir. Pada Fase B kami memindahkan kunci identitas ke **Android Keystore/StrongBox**, yang **hanya mengekspos ECDSA** — skalar privat tidak pernah dapat diakses aplikasi, sehingga Schnorr **tidak mungkin** dijalankan kunci hardware. Sub-bukti itu karenanya dimigrasikan ke **ECDSA-over-context**: setara untuk membuktikan penguasaan kunci **dan** mengikat ke satu permohonan, tanpa mengubah sifat privasinya. Primitif Schnorr **masih ada & teruji** di `packages/crypto/src/schnorr.ts` (boleh ditunjukkan sebagai kemampuan implementasi), tetapi **tidak lagi dipakai** bukti kelayakan.

### 4) Interop lintas-bahasa (1 mnt)
```bash
npm -w @sidesa/crypto test -- test/interop.dart.test.ts
```
> "Tanda tangan dibuat di aplikasi **Flutter (Dart)**, lalu diverifikasi backend **TypeScript** — format wire P-384 sama persis (kunci terkompresi 49 byte, tanda tangan compact 96 byte low-S). Ini membuktikan pemahaman format, bukan sekadar memanggil library."

### 5) Alur nyata end-to-end (1,5 mnt)
```bash
npm run test:backend
```
Tunjuk `test/letter-flow.e2e.test.ts` dan `test/zkp-flow.e2e.test.ts`.
> "Kepala Desa menandatangani surat (ECDSA) → siapa pun verifikasi lewat QR → **SAH**. Jika satu byte surat diubah → **TIDAK VALID**. Warga membuktikan kelayakan → server memverifikasi tanpa melihat data pribadi penuh."

### 6) (Opsional) Visual emulator (1 mnt)
Tunjuk layar **Cap Digital** (surat sah) dan hasil **verifikasi publik**. Bila waktu memungkinkan, tambahkan bukti Fase B:
- **Prompt biometrik** saat Kepala Desa menandatangani — kunci privat keluar dari Keystore hanya setelah sidik jari terverifikasi.
- **PDF ber-QR** hasil unduhan warga: kop desa + **isi kanonik yang ditandatangani** + QR menuju endpoint verifikasi publik.

Panduan menjalankan tiga peran ada di `RUNBOOK-UJI-PERAN.md`.

### 7) Penutup + kejujuran akademik (30 dtk)
> "Batasan yang jujur: skema kami **pseudonim**, bukan anonim penuh tak-terhubungkan — itu butuh **zk-SNARK/anonymous credential**, kami tandai *future work*. Yang dilindungi adalah **data kependudukan** (NIK/atribut penuh), bukan ketertautan antar-permohonan. Kunci identitas **sudah** *hardware-backed* dan dikunci biometrik (Android Keystore), namun **StrongBox penuh** butuh perangkat fisik — emulator hanya TEE, dan **key attestation** belum dibangun. Tanda tangan masih *self-signed*, jalur produksi lewat **PSrE/BSrE** (UU ITE)."

---

## Bingkai bukti kelayakan dengan TEPAT (jangan overclaim)
Sebut persis: **"bukti keanggotaan Merkle terhadap root ber-TTD Kepala Desa + bukti penguasaan kunci terikat konteks sekali-pakai + selective disclosure atribut"**.

- **Boleh diklaim:** NIK tidak pernah dikirim; hanya atribut yang diperlukan diungkap; bukti terikat satu permohonan (anti-replay).
- **Jangan diklaim:** "anonim penuh" atau "zero-knowledge" tanpa kualifikasi. Kunci publik warga **terungkap** ke server, sehingga permohonan dari kunci yang sama **dapat dikaitkan**. Sifat *zero-knowledge* dalam arti ketat kini hanya melekat pada primitif Schnorr yang **tidak lagi dipakai** jalur produksi.
- Jika penguji menekan istilah: sebut **"privacy-preserving eligibility verification"** — itu deskripsi yang akurat.

## Cheat-sheet perintah
| Tujuan | Perintah |
|---|---|
| DB nyala | `npm run db:up` |
| Test kripto (26) | `npm run test:crypto` |
| Test backend (57) | `npm run test:backend` |
| Interop Dart→TS | `npm -w @sidesa/crypto test -- test/interop.dart.test.ts` |

## Q&A cepat
- **Implementasi sendiri atau library?** Primitif (ECDSA/SHA) dari `@noble/curves` **teraudit** (praktik benar — jangan gulung sendiri); protokol atas (Merkle, komposisi bukti kelayakan, domain-separation, low-S, rantai-hash audit) **sendiri**.
- **Kenapa P-384, bukan P-256?** Kepka 443/2025 — P-256 & SHA-256-mandiri tak ada di daftar.
- **Nonce ECDSA?** Deterministik **RFC 6979** → tak ada risiko nonce-reuse.
- **Kenapa ownership pakai ECDSA, bukan Schnorr?** Kunci identitas kini hidup di **Android Keystore/StrongBox** yang **hanya mengekspos ECDSA**; skalar privat tak pernah dapat diakses aplikasi, sehingga Schnorr mustahil dijalankan kunci hardware. ECDSA-over-context memberi jaminan yang setara untuk tujuan ini (penguasaan kunci + pengikatan ke satu permohonan). Primitif Schnorr tetap ada & teruji di repo.
- **Bagaimana anti-replay-nya?** *Context* memuat **nonce sekali-pakai** terbitan server yang **dibakar** setelah dipakai; bukti untuk permohonan lain otomatis tidak sah.
- **Kunci privat Kepala Desa?** Tak pernah di server **dan tak pernah di memori aplikasi** — berada di Keystore perangkat, dipakai hanya setelah verifikasi biometrik.
- **Kenapa low-S?** Cegah *malleability*; verifier menolak high-S.
- **Audit bisa dipercaya?** Append-only **berantai-hash**; `GET /audit/verify` menghitung ulang rantai — mengubah satu baris membuat verifikasi gagal (terbukti di test).

## Rencana cadangan (kalau live gagal)
- Test kripto & backend **tidak butuh internet**. Emulator sudah terpasang lokal.
- Siapkan screenshot output test yang hijau + layar app, jaga-jaga.
