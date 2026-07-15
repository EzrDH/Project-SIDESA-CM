---
name: SIDESA-CM
colors:
  surface: '#f8fafa'
  surface-dim: '#d8dadb'
  surface-bright: '#f8fafa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f5'
  surface-container: '#eceeef'
  surface-container-high: '#e6e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f484b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#eff1f2'
  outline: '#70797b'
  outline-variant: '#bfc8cb'
  surface-tint: '#206776'
  primary: '#00434f'
  on-primary: '#ffffff'
  primary-container: '#0f5c6b'
  on-primary-container: '#92d2e4'
  inverse-primary: '#90d0e2'
  secondary: '#3f692b'
  on-secondary: '#ffffff'
  secondary-container: '#b9eb9e'
  on-secondary-container: '#416b2d'
  tertiary: '#5d3209'
  on-tertiary: '#ffffff'
  tertiary-container: '#79481f'
  on-tertiary-container: '#feba87'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#acedfe'
  primary-fixed-dim: '#90d0e2'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#bff0a3'
  secondary-fixed-dim: '#a4d489'
  on-secondary-fixed: '#062100'
  on-secondary-fixed-variant: '#285015'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#fcb885'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#693b13'
  background: '#f8fafa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  tertiary-ochre: '#B7791F'
  success-sah: '#2E7D32'
  error-red: '#BA1A1A'
  background-cool: '#F4F6F7'
  surface-clean: '#F8FAFB'
  paper-preview: '#FBF8F1'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-serif:
    fontFamily: merriweather
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-mono:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  page-margin: 20px
  card-padding: 16px
  gap-xs: 8px
  gap-sm: 12px
  gap-md: 16px
  gap-lg: 24px
---

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

---

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

---

### 4.4 Komponen inti
- **App bar** ber-identitas desa: emblem + "Desa Cibeteung Muara".
- **Bottom navigation (Warga):** Beranda · Surat · Janji · Profil (ikon + label).
- **Aksi utama:** tombol besar / FAB **"Ajukan Surat"**.
- **Chip status berwarna** (lihat §8 kosakata).
- **Timeline vertikal** (stepper) untuk status permohonan.
- **"Cap Digital"** — stempel bundar verifikasi + QR + nomor surat (mono).
- **Banner privasi (ZKP):** ikon perisai + "Data pribadi Anda tetap terlindungi".
- **Kartu surat** (list) with judul, tanggal, chip status.

### 4.5 Ikonografi
**Material Symbols — Rounded** (ramah, konsisten Material 3).

### 4.6 Aksesibilitas (WAJIB)
- Kontras teks minimal **WCAG AA**. Body ≥ **16sp**. Target sentuh ≥ **48dp**.
- Ikon **selalu** berpasangan label. Dukung penskalaan ukuran teks sistem.
- Fokus keyboard terlihat; hormati *reduce motion*.

---

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