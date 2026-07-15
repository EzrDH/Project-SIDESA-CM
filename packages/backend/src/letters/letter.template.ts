import { hash } from '@sidesa/crypto';

export type LetterType = 'SURAT_PENGANTAR' | 'SKTM' | 'DOMISILI';

const TITLES: Record<LetterType, string> = {
  SURAT_PENGANTAR: 'Surat Pengantar',
  SKTM: 'Surat Keterangan Tidak Mampu',
  DOMISILI: 'Surat Keterangan Domisili',
};

export function renderCanonicalLetter(
  type: LetterType,
  data: Record<string, string>,
  letterNumber: string,
): string {
  const lines = [
    'SIDESA-LETTER-v1',
    'Pemerintah Desa Cibeteung Muara, Kecamatan Ciseeng, Kabupaten Bogor',
    `Jenis: ${TITLES[type]}`,
    `Nomor: ${letterNumber}`,
  ];
  for (const key of Object.keys(data).sort()) lines.push(`${key}: ${data[key]}`);
  lines.push('Ditandatangani secara digital oleh Kepala Desa.');
  return lines.join('\n');
}

export function documentHashHex(canonical: string): string {
  return Array.from(hash(new TextEncoder().encode(canonical)), (x) => x.toString(16).padStart(2, '0')).join('');
}
