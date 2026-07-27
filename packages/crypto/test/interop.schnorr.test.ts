import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyKnowledge, decodeProof } from '../src/index';

const vectorPath = fileURLToPath(
  new URL('../../app/build/interop_schnorr_vector.json', import.meta.url),
);
const hexToBytes = (h: string) => Uint8Array.from(h.match(/.{2}/g)!.map((x) => parseInt(x, 16)));

// Emitted by `flutter test` in packages/app (gitignored build/ dir). Skipped
// gracefully when absent so this package's suite stays green on its own.
describe('Dart -> @sidesa/crypto Schnorr interop', () => {
  it.skipIf(!existsSync(vectorPath))('verifies a proof produced by the Flutter app', () => {
    const v = JSON.parse(readFileSync(vectorPath, 'utf8'));
    const ok = verifyKnowledge(
      hexToBytes(v.publicKey),
      decodeProof(hexToBytes(v.proof)),
      hexToBytes(v.context),
    );
    expect(ok).toBe(true);
  });
});
