# Runbook Demo — Sisi Kriptografi SIDESA-CM
**Untuk mata kuliah: Implementasi Kriptografi.** Durasi target: ~7 menit + Q&A.

Pesan inti yang ingin ditanamkan ke penilai:
1. Algoritma **patuh Kepka BSSN No. 443 Tahun 2025** (ECDSA **P-384**, **SHA-384**).
2. Protokol tingkat-atas (Merkle, Schnorr+Fiat-Shamir, bukti kelayakan) **diimplementasikan sendiri**; primitif dari pustaka **teraudit** (`@noble/curves`).
3. Keamanannya **dibuktikan uji negatif** (pemalsuan/replay/manipulasi ditolak).

---

## 0. Persiapan (5 menit sebelum mulai)
```bash
npm run db:up            # nyalakan PostgreSQL
npm run test:crypto      # pastikan 26 test HIJAU
npm run test:backend     # (opsional) 48 test HIJAU
```
- Buka di editor: `packages/crypto/src/{ecdsa,merkle,schnorr,eligibility}.ts` dan file test-nya.
- (Opsional) Siapkan emulator + screenshot layar "Surat selesai (Cap Digital)" dan "Verifikasi publik" sebagai cadangan.
- **Aturan emas:** jalankan semua perintah sekali sebelum demo — hindari kejutan live.

---

## Alur Demo (~7 menit)

### 1) Pembukaan (30 dtk)
> "Ini aplikasi layanan Desa Cibeteung Muara. Dua primitif kripto inti: **ECDSA** untuk tanda tangan digital Kepala Desa (non-repudiation + verifikasi publik), dan **ZKP** untuk membuktikan kelayakan warga tanpa membuka data pribadinya. Semua patuh **Kepka BSSN 443/2025** — P-384, SHA-384."

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
Buka `packages/crypto/src/schnorr.ts`. Jelaskan Schnorr non-interaktif:
- Prover pilih nonce acak `k`, hitung `R = k·G`.
- Challenge `c = SHA-384(pubkey ‖ R ‖ konteks)` → **Fiat-Shamir** (non-interaktif).
- Respons `s = k + c·x mod n`. Verifier cek `s·G = R + c·P`.
> "Karena challenge mengikat **konteks permohonan**, proof tidak bisa dipakai ulang di permohonan lain (anti-replay). Ini *zero-knowledge* atas rahasia `x`."

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
Tunjuk layar **Cap Digital** (surat sah) dan **halaman verifikasi publik**.

### 7) Penutup + kejujuran akademik (30 dtk)
> "Batasan yang jujur: ZKP kami **pseudonim**, bukan anonim penuh tak-terhubungkan — itu butuh **zk-SNARK**, kami tandai *future work*. Kunci di app belum *hardware-backed* (Android Keystore) — langkah berikut. Tanda tangan masih *self-signed*, jalur produksi lewat **PSrE/BSrE** (UU ITE)."

---

## Bingkai ZKP dengan TEPAT (jangan overclaim)
Sebut persis: **"bukti kepemilikan kunci zero-knowledge (Schnorr) + bukti keanggotaan Merkle + selective disclosure"** — bukan "anonim penuh". Bagian Schnorr = ZK sejati; bagian keanggotaan mengungkap commitment pseudonim (terhubungkan antar-permohonan).

## Cheat-sheet perintah
| Tujuan | Perintah |
|---|---|
| DB nyala | `npm run db:up` |
| Test kripto (26) | `npm run test:crypto` |
| Test backend (48) | `npm run test:backend` |
| Interop Dart→TS | `npm -w @sidesa/crypto test -- test/interop.dart.test.ts` |

## Q&A cepat
- **Implementasi sendiri atau library?** Primitif (ECDSA/SHA) dari `@noble/curves` **teraudit** (praktik benar — jangan gulung sendiri); protokol atas (Merkle, Schnorr+Fiat-Shamir, komposisi, domain-separation, low-S) **sendiri**.
- **Kenapa P-384, bukan P-256?** Kepka 443/2025 — P-256 & SHA-256-mandiri tak ada di daftar.
- **Nonce ECDSA?** Deterministik **RFC 6979** → tak ada risiko nonce-reuse.
- **Fiat-Shamir aman?** Challenge mengikat semua komitmen + konteks (hindari *weak Fiat-Shamir*).
- **Kunci privat Kepala Desa?** Tak pernah di server; server hanya verifikasi.
- **Kenapa low-S?** Cegah *malleability*; verifier menolak high-S.

## Rencana cadangan (kalau live gagal)
- Test kripto & backend **tidak butuh internet**. Emulator sudah terpasang lokal.
- Siapkan screenshot output test yang hijau + layar app, jaga-jaga.
