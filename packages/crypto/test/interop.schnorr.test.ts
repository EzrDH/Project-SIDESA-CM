import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyKnowledge, decodeProof } from '../src/index';

const vectorPath = fileURLToPath(
  new URL('../../app/build/interop_schnorr_vector.json', import.meta.url),
);
const hexToBytes = (h: string) => Uint8Array.from(h.match(/.{2}/g)!.map((x) => parseInt(x, 16)));

// Emitted by `flutter test` in packages/app (gitignored build/ dir). This
// vector is the only cross-language guarantee that a *real proof* built by
// the Dart prover verifies against @sidesa/crypto (the KAT in
// schnorr.codec.test.ts only checks the shared domain-hash construction, not
// the full prove/verify path). If the file is missing we must FAIL, not
// skip: a silent skip lets a broken Dart prover pass this suite whenever the
// vector hasn't been (re)generated, which is exactly the vacuous-pass hole
// this test exists to close. Run `npm run test:all` from the repo root, or
// `cd packages/app && flutter test` directly, to regenerate the vector
// before running this suite.
describe('Dart -> @sidesa/crypto Schnorr interop', () => {
  it('verifies a proof produced by the Flutter app', () => {
    if (!existsSync(vectorPath)) {
      throw new Error(
        `Missing interop vector at ${vectorPath}. Run \`cd packages/app && flutter test\` ` +
          '(or `npm run test:all` from the repo root) first to (re)generate it.',
      );
    }
    const v = JSON.parse(readFileSync(vectorPath, 'utf8'));
    const ok = verifyKnowledge(
      hexToBytes(v.publicKey),
      decodeProof(hexToBytes(v.proof)),
      hexToBytes(v.context),
    );
    expect(ok).toBe(true);
  });
});
