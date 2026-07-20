# Runbook Uji Coba 3 Peran — Warga / Operator / Kepala Desa

Panduan menjalankan aplikasi secara manual dan mencoba ketiga peran end-to-end.

> **Peran TIDAK dipilih di UI.** Aplikasi menentukannya otomatis dari akun yang login:
> `/auth/verify` mengembalikan `role`, lalu `main.dart` merutekan ke shell yang sesuai.
> Karena layar enrolment perangkat belum ada, untuk sementara akun ditanam saat build
> lewat `--dart-define`. Berganti peran = jalankan ulang dengan pasangan akun lain.

---

## 0. Prasyarat (sekali per sesi)

```bash
npm run db:up          # Postgres (Docker container sidesa-pg)
npm run db:migrate     # hanya jika skema berubah
npm run backend:dev    # backend NestJS (otomatis build @sidesa/crypto dulu) — BIARKAN JALAN
```

Cek backend hidup:
```bash
curl http://localhost:3000/health     # -> {"status":"ok"}
```

Nyalakan emulator **Pixel_7** (Android Studio, atau):
```bash
emulator -avd Pixel_7
```

`10.0.2.2` sudah otomatis menunjuk ke host dari emulator, jadi tak perlu konfigurasi jaringan lain.

### ⚠️ Layar kunci emulator
Emulator kini **ber-PIN `1234`**. Ini konsekuensi Fase B1: kunci Android Keystore dengan
`setUserAuthenticationRequired(true)` mensyaratkan layar kunci aktif.

- Buka kunci: geser ke atas → ketik `1234`
- Atau simulasikan sidik jari: `adb emu finger touch 1`
- Menghapus PIN (`adb shell locksettings clear --old 1234`) **akan melumpuhkan kunci
  hardware biometrik** — mode `SIDESA_HARDWARE=1` harus di-enroll ulang. Untuk uji peran
  dengan kunci software, PIN boleh dibiarkan.

---

## 1. Buat akun ketiga peran (sekali di awal demo)

```bash
cd packages/backend
SEED=1 npx vitest run test/seed-dev.test.ts
```

Seed ini:
- membuat akun **ACTIVE** untuk WARGA, OPERATOR, KADES;
- **mendaftarkan warga ke registri penduduk dan mempublikasikan root yang
  ditandatangani Kepala Desa** — wajib, karena pengajuan surat dijaga gate ZKP;
- mencetak kredensial tiap peran:

```
[WARGA]     SIDESA_ACCOUNT=...   SIDESA_PRIVKEY=...
[OPERATOR]  SIDESA_ACCOUNT=...   SIDESA_PRIVKEY=...
[KADES]     SIDESA_ACCOUNT=...   SIDESA_PRIVKEY=...
```

> **Simpan ketiga pasangan itu.** Setiap kali seed dijalankan ulang, kunci **baru** dibuat
> dan registri di-reset — cukup jalankan **sekali** di awal sesi demo.

---

## 2. Menjalankan aplikasi sebagai satu peran

```bash
cd packages/app
flutter run \
  --dart-define=SIDESA_API=http://10.0.2.2:3000 \
  --dart-define=SIDESA_ACCOUNT=<akun peran tsb> \
  --dart-define=SIDESA_PRIVKEY=<privkey peran tsb>
```

Tap **"Masuk"** → aplikasi mendarat sesuai peran:

| Peran | Layar utama | Aksi yang bisa dicoba |
|---|---|---|
| **WARGA** | Beranda | Ajukan Surat, Surat Saya, Buat Janji, Unduh PDF |
| **OPERATOR** | Verifikasi Surat | Verifikasi (jadi draft) / Tolak |
| **KADES** | Tanda Tangan Surat | Buka draft → **Tanda tangani** (ECDSA P-384) |

**Ganti peran:** tekan `q` di terminal `flutter run`, lalu jalankan lagi dengan pasangan lain.
(Alternatif: `flutter build apk --debug --dart-define=...` lalu `adb install -r build/app/outputs/flutter-apk/app-debug.apk`.)

---

## 3. Skenario end-to-end lintas peran

Jalankan berurutan, berganti peran di tiap langkah:

1. **WARGA** → *Ajukan Surat* → pilih **Surat Keterangan Domisili** → isi Keperluan → **Kirim**
   → status `SUBMITTED`.
   *(Di sinilah gate ZKP bekerja: app mengambil nonce sekali-pakai + bukti keanggotaan Merkle,
   lalu menandatangani context — NIK tak pernah dikirim.)*

2. **OPERATOR** → antrean menampilkan permohonan → **Verifikasi**
   → status `DRAFTED`, surat mendapat nomor (mis. `72/SKD/2026`).

3. **KADES** → antrean tanda tangan → buka surat → **Tanda tangani**
   → status `SIGNED`, terbit **token verifikasi (QR)**.

4. **WARGA** → *Surat Saya* → surat berstatus **Selesai** → buka → **Unduh PDF**
   → pratinjau A4: kop desa, isi surat yang ditandatangani, blok tanda tangan, **QR**.

5. **Publik** (tanpa login, seperti orang memindai QR):
```bash
curl http://localhost:3000/verify/<qrToken>     # -> {"valid":true, "signer":"...", ...}
```

---

## 4. (Opsional) Mode biometrik / kunci hardware

Mode ini memakai kunci **Android Keystore (StrongBox/TEE)** yang wajib sidik jari tiap
tanda tangan. Karena hanya ada **satu kunci** per perangkat, mode ini untuk mendemokan
**satu peran**, bukan gonta-ganti peran.

```bash
flutter run \
  --dart-define=SIDESA_API=http://10.0.2.2:3000 \
  --dart-define=SIDESA_HARDWARE=1
```
1. Jalankan tanpa `SIDESA_ACCOUNT` dulu → app membuat kunci hardware dan mencetak kunci
   publiknya ke log (`SIDESA hardware public key: ...`).
2. Daftarkan kunci publik itu ke sebuah akun di database (peran sesuai kebutuhan).
3. Jalankan ulang dengan `--dart-define=SIDESA_ACCOUNT=<akun tsb>` **+** `SIDESA_HARDWARE=1`.
4. Tap **Masuk** → muncul prompt sidik jari. Di emulator, setujui dengan:
```bash
adb emu finger touch 1
```

Jika sidik jari belum terdaftar, app **otomatis mundur** ke kunci software (aman, tidak error).

---

## 5. Pemecahan masalah

| Gejala | Sebab & solusi |
|---|---|
| `curl /health` gagal / app "mode demo" | Backend belum jalan → `npm run backend:dev` |
| **403** saat *Kirim permohonan* | Warga belum terdaftar di registri aktif → jalankan ulang seed (langkah 1) |
| **400** saat *Kirim permohonan* | Body tak lolos validasi (mis. jenis surat tak dikenal) |
| Login gagal / balik ke layar login | `SIDESA_ACCOUNT` & `SIDESA_PRIVKEY` tidak berpasangan — ambil ulang dari output seed |
| Antrean operator/kades kosong | Belum ada surat pada status yang sesuai; ulangi langkah sebelumnya, lalu **Muat ulang** |
| Emulator minta PIN | PIN = `1234` (lihat catatan di bagian 0) |
| Prompt biometrik tak merespons | `adb emu finger touch 1` |
| Backend gagal start setelah `git pull` | `npm run build:crypto` lalu ulangi `npm run backend:dev` |

---

## 6. Catatan untuk produk akhir

Aplikasi rilis nanti **tetap satu APK** untuk semua peran — routing peran sudah digerakkan
server. `--dart-define` di runbook ini hanyalah jalan pintas pengembangan sampai
**enrolment perangkat** dibangun (perangkat membuat kunci → didaftarkan operator/admin →
menerima `accountId` → disimpan lokal → cukup sidik jari untuk login berikutnya).
