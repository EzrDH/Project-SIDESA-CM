import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/pdf/letter_pdf.dart';

void main() {
  test('buildLetterPdf produces a valid, non-empty PDF', () async {
    final bytes = await buildLetterPdf(
      title: 'Surat Keterangan Domisili',
      letterNumber: '43/SKD/2026',
      canonicalContent: 'SIDESA-LETTER-v1\nPemerintah Desa Cibeteung Muara\nNomor: 43/SKD/2026',
      signer: 'H. Asep Saepudin',
      signedAt: '18 Jul 2026',
      verifyUrl: 'http://10.0.2.2:3000/verify/abc123',
    );
    expect(bytes.length, greaterThan(1000));
    // Valid PDFs begin with the "%PDF-" magic bytes.
    expect(String.fromCharCodes(bytes.sublist(0, 5)), '%PDF-');
  });
}
