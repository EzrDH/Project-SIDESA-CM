# DESIGN.md — SIDESA-CM (UI/UX)
### Panduan desain untuk digenerate di Google Stitch (stitch.withgoogle.com) & diimplementasikan di Flutter (Material 3)

---

## 1. Tujuan & Cara Pakai

Dokumen ini adalah **brief desain** aplikasi layanan Desa Cibeteung Muara. Dua fungsi:
1. **Prompt siap-tempel untuk Stitch** — tiap layar punya blok "Prompt Stitch".
2. **Spesifikasi token** untuk implementasi Flutter (warna/tipografi/komponen).

**Alur kerja yang disarankan:**
1. Tempel **§4 Global Style** sebagai konteks tema di Stitch (Standard mode dulu).
2. Generate layar **Prioritas P0** lebih dulu (alur inti demo), lalu P1/P2.
3. Ekspor ke **Figma** (untuk rapikan) atau **HTML/CSS** (referensi).
4. Implementasikan di **Flutter Material 3** memakai token di §4 (`ColorScheme.fromSeed` + override).

> Catatan: Stitch **tidak** mengeluarkan kode Flutter. Perlakukan hasilnya sebagai **referensi visual**, bukan kode final.

---

## 2. Pendekatan Desain — Material 3 yang dikustomisasi

**Dipakai:** **Material 3 (Material You)**, dikustomisasi identitasnya.
- Native Flutter → desain ⇒ kode mulus.
- Familiar bagi pengguna Android desa; komponen & aksesibilitas matang.
- Stitch menghasilkan tata letak yang selaras Material.

**Ditolak & alasannya:**
- *Cupertino/iOS style* — proyek Android-first; tidak selaras.
- *Design system kustom penuh* — boros untuk prototipe 1 semester.
- *Material default polos* (ungu bawaan) — generik; kita ganti dengan identitas grounded di §3–§4.

---

## 3. Arah Desain (Design Direction)

**Subjek & audiens.** Layanan administrasi **pemerintahan desa**. Audiens: warga umum (termasuk **lansia & literasi digital rendah**), operator desa, dan Kepala Desa. Tugas utama tiap layar: *menyelesaikan satu urusan surat/janji dengan jelas dan terpercaya.*

**Kepribadian.** Resmi tapi ramah; **tenang, jujur, terpercaya**. Ini sistem tanda tangan resmi — harus terasa kredibel & aman, bukan ramai/gimmick.

**Thesis / elemen tanda (signature).** Dunia "surat resmi": kop surat, **cap/stempel bundar**, tanda tangan, QR. Momen puncak emosional = saat sebuah surat menjadi **"SAH"**. Elemen yang diingat = **"Cap Digital"**: stempel verifikasi bundar (emblem desa + centang + label TERVERIFIKASI + potongan QR/nomor). Muncul pada surat sah & halaman verifikasi.

**Prinsip (grounded pada warga desa):**
- **Sedikit langkah, satu aksi utama per layar.** Tombol besar, jelas.
- **Selalu ikon + label** (jangan andalkan ikon saja).
- **Bahasa Indonesia sederhana**, sentence case, kata kerja aktif.
- **Status selalu terlihat** (chip berwarna + timeline).
- **Isyarat privasi & keamanan** ditampilkan eksplisit (ZKP → "data Anda terlindungi").

---

## 4. Design System (Token)

### 4.1 Warna (Light) — seed Material 3 + peran

**Seed Flutter:** `ColorScheme.fromSeed(seedColor: Color(0xFF0F5C6B))`, lalu override secondary/tertiary di bawah.

| Peran | Hex | Makna |
|---|---|---|
| Primary — *Biru Arsip* | `#0F5C6B` | Resmi, tenang, terpercaya |
| On-Primary | `#FFFFFF` | Teks di atas primary |
| Primary Container | `#B7E9F0` / On `#00363F` | Latar lembut aksen primary |
| Secondary — *Hijau Padi* | `#4F7A3A` | Desa, tumbuh, sawah |
| Secondary Container | `#D0EEB8` / On `#10380B` | |
| Tertiary/Accent — *Ochre Cap* | `#B7791F` | Stempel/emas resmi, highlight verifikasi |
| Tertiary Container | `#FBE0A8` / On `#3A2A00` | |
| Success — *Sah* | `#2E7D32` | Status "Ditandatangani/SAH" |
| Warning — *Menunggu* | `#B7791F` | Status "Menunggu/Diproses" (pakai ochre) |
| Error — *Ditolak* | `#BA1A1A` / Container `#FFDAD6` | |
| Background | `#F4F6F7` | Netral sejuk |
| Surface | `#F8FAFB` / On `#1A1C1D` | Kartu & permukaan |
| Surface Variant / Outline | `#E1E5E7` / `#8A9296` | Pembatas halus |
| **Paper** (khusus preview surat) | `#FBF8F1` | Hangat, meniru kertas surat asli |

> *Dark theme* menyusul (turunkan dari seed yang sama; jaga kontras AA).

### 4.2 Tipografi — 3 peran (grounded)

| Peran | Font | Dipakai untuk |
|---|---|---|
| **UI / Sans** | **Plus Jakarta Sans** (buatan Indonesia, sangat legibel) | Semua antarmuka: judul, tombol, label |
| **Dokumen / Serif** | **Lora** (atau Source Serif) | **Badan surat** pada preview (meniru surat resmi) |
| **Data kripto / Mono** | **JetBrains Mono** (atau Roboto Mono) | Nomor surat, hash, ID verifikasi |

**Skala (sp):** Display 30/700 · Headline 24/700 · Title 20/600 · **Body 16/400 (minimum untuk aksesibilitas)** · Label 14/500 · Caption 12/500 · Mono 14–16.

### 4.3 Bentuk, jarak, elevasi
- **Grid 4dp.** Padding halaman **20**, padding kartu **16**, gap **8/12/16/24**.
- **Radius:** kartu **20**, tombol **14**, chip **full**, bottom sheet **28** (atas).
- **Elevasi halus (0–2)**; utamakan warna permukaan tonal daripada bayangan tebal.

### 4.4 Komponen inti
- **App bar** ber-identitas desa: emblem + "Desa Cibeteung Muara".
- **Bottom navigation (Warga):** Beranda · Surat · Janji · Profil (ikon + label).
- **Aksi utama:** tombol besar / FAB **"Ajukan Surat"**.
- **Chip status berwarna** (lihat §8 kosakata).
- **Timeline vertikal** (stepper) untuk status permohonan.
- **"Cap Digital"** — stempel bundar verifikasi + QR + nomor surat (mono).
- **Banner privasi (ZKP):** ikon perisai + "Data pribadi Anda tetap terlindungi".
- **Kartu surat** (list) dengan judul, tanggal, chip status.

### 4.5 Ikonografi
**Material Symbols — Rounded** (ramah, konsisten Material 3).

### 4.6 Aksesibilitas (WAJIB)
- Kontras teks minimal **WCAG AA**. Body ≥ **16sp**. Target sentuh ≥ **48dp**.
- Ikon **selalu** berpasangan label. Dukung penskalaan ukuran teks sistem.
- Fokus keyboard terlihat; hormati *reduce motion*.

### 4.7 GLOBAL STYLE — tempel ini di Stitch
```
Design a clean, trustworthy Material 3 (Material You) mobile app for an Indonesian
village government service ("Desa Cibeteung Muara"). Audience includes elderly and
low-digital-literacy villagers, so use large tap targets, body text >=16sp, clear
icons WITH labels, and simple Bahasa Indonesia copy (sentence case).

Color palette:
- Primary "Biru Arsip" #0F5C6B (official, calm, trustworthy)
- Secondary "Hijau Padi" #4F7A3A
- Accent/Tertiary "Ochre Cap" #B7791F (official seal / highlight)
- Success #2E7D32, Error #BA1A1A, Background #F4F6F7, Surface #F8FAFB
Typography:
- UI font: Plus Jakarta Sans
- Official letter body: a serif (Lora)
- Numbers/codes (letter number, verification ID): monospace (JetBrains Mono)
Shape: rounded cards (radius 20), rounded buttons (radius 14), full-radius status
chips, subtle elevation. Icons: Material Symbols Rounded.
Signature element: a circular "Cap Digital" verification seal (village emblem +
checkmark + label "TERVERIFIKASI" + a QR snippet) shown on valid letters.
Tone: official but friendly, secure, reassuring. All screen text in Bahasa Indonesia.
```

---

## 5. Peta Layar (Screen Inventory)

**Prioritas:** **P0** = alur inti demo · **P1** = penting · **P2** = pelengkap.

| Peran | Layar | Prioritas |
|---|---|---|
| Warga | W2 Login (PIN/biometrik), W4 Beranda, W5 Pilih Jenis Surat, W6 Form Pengajuan, W7 Status Permohonan, W8 Surat Selesai (Cap Digital) | **P0** |
| Warga | W1 Onboarding, W3 Registrasi, W9 Buat Janji, W10 Detail Janji | P1 |
| Warga | W11 Profil | P2 |
| Operator | O1 Beranda (antrian), O2 Detail Permohonan (hasil ZKP), O3 Susun Draft | **P0** |
| Operator | O4 Verifikasi Warga Baru, O5 Kelola Jadwal | P1/P2 |
| Kepala Desa | K1 Beranda (menunggu TTD), K2 Review Draft, K3 Konfirmasi Tanda Tangan | **P0** |
| Kepala Desa | K4 Riwayat Tanda Tangan | P2 |
| Publik | V1 Halaman Verifikasi (SAH/TIDAK VALID) | **P0** (web) |

---

## 6. Brief Per Layar (Prompt-ready)

> Prepend **§4.7 Global Style** ke setiap prompt di bawah.

### — WARGA —

**W2 · Login (PIN / biometrik)** · P0
Layout: emblem + nama desa di atas; kolom NIK (sebagai pengenal) tidak dominan; tombol besar **"Masuk dengan sidik jari"** + opsi **PIN**. Catatan kecil keamanan.
Prompt Stitch: `Login screen. Village emblem and "Desa Cibeteung Muara" title on top. A large primary button "Masuk dengan sidik jari" (fingerprint icon) and a secondary "Gunakan PIN". Small helper text "Keamanan Anda dijaga dengan tanda tangan digital." Minimal fields, big touch targets.`

**W4 · Beranda Warga** · P0
Layout: sapaan ("Halo, Budi"), 3 aksi cepat besar (Ajukan Surat, Buat Janji, Surat Saya), ringkasan status permohonan terbaru (kartu + chip), bottom nav 4 tab.
Prompt Stitch: `Home dashboard for a resident. Friendly greeting "Halo, Budi". Three large quick-action cards with icons+labels: "Ajukan Surat", "Buat Janji", "Surat Saya". Below, a card showing the latest request with a colored status chip. Bottom navigation: Beranda, Surat, Janji, Profil.`

**W5 · Pilih Jenis Surat** · P0
Layout: daftar kartu jenis surat (Surat Pengantar, SKTM, Keterangan Domisili) — tiap kartu ikon + judul + 1 baris penjelasan + estimasi waktu.
Prompt Stitch: `List of letter types as tappable cards, each with icon, title, one-line description, and estimated time: "Surat Pengantar", "Surat Keterangan Tidak Mampu (SKTM)", "Surat Keterangan Domisili". Search bar on top.`

**W6 · Form Pengajuan Surat** · P0
Layout: form field per jenis surat; **banner privasi ZKP** (ikon perisai: "Sebagian data dibuktikan tanpa dibuka — privasi Anda terlindungi"); tombol besar **"Kirim Permohonan"**.
Prompt Stitch: `Letter request form with clearly labeled fields (purpose, details, optional attachment upload). A reassuring privacy banner with a shield icon: "Data pribadi Anda dibuktikan tanpa dibuka — privasi terlindungi." Large primary button "Kirim Permohonan". Simple, spacious layout.`

**W7 · Status Permohonan (timeline)** · P0
Layout: **timeline vertikal** dengan 4 langkah — Diajukan → Diverifikasi → Ditandatangani → Selesai; langkah aktif disorot; nomor surat (mono) bila sudah ada.
Prompt Stitch: `Request status screen with a vertical timeline/stepper: "Diajukan", "Diverifikasi operator", "Ditandatangani Kepala Desa", "Selesai". Current step highlighted with color. Show letter number in monospace when available. Calm, clear.`

**W8 · Surat Selesai + Cap Digital** · P0 (layar tanda)
Layout: pratinjau surat (permukaan **kertas hangat #FBF8F1, badan serif**); **Cap Digital bundar** (emblem + centang + "TERVERIFIKASI" + QR + nomor surat mono); tombol **"Unduh PDF"** + **"Bagikan"**.
Prompt Stitch: `Completed official letter screen. Warm paper-colored document preview with a serif letter body. A circular "Cap Digital" verification seal overlapping the letter: village emblem + green checkmark + label "TERVERIFIKASI" + a small QR code + letter number in monospace. Primary buttons "Unduh PDF" and "Bagikan". Feels official and trustworthy.`

**W1 · Onboarding** · P1 — 2–3 slide: apa itu app, aman (ECDSA/QR), privasi (ZKP). Tombol "Mulai".
**W3 · Registrasi Warga** · P1 — multi-step: data diri (NIK, nama, alamat) → unggah KTP → buat PIN. Progress indicator.
**W9 · Buat Janji Temu** · P1 — pilih keperluan → kalender slot Kepala Desa → konfirmasi.
**W10 · Detail Janji** · P1 — ringkasan janji + status (Menunggu konfirmasi/Terjadwal) + QR check-in.
**W11 · Profil Warga** · P2 — data akun, keamanan (ganti PIN), keluar.

### — OPERATOR —

**O1 · Beranda Operator (antrian)** · P0
Layout: daftar permohonan masuk (kartu: nama warga, jenis surat, waktu, chip status); filter; badge jumlah menunggu.
Prompt Stitch: `Operator dashboard: a queue list of incoming letter requests. Each row: resident name, letter type, time submitted, status chip. Filter tabs "Baru / Diproses / Selesai". Count badge for pending. Efficient, information-dense but clean.`

**O2 · Detail Permohonan (hasil ZKP)** · P0
Layout: data permohonan + **panel verifikasi ZKP** (badge hijau "Kelayakan terverifikasi" / merah "Tidak valid"); tombol "Susun Draft" / "Tolak".
Prompt Stitch: `Request detail for operator. Shows request data and a verification panel with a green badge "Kelayakan warga terverifikasi (ZKP)" or red "Tidak valid". Buttons "Susun Draft Surat" and "Tolak" (with reason).`

**O3 · Susun Draft Surat** · P0
Layout: editor template (field terisi otomatis + editable), pratinjau surat serif, tombol **"Ajukan ke Kepala Desa"**.
Prompt Stitch: `Operator drafts an official letter from a template: editable auto-filled fields on top, a live serif letter preview below. Primary button "Ajukan ke Kepala Desa".`

**O4 · Verifikasi Warga Baru** · P1 — bandingkan data & foto KTP → Setujui/Tolak → tambah ke registri.
**O5 · Kelola Jadwal** · P2 — kalender janji, konfirmasi/rejadwal.

### — KEPALA DESA —

**K1 · Beranda Kepala Desa** · P0
Layout: daftar **"Menunggu tanda tangan"** (kartu ringkas), agenda janji hari ini, ringkasan angka.
Prompt Stitch: `Village head dashboard. Prominent section "Menunggu tanda tangan Anda" listing letters awaiting signature. Below, today's appointments. Executive, calm, uncluttered.`

**K2 · Review Draft Surat** · P0
Layout: pratinjau surat penuh (kertas hangat + serif), info pemohon & verifikasi, tombol **"Tanda Tangani"** / "Kembalikan ke operator".
Prompt Stitch: `Village head reviews a letter before signing: full-page warm paper serif document preview, a summary of requester + verification status, primary button "Tanda Tangani" and secondary "Kembalikan ke operator".`

**K3 · Konfirmasi Tanda Tangan (step-up)** · P0 (momen keamanan)
Layout: sheet konfirmasi + prompt **biometrik/PIN**; ringkas apa yang ditandatangani; setelah sukses → animasi **Cap Digital** muncul.
Prompt Stitch: `Signature confirmation bottom sheet. Shows what will be signed (letter title + number in monospace) and a fingerprint/PIN prompt "Konfirmasi tanda tangan dengan sidik jari". On success, a circular "Cap Digital" seal stamps onto the letter. Secure, deliberate feeling.`

**K4 · Riwayat Tanda Tangan** · P2 — daftar surat yang telah ditandatangani + cari.

### — PUBLIK (web) —

**V1 · Halaman Verifikasi** · P0
Layout: hasil scan QR — dua keadaan: **SAH** (hijau, Cap Digital, "Ditandatangani [Kepala Desa] pada [tanggal], dokumen tidak diubah", nomor surat mono) / **TIDAK VALID** (merah, penjelasan). Tanpa login.
Prompt Stitch: `Public web verification page (no login). Two states: VALID — green, a "Cap Digital" seal, text "Surat SAH — ditandatangani Kepala Desa [nama] pada [tanggal]. Dokumen tidak diubah.", letter number in monospace; INVALID — red, "Surat tidak dapat diverifikasi." Clean, single-purpose, reassuring.`

---

## 7. Tips Memakai Stitch
- Mulai **Standard mode**; pakai **Experimental** untuk variasi visual.
- **Satu layar per prompt**, prepend §4.7 agar tema konsisten.
- Iterasi dengan instruksi singkat ("perbesar tombol", "pindahkan status ke atas").
- Jaga konsistensi: pakai kosakata status & nama tombol yang sama (di §8) di semua prompt.
- Ekspor **Figma** untuk rapikan grid/warna; jadikan acuan implementasi Flutter.
- Keterbatasan: bukan kode Flutter; QR/emblem asli ditambahkan saat implementasi.

---

## 8. Copywriting (Bahasa Indonesia)
- **Sentence case**, kata kerja aktif, tanpa basa-basi. Konsisten: tombol "Kirim Permohonan" → notifikasi "Permohonan terkirim".
- **Kosakata status (pakai persis ini di semua layar):**
  - Surat: `Diajukan` → `Diverifikasi` → `Ditandatangani` → `Selesai`; gagal = `Ditolak`.
  - Janji: `Menunggu konfirmasi` → `Terjadwal` → `Selesai`; batal = `Dibatalkan`.
- **Error jelas & memandu**, bukan minta maaf: "NIK tidak ditemukan. Periksa kembali 16 digit NIK Anda."
- **Layar kosong = ajakan bertindak**: "Belum ada surat. Mulai dengan Ajukan Surat."
- **Isyarat keamanan/privasi** ditulis menenangkan: "Data pribadi Anda dibuktikan tanpa dibuka."

---

*Selaras dengan PRD `docs/superpowers/specs/2026-07-10-sidesa-cibeteung-muara-design.md`. Token di §4 langsung dipakai saat implementasi Flutter Material 3.*
