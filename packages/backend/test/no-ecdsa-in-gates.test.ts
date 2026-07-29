import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The identity gates must rest on one primitive. ECDSA may still appear in the
// letter subsystem (removed in Tahap 2), but never in these three files.
// eligibility.service.ts delegates to the crypto package, so the file that has
// to be guarded for gate 3 is the library construction itself.
const gates = [
  '../src/auth/auth.service.ts',
  '../src/enroll/enroll.service.ts',
  '../../crypto/src/eligibility.ts',
];

describe('identity gates contain no ECDSA', () => {
  for (const rel of gates) {
    it(`${rel} does not use signMessage or verifyMessage`, () => {
      const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
      expect(src).not.toMatch(/\bverifyMessage\b/);
      expect(src).not.toMatch(/\bsignMessage\b/);
    });
  }
});
