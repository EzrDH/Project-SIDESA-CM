import 'package:flutter/material.dart';
import '../theme.dart';

/// Static demo data for the UI showcase (API wiring is the next step).

class SuratType {
  final String code;
  final String title;
  final String desc;
  final String estimasi;
  final IconData icon;
  const SuratType(this.code, this.title, this.desc, this.estimasi, this.icon);
}

const suratTypes = <SuratType>[
  SuratType('SP', 'Surat Pengantar', 'Pengantar umum untuk keperluan administrasi.', 'Estimasi 1–2 hari', Icons.description_outlined),
  SuratType('SKTM', 'Surat Keterangan Tidak Mampu', 'Bukti kondisi ekonomi untuk bantuan/keringanan.', 'Estimasi 2–3 hari', Icons.volunteer_activism_outlined),
  SuratType('SKD', 'Surat Keterangan Domisili', 'Keterangan resmi tempat tinggal di desa.', 'Estimasi 1 hari', Icons.home_outlined),
];

enum StatusSurat { diajukan, diverifikasi, ditandatangani, selesai, ditolak }

extension StatusSuratX on StatusSurat {
  String get label => switch (this) {
        StatusSurat.diajukan => 'Diajukan',
        StatusSurat.diverifikasi => 'Diverifikasi',
        StatusSurat.ditandatangani => 'Ditandatangani',
        StatusSurat.selesai => 'Selesai',
        StatusSurat.ditolak => 'Ditolak',
      };

  Color get color => switch (this) {
        StatusSurat.selesai => kSuccess,
        StatusSurat.ditolak => const Color(0xFFC0392B),
        _ => kProgress,
      };

  IconData get icon => switch (this) {
        StatusSurat.selesai => Icons.verified_outlined,
        StatusSurat.ditolak => Icons.cancel_outlined,
        _ => Icons.hourglass_bottom,
      };
}

class Permohonan {
  final String jenis;
  final String nomor;
  final String tanggal;
  final StatusSurat status;
  const Permohonan(this.jenis, this.nomor, this.tanggal, this.status);
}

const _bulan = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

String fmtTanggal(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return '${d.day} ${_bulan[d.month]} ${d.year}';
}

String suratTypeTitle(String code) {
  switch (code) {
    case 'SURAT_PENGANTAR':
      return 'Surat Pengantar';
    case 'SKTM':
      return 'Surat Keterangan Tidak Mampu';
    case 'DOMISILI':
      return 'Surat Keterangan Domisili';
    default:
      return code;
  }
}

StatusSurat statusSuratFrom(String s) {
  switch (s) {
    case 'DRAFTED':
      return StatusSurat.diverifikasi;
    case 'SIGNED':
      return StatusSurat.selesai;
    case 'REJECTED':
      return StatusSurat.ditolak;
    case 'SUBMITTED':
    default:
      return StatusSurat.diajukan;
  }
}

const permohonanSaya = <Permohonan>[
  Permohonan('Surat Keterangan Domisili', '2026/SKD/001', '12 Juli 2026', StatusSurat.diverifikasi),
  Permohonan('Surat Keterangan Tidak Mampu', '2025/SKTM/034', '2 Juli 2026', StatusSurat.selesai),
  Permohonan('Surat Pengantar', '—', '28 Juni 2026', StatusSurat.ditolak),
];

/// A pending letter request as seen by the operator queue.
class Antrian {
  final String id;
  final String jenis;
  final String tanggal;
  const Antrian(this.id, this.jenis, this.tanggal);
}

const antrianDemo = <Antrian>[
  Antrian('demo-1', 'Surat Keterangan Domisili', '17 Jul 2026'),
  Antrian('demo-2', 'Surat Keterangan Tidak Mampu', '16 Jul 2026'),
];

class Janji {
  final String keperluan;
  final String waktu;
  final String status;
  const Janji(this.keperluan, this.waktu, this.status);
}

String fmtWaktu(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  final hh = d.hour.toString().padLeft(2, '0');
  final mm = d.minute.toString().padLeft(2, '0');
  return '${d.day} ${_bulan[d.month]} ${d.year} · $hh:$mm';
}

String janjiStatusLabel(String s) {
  switch (s) {
    case 'CONFIRMED':
      return 'Terjadwal';
    case 'CHECKED_IN':
      return 'Selesai';
    case 'CANCELLED':
      return 'Dibatalkan';
    case 'REQUESTED':
    default:
      return 'Menunggu konfirmasi';
  }
}

const janjiSaya = <Janji>[
  Janji('Konsultasi bantuan sosial', 'Sen, 1 Sep 2026 · 09:00', 'Terjadwal'),
  Janji('Mediasi batas tanah', 'Rab, 20 Agu 2026 · 13:30', 'Menunggu konfirmasi'),
];
