import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

/// Renders a signed village letter as an official-looking A4 PDF, with a QR
/// code that points at the public verification endpoint. The body shown is the
/// exact canonical content that was signed, so the printed paper and the
/// ECDSA-verified document are one and the same.
Future<Uint8List> buildLetterPdf({
  required String title,
  required String letterNumber,
  required String canonicalContent,
  required String signer,
  required String signedAt,
  required String verifyUrl,
}) async {
  final doc = pw.Document();
  const ink = PdfColor.fromInt(0xFF1A1C1D);
  const muted = PdfColor.fromInt(0xFF5A6167);
  const rule = PdfColor.fromInt(0xFF0F5C6B);

  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.fromLTRB(48, 48, 48, 40),
      build: (ctx) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          // Letterhead
          pw.Center(
            child: pw.Column(children: [
              pw.Text('PEMERINTAH DESA CIBETEUNG MUARA',
                  style: pw.TextStyle(fontSize: 15, fontWeight: pw.FontWeight.bold, color: ink)),
              pw.SizedBox(height: 2),
              pw.Text('Kecamatan Ciseeng, Kabupaten Bogor, Jawa Barat',
                  style: const pw.TextStyle(fontSize: 10.5, color: muted)),
            ]),
          ),
          pw.SizedBox(height: 8),
          pw.Container(height: 2.2, color: rule),
          pw.SizedBox(height: 20),

          pw.Center(
            child: pw.Column(children: [
              pw.Text(title.toUpperCase(),
                  style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: ink)),
              pw.SizedBox(height: 2),
              pw.Text('Nomor: $letterNumber', style: const pw.TextStyle(fontSize: 11, color: muted)),
            ]),
          ),
          pw.SizedBox(height: 20),

          // The exact signed content.
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.all(14),
            decoration: pw.BoxDecoration(
              color: const PdfColor.fromInt(0xFFF7F8F7),
              borderRadius: pw.BorderRadius.circular(6),
              border: pw.Border.all(color: const PdfColor.fromInt(0xFFDDE1DE)),
            ),
            child: pw.Text(canonicalContent, style: const pw.TextStyle(fontSize: 11, lineSpacing: 3)),
          ),
          pw.SizedBox(height: 24),

          // Signature block + verification QR.
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                  pw.Text('Ditandatangani secara digital (ECDSA P-384)',
                      style: const pw.TextStyle(fontSize: 10, color: muted)),
                  pw.SizedBox(height: 4),
                  pw.Text('Kepala Desa Cibeteung Muara',
                      style: const pw.TextStyle(fontSize: 11, color: ink)),
                  pw.Text(signer, style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: ink)),
                  pw.SizedBox(height: 2),
                  pw.Text('Tanggal: $signedAt', style: const pw.TextStyle(fontSize: 10, color: muted)),
                ]),
              ),
              pw.SizedBox(width: 16),
              pw.Column(children: [
                pw.BarcodeWidget(
                  barcode: pw.Barcode.qrCode(),
                  data: verifyUrl,
                  width: 92,
                  height: 92,
                  color: ink,
                ),
                pw.SizedBox(height: 4),
                pw.Text('Pindai untuk verifikasi', style: const pw.TextStyle(fontSize: 8.5, color: muted)),
              ]),
            ],
          ),
          pw.Spacer(),
          pw.Divider(color: const PdfColor.fromInt(0xFFDDE1DE)),
          pw.Text(
            'Keaslian surat ini dapat diverifikasi publik dengan memindai QR di atas. '
            'Dokumen sah tanpa tanda tangan basah sesuai UU ITE.',
            style: const pw.TextStyle(fontSize: 8.5, color: muted),
          ),
        ],
      ),
    ),
  );
  return doc.save();
}
