# Desain: Notifikasi Push FCM — SIDESA-CM

- **Tanggal:** 2026-07-22
- **Status:** Disetujui (siap disusun rencana implementasi)
- **Fase peta jalan:** sisa Fase B (notifikasi FCM)
- **Pendekatan:** A — FCM dengan lapisan abstraksi di backend, kirim di-stub sampai kredensial Firebase tersedia.

## 1. Tujuan dan cakupan

Memberi tahu pengguna secara *push* ketika status pekerjaan mereka berubah, tanpa perlu membuka aplikasi berulang.

Cakupan versi pertama (disetujui): **warga + petugas + janji temu**.

Keputusan desain yang mengikat:

1. **Desain + stub dulu.** Bangun seluruh lapisan notifikasi dan registrasi token sekarang, dengan pengirim palsu untuk pengujian. Pengiriman nyata di-wiring belakangan saat kredensial Firebase tersedia — cukup menukar *driver* dan mengisi env.
2. **Payload minimal (sinyal sinkron).** Notifikasi hanya membawa teks generik + ID acuan. Tidak ada nama, NIK, nomor surat, atau isi surat yang transit lewat server Google. Detail diambil aplikasi lewat API terautentikasi.
3. **Dekopling.** Logika bisnis (surat, janji temu) tidak mengenal notifikasi; keduanya berkomunikasi lewat *event domain*.

Di luar cakupan (bukan sekarang): rotasi/pencabutan kunci, pengelompokan notifikasi, preferensi per-jenis notifikasi, notifikasi terjadwal/pengingat janji temu (hanya konfirmasi/pembatalan yang masuk cakupan).

## 2. Arsitektur

Backend memancarkan *event domain* memakai `@nestjs/event-emitter`. Service surat dan janji temu hanya memancarkan event; sebuah *listener* menerjemahkannya menjadi notifikasi. Ini menjaga service bisnis bersih dan dapat diuji tanpa menyentuh SDK Google.

```
letters.service ──emit──▶ NotificationsListener ──▶ NotificationsService ──▶ NotificationSender
booking.service ──emit──┘                                    │                    ├─ LoggingSender (default dev/test)
                                                    resolve penerima              └─ FcmSender (nyata, butuh kredensial)
                                                    + token + pangkas invalid
```

Pemilihan pengirim ditentukan variabel lingkungan `NOTIFICATIONS_DRIVER` (`log` = default, `fcm` = nyata). Dengan `log`, seluruh alur dapat diuji end-to-end tanpa kredensial.

## 3. Komponen backend (NestJS)

### 3.1 Model Prisma `DeviceToken`

```
model DeviceToken {
  id         String   @id @default(uuid())
  accountId  String
  token      String   @unique
  platform   String   // "android" | "ios"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

Tabel tersendiri, bukan kolom pada `Account`, agar token dapat dirotasi, dipangkas ketika FCM membalas *unregistered*, dan tidak membebani `Account`. Satu akun boleh punya lebih dari satu baris (mis. token lama belum sempat dihapus); pengiriman menyapu semua token milik akun penerima.

Migrasi mengikuti aturan proyek (lingkungan non-interaktif): `prisma migrate diff … --script` → simpan SQL ke folder migrasi baru → `prisma migrate deploy` → `prisma generate`. **Bukan** `prisma migrate dev`.

### 3.2 `NotificationSender` (antarmuka)

```
interface NotificationMessage {
  title: string;
  body: string;                       // teks generik, tanpa PII
  data: Record<string, string>;       // { type, refId, ts }
}
interface SendResult { invalidTokens: string[]; }
interface NotificationSender {
  send(tokens: string[], message: NotificationMessage): Promise<SendResult>;
}
```

- **`LoggingNotificationSender`** — mencatat maksud pengiriman (jumlah token, `type`, `refId`), tak mengirim apa pun, mengembalikan `invalidTokens: []`. Default (`NOTIFICATIONS_DRIVER=log`). Dipakai dev dan seluruh pengujian.
- **`FcmNotificationSender`** — memakai `firebase-admin`. Kredensial dibaca dari env. Mengirim pesan gabungan (notifikasi generik + blok `data`). Menerjemahkan galat `messaging/registration-token-not-registered` menjadi `invalidTokens` untuk dipangkas. Aktif saat `NOTIFICATIONS_DRIVER=fcm`.

Pemilihan implementasi lewat *custom provider* pada `NotificationsModule` berdasarkan env.

### 3.3 `NotificationsService`

- `registerToken(accountId, token, platform)` — *upsert* berdasarkan `token` unik (memindahkan kepemilikan token bila perangkat berpindah akun).
- `unregisterToken(token)` — hapus (dipanggil saat logout).
- `dispatch(event)` — resolusi penerima → kumpulkan token → susun `NotificationMessage` minimal → `sender.send(...)` → pangkas `invalidTokens`.

### 3.4 `NotificationsController`

- `POST /notifications/token` — badan `{ token, platform }`; butuh sesi; mendaftarkan token milik pemanggil. Divalidasi DTO (sejalan pengerasan Fase B3).
- `DELETE /notifications/token` — badan `{ token }`; menghapus token.

### 3.5 Emisi event

`letters.service` dan `booking.service` memancarkan event pada transisi status yang relevan. Tidak ada ketergantungan langsung ke modul notifikasi.

| Event | Dipancarkan saat | Penerima |
|---|---|---|
| `letter.submitted` | warga mengajukan surat | semua OPERATOR `ACTIVE` |
| `letter.drafted` | operator menyusun draf | warga pemilik **dan** semua KADES `ACTIVE` |
| `letter.signed` | KaDes menandatangani | warga pemilik (`LetterRequest.wargaAccountId`) |
| `letter.rejected` | permohonan ditolak | warga pemilik |
| `booking.requested` | warga meminta janji temu | semua OPERATOR `ACTIVE` |
| `booking.confirmed` | operator mengonfirmasi slot | warga pemilik (`Booking.wargaAccountId`) |
| `booking.cancelled` | janji temu dibatalkan | warga pemilik |

Penerima "semua OPERATOR/KADES `ACTIVE`" di-*resolve* lewat query `Account` per peran berstatus `ACTIVE`.

## 4. Payload minimal (privasi)

Setiap pesan berisi notifikasi generik ditambah blok `data` kecil. **Tidak** memuat nama, NIK, nomor surat, atau isi surat.

- Warga, contoh: `title: "SIDESA-CM"`, `body: "Ada pembaruan pada permohonan Anda."`, `data: { type: "letter.signed", refId: <letterId>, ts }`.
- Petugas, contoh: `body: "Ada permohonan baru menunggu."`, `data: { type: "letter.submitted", refId: <requestId>, ts }`.

Ketukan notifikasi membuka layar terkait di aplikasi, yang kemudian **mengambil detail lewat API terautentikasi**. Server Google hanya melihat teks generik dan sebuah ID buram. Ini mempertahankan prinsip minimalisasi data yang menjadi klaim inti sistem.

## 5. Komponen Flutter (aplikasi)

- Pustaka: `firebase_core`, `firebase_messaging`, dan `flutter_local_notifications` (menampilkan notifikasi saat aplikasi di *foreground*).
- **`PushMessagingAdapter`** membungkus seluruh interaksi FCM:
  - `init()` — meminta izin `POST_NOTIFICATIONS` (Android 13+), mengambil token, mendaftarkannya ke backend (`POST /notifications/token`).
  - mendengarkan `onTokenRefresh` → daftar ulang.
  - menangani pesan *foreground* → tampilkan notifikasi lokal.
  - menangani ketukan (`onMessageOpenedApp` / *initial message*) → routing ke layar sesuai `data.type`.
- **Degradasi anggun**: bila `google-services.json` atau Google Play Services tak tersedia, atau inisialisasi Firebase gagal, adapter menjadi *no-op*. Aplikasi tetap berjalan dan 23 pengujian aplikasi tetap hijau karena adapter di-*inject* dan pengujian memakai *fake*.
- **Waktu registrasi**: token didaftarkan setelah login berhasil (sesi dan `accountId` sudah ada). Saat logout, token dihapus (`DELETE /notifications/token`).

## 6. Pengujian

Backend:

- Unit `NotificationsService` dengan *fake sender*: resolusi penerima benar per event; payload tidak memuat PII (uji negatif: `body`/`data` tidak mengandung nama/NIK/nomor); token invalid dipangkas setelah pengiriman.
- e2e: surat yang ditandatangani memicu satu pengiriman ke token milik warga pemilik (ditangkap `LoggingSender`); tanpa token terdaftar → tidak ada pengiriman dan tidak *crash*; broadcast petugas hanya mengenai akun berperan tepat dan berstatus `ACTIVE`.

Aplikasi:

- Adapter di-*stub*: registrasi token memanggil endpoint yang benar dengan token dan platform.
- Uji degradasi: tanpa Firebase, adapter menjadi *no-op* tanpa melempar galat.

## 7. Rahasia dan konfigurasi

Variabel lingkungan (hanya di `.env`, contoh di `.env.example`):

- `NOTIFICATIONS_DRIVER` — `log` (default) atau `fcm`.
- `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` — kredensial *service account* untuk `firebase-admin`.

`google-services.json` (Flutter) dan berkas kunci *service account* (backend) **tidak di-commit** — ditambahkan ke `.gitignore`.

## 8. Lampiran: panduan menyiapkan Firebase (untuk wiring nyata nanti)

1. Buka [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → beri nama (mis. `sidesa-cm`). Google Analytics boleh dimatikan.
2. Di proyek, **Add app → Android**. Isi *Android package name* sama persis dengan `applicationId` aplikasi (lihat `packages/app/android/app/build.gradle`). Unduh **`google-services.json`** dan letakkan di `packages/app/android/app/`.
3. Pastikan plugin Google Services terpasang di Gradle (root: `com.google.gms:google-services`; app: `apply plugin` / `id("com.google.gms.google-services")`), lalu tambahkan dependensi `firebase_core`, `firebase_messaging`, `flutter_local_notifications` di `pubspec.yaml`.
4. Di konsol, **Build → Cloud Messaging**; pastikan **Firebase Cloud Messaging API (V1)** aktif (Google Cloud Console → APIs & Services).
5. **Project settings → Service accounts → Generate new private key**. Dari berkas JSON yang terunduh, salin `project_id`, `client_email`, dan `private_key` ke `.env` backend sebagai `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`. Jaga baris-baru pada `private_key` (biasanya disimpan dengan `\n` literal lalu di-*unescape* saat dibaca).
6. Setel `NOTIFICATIONS_DRIVER=fcm`. Jalankan aplikasi pada emulator ber-*image Google Play* (Pixel_7), login, lalu picu satu transisi status (mis. tandatangani surat) untuk memverifikasi push tiba.
7. Jangan pernah meng-commit `google-services.json` maupun berkas kunci *service account*.
