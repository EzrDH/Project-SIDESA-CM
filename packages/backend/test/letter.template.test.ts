import { describe, it, expect } from 'vitest';
import { renderCanonicalLetter, documentHashHex } from '../src/letters/letter.template';

describe('letter template', () => {
  const data = { nama: 'Budi Santoso', nik: '3201...', alamat: 'RT 01' };

  it('is deterministic for the same inputs', () => {
    const a = renderCanonicalLetter('DOMISILI', data, '1/SKD/2026');
    const b = renderCanonicalLetter('DOMISILI', { alamat: 'RT 01', nik: '3201...', nama: 'Budi Santoso' }, '1/SKD/2026');
    expect(a).toBe(b); // key order in input must not matter
    expect(documentHashHex(a)).toBe(documentHashHex(b));
  });

  it('changes the hash when any field changes', () => {
    const base = documentHashHex(renderCanonicalLetter('DOMISILI', data, '1/SKD/2026'));
    const changed = documentHashHex(renderCanonicalLetter('DOMISILI', { ...data, alamat: 'RT 99' }, '1/SKD/2026'));
    expect(changed).not.toBe(base);
  });

  it('produces a 96-hex document hash and includes the number + title', () => {
    const c = renderCanonicalLetter('SKTM', data, '7/SKTM/2026');
    expect(c).toContain('7/SKTM/2026');
    expect(c).toContain('Surat Keterangan Tidak Mampu');
    expect(documentHashHex(c)).toMatch(/^[0-9a-f]{96}$/);
  });
});
