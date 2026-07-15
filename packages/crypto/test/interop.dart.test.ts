import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyMessage } from '../src/index';

const vectorPath = fileURLToPath(new URL('../../app/build/interop_vector.json', import.meta.url));
const hexToBytes = (h: string) => Uint8Array.from(h.match(/.{2}/g)!.map((x) => parseInt(x, 16)));

// The vector is emitted by `flutter test` in packages/app (gitignored build/ dir).
// Skip gracefully when absent so this package's suite stays green on its own.
describe('Dart -> @sidesa/crypto interop', () => {
  it.skipIf(!existsSync(vectorPath))('verifies a signature produced by the Flutter app', () => {
    const v = JSON.parse(readFileSync(vectorPath, 'utf8'));
    expect(verifyMessage(hexToBytes(v.publicKey), hexToBytes(v.message), hexToBytes(v.signature))).toBe(true);
  });
});
