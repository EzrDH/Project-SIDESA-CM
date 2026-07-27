# Daftar Pertanyaan Kebutuhan — SIDESA-CM

**Tujuan:** Mengumpulkan keputusan operasional dari perangkat Desa Cibeteung Muara sebagai dasar
pembangunan fitur janji temu dan nomor antrean.
**Untuk:** Kepala Desa, Sekretaris Desa, dan petugas pelayanan
**Diisi oleh:** ......................................................
**Tanggal:** ......................................................
**Pewawancara:** Muhammad Ezra Dhiatara — D4 Rekayasa Kriptografi, Politeknik Siber dan Sandi Negara

> Pertanyaan bertanda **[P]** bersifat penentu: tanpa jawabannya, fitur tidak dapat dibangun tanpa
> menebak. Pertanyaan bertanda **[S]** bersifat penting namun masih dapat diberi nilai awal yang dapat
> diubah kemudian. Pertanyaan bertanda **[T]** bersifat tambahan.

## Bagian 1 — Gambaran Pelayanan Saat Ini

Bagian ini memetakan keadaan sekarang agar fitur yang dibangun benar-benar menjawab persoalan nyata,
bukan persoalan yang kami bayangkan.

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 1.1 [P] | Kira-kira berapa warga yang datang ke kantor desa setiap hari? Berapa pada hari tersibuk? | Menentukan apakah antrean bernomor memang diperlukan dan seberapa besar kuota harian | |
| 1.2 [P] | Keperluan apa saja yang mengharuskan warga bertemu langsung Kepala Desa? | Menjadi daftar jenis layanan di aplikasi | |
| 1.3 [P] | Keperluan apa yang cukup dilayani petugas tanpa Kepala Desa? | Menentukan layanan mana yang perlu dijadwalkan ketat dan mana yang tidak | |
| 1.4 [S] | Berapa lama rata-rata satu warga dilayani untuk tiap keperluan itu? | Dasar penghitungan estimasi waktu tunggu | |
| 1.5 [S] | Jam berapa biasanya paling ramai? Ada pola harinya (mis. Senin selalu padat)? | Dasar penetapan kuota per jam agar beban merata | |
| 1.6 [S] | Bagaimana urutan pelayanan ditentukan sekarang? Ada buku tamu atau nomor manual? | Menentukan seberapa besar perubahan kebiasaan yang diminta | |
| 1.7 [T] | Pernah ada warga pulang karena tidak terlayani? Sesering apa? | Mengukur dampak masalah yang hendak diselesaikan | |

## Bagian 2 — Jenis Layanan

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 2.1 [P] | Untuk tahap awal, jenis layanan apa saja yang dibuka di aplikasi? Sebutkan namanya persis seperti yang dipahami warga. | Nama ini akan muncul di layar warga | |
| 2.2 [P] | Apakah semua jenis layanan itu memerlukan Kepala Desa, atau ada yang cukup petugas? | Menentukan apakah jadwal terikat ketersediaan Kepala Desa | |
| 2.3 [S] | Apakah ada layanan yang perlu warga membawa berkas tertentu? | Aplikasi dapat menampilkan daftar berkas agar warga tidak bolak-balik | |
| 2.4 [S] | Apakah ada layanan yang memerlukan waktu jauh lebih lama daripada yang lain? | Layanan panjang perlu kuota lebih kecil | |
| 2.5 [T] | Apakah daftar layanan ini akan sering berubah? | Menentukan apakah perlu antarmuka pengelolaan layanan atau cukup pengaturan tetap | |

## Bagian 3 — Jadwal dan Kapasitas

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 3.1 [P] | Hari apa saja kantor melayani warga? | Dasar kalender pemesanan | |
| 3.2 [P] | Jam berapa pelayanan dibuka dan ditutup? Ada jeda istirahat? | Jam di luar itu harus ditolak sistem | |
| 3.3 [P] | Berapa banyak warga yang sanggup dilayani dalam satu hari? | Kuota harian; melampaui ini pemesanan ditolak | |
| 3.4 [P] | Apakah Kepala Desa bersedia terikat pada jadwal tertentu, misalnya "hari Selasa dan Kamis pukul 09.00–12.00 khusus menerima warga"? | **Sangat menentukan.** Bila agenda Kepala Desa tidak dapat dipastikan, model janji temu berbasis slot waktu tidak akan berjalan dan sebaiknya memakai nomor antrean harian saja | |
| 3.5 [S] | Bagaimana biasanya diketahui bahwa Kepala Desa akan bertugas di luar kantor? Berapa lama sebelumnya? | Menentukan apakah perlu fitur pembatalan massal beserta pemberitahuannya | |
| 3.6 [S] | Bila Kepala Desa mendadak berhalangan, apa yang dilakukan terhadap warga yang sudah memesan? Dialihkan ke petugas, dijadwalkan ulang, atau dibatalkan? | Menentukan aturan penjadwalan ulang di sistem | |
| 3.7 [T] | Apakah ada hari libur khusus desa di luar libur nasional? | Kalender pemesanan perlu mengetahuinya | |

## Bagian 4 — Model Antrean

Ini menentukan bentuk fitur yang paling terlihat oleh warga. Mohon dipilih satu.

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 4.1 [P] | Model mana yang paling sesuai? **(a)** Nomor antrean harian — warga memesan untuk tanggal tertentu, datang, lalu menunggu giliran sesuai nomor. **(b)** Slot waktu — warga memilih jam tertentu, mis. 09.30. **(c)** Gabungan — warga memilih sesi pagi/siang lalu mendapat nomor di dalam sesi itu. | Menentukan seluruh rancangan layar pemesanan dan papan antrean | |
| 4.2 [P] | Apakah warga boleh memesan untuk hari yang sama, atau harus sehari sebelumnya? | Menentukan aturan batas waktu pemesanan | |
| 4.3 [S] | Berapa hari ke depan warga boleh memesan? Satu minggu, dua minggu? | Menentukan rentang kalender | |
| 4.4 [S] | Bolehkah satu warga memiliki lebih dari satu pemesanan aktif? | Mencegah satu orang memborong kuota | |
| 4.5 [S] | Apakah nomor antrean dimulai dari 1 setiap hari, atau berkelanjutan? | Format penomoran tiket | |

## Bagian 5 — Warga Tanpa Aplikasi dan Warga yang Datang Langsung

Bagian ini sering menentukan berhasil atau gagalnya sistem antrean di lapangan.

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 5.1 [P] | Berapa perkiraan bagian warga yang tidak memiliki telepon pintar? | Bila mayoritas, aplikasi tidak boleh menjadi satu-satunya jalan masuk antrean | |
| 5.2 [P] | Warga yang datang langsung tanpa memesan — apakah tetap dilayani? | **Menentukan rancangan inti.** Bila ya, sistem harus menggabungkan dua sumber antrean: dari aplikasi dan dari loket | |
| 5.3 [P] | Bila keduanya dilayani, bagaimana urutannya? Bergantian, atau pemesan aplikasi didahulukan, atau kuota dipisah (mis. 20 lewat aplikasi, 10 untuk yang datang langsung)? | Aturan penggabungan antrean harus tegas, tidak bisa ditebak | |
| 5.4 [S] | Bolehkah petugas memesankan antrean untuk warga yang datang langsung, memakai perangkat kantor? | Menentukan perlunya fitur pemesanan oleh operator | |
| 5.5 [S] | Bolehkah satu telepon dipakai memesan untuk anggota keluarga lain? | Berpengaruh pada aturan satu perangkat satu identitas | |
| 5.6 [T] | Apakah perlu layar penampil nomor antrean di ruang tunggu? | Fitur tambahan di luar cakupan saat ini, dicatat untuk pengembangan lanjutan | |

## Bagian 6 — Aturan Operasional Harian

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 6.1 [P] | Bila warga dipanggil tetapi tidak ada di tempat, berapa lama ditunggu sebelum dilewati? | Aturan penandaan tidak hadir | |
| 6.2 [P] | Warga yang terlewat karena terlambat — boleh dipanggil ulang di akhir, atau harus memesan lagi? | Menentukan transisi status tiket | |
| 6.3 [S] | Sampai kapan warga boleh membatalkan pemesanannya? | Agar kuota yang batal dapat dipakai warga lain | |
| 6.4 [S] | Perlukah warga melapor ke petugas saat tiba (check-in), atau cukup menunggu dipanggil? | Menentukan apakah fitur check-in dipakai | |
| 6.5 [S] | Siapa yang akan memegang papan antrean setiap hari? Satu petugas tetap atau bergantian? | Menentukan jumlah akun operator dan pelatihannya | |
| 6.6 [T] | Apakah ada lebih dari satu meja pelayanan yang melayani bersamaan? | Bila ya, papan antrean perlu mendukung beberapa loket | |

## Bagian 7 — Pendaftaran Warga ke Sistem

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 7.1 [P] | Siapa yang akan memeriksa KTP warga saat pendaftaran perangkat? | Peran ini menjadi dasar kepercayaan seluruh sistem | |
| 7.2 [P] | Di mana dan kapan pendaftaran dilakukan? Di kantor setiap hari kerja, atau lewat kegiatan khusus per RT? | Menentukan strategi pendaftaran awal dan beban petugas | |
| 7.3 [S] | Berapa perkiraan jumlah warga yang perlu didaftarkan pada tahap awal? | Menentukan ukuran registri dan waktu yang dibutuhkan | |
| 7.4 [S] | Data warga apa yang perlu tampil bagi petugas saat pelayanan? Nama saja, atau perlu RT/RW? | Menentukan atribut yang disimpan — kami menyimpan sesedikit mungkin | |
| 7.5 [P] | Bila telepon warga hilang atau berganti, siapa yang berwenang mendaftarkan ulang? | Prosedur pencabutan dan pendaftaran ulang | |
| 7.6 [T] | Apakah ada warga yang tinggal di luar desa namun tetap terdaftar sebagai penduduk? | Berpengaruh pada atribut kelayakan | |

## Bagian 8 — Pemberitahuan

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 8.1 [S] | Berapa nomor sebelum gilirannya warga sebaiknya diberi tahu? Tiga nomor sebelumnya, atau berdasarkan waktu? | Menentukan pemicu notifikasi | |
| 8.2 [S] | Perlukah pengingat pada pagi hari sebelum jadwalnya? | Mengurangi angka tidak hadir | |
| 8.3 [T] | Apakah petugas perlu diberi tahu ketika ada pemesanan baru? | Menentukan notifikasi bagi operator | |

## Bagian 9 — Perangkat, Jaringan, dan Tata Kelola

| No | Pertanyaan | Mengapa perlu | Jawaban |
|---|---|---|---|
| 9.1 [P] | Apakah kantor desa memiliki komputer atau telepon yang akan dipakai petugas menjalankan papan antrean? | Tanpa perangkat petugas, sistem tidak dapat berjalan | |
| 9.2 [P] | Bagaimana kondisi jaringan internet di kantor desa? Wifi, atau paket data telepon? Pernah putus? | Menentukan seberapa besar toleransi terhadap gangguan jaringan | |
| 9.3 [S] | Apakah listrik pernah padam pada jam layanan? | Menentukan perlunya prosedur cadangan manual | |
| 9.4 [S] | Siapa yang akan menjadi penanggung jawab teknis sistem setelah kegiatan ini selesai? | Penerima serah terima dan pemegang peran administrator | |
| 9.5 [S] | Bila terjadi pergantian Kepala Desa atau petugas, siapa yang berwenang mengubah akun? | Prosedur tata kelola akun | |
| 9.6 [T] | Berapa lama riwayat pelayanan perlu disimpan? | Kebijakan retensi data | |

## Bagian 10 — Harapan dan Kekhawatiran

| No | Pertanyaan | Jawaban |
|---|---|---|
| 10.1 | Apa yang paling diharapkan dari aplikasi ini? | |
| 10.2 | Apa yang paling dikhawatirkan? | |
| 10.3 | Apakah ada kebiasaan warga yang perlu kami pahami agar aplikasi ini tidak salah rancang? | |
| 10.4 | Apakah ada aturan desa atau kecamatan yang perlu diikuti terkait pelayanan? | |

## Ringkasan Keputusan Penentu

Empat jawaban berikut paling menentukan bentuk pekerjaan berikutnya. Mohon dipastikan terjawab.

| Butir | Keputusan yang diambil |
|---|---|
| Model antrean (butir 4.1) | |
| Kesediaan Kepala Desa terikat jadwal (butir 3.4) | |
| Perlakuan bagi warga yang datang langsung (butir 5.2 dan 5.3) | |
| Daftar jenis layanan tahap awal (butir 2.1) | |

## Catatan Pewawancara

......................................................................................................

......................................................................................................

......................................................................................................
