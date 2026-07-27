/**
 * Penskalaan bukti kelayakan terhadap ukuran registri penduduk.
 * Jalankan: npx tsx packages/crypto/bench/scaling.ts
 */
import {
  generateKeyPair,
  getPublicKey,
  MerkleTree,
  computeLeaf,
  proveEligibility,
  verifyEligibility,
} from '../src/index';

const enc = (s: string) => new TextEncoder().encode(s);
const attrs = enc('domisili=Cibeteung Muara;dewasa=true');
const ctx = enc('SIDESA-letter-eligibility-v1|acc-1|SKD|nonce-0123456789abcdef');
const REPS = 50;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function timed(fn: () => void, reps = REPS): number {
  for (let i = 0; i < 10; i++) fn(); // pemanasan
  const xs: number[] = [];
  for (let i = 0; i < reps; i++) {
    const t0 = process.hrtime.bigint();
    fn();
    xs.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  return median(xs);
}

console.log('N\tlangkah\tbukti(B)\tbangun(ms)\tprove(ms)\tverify(ms)');

for (const N of [256, 1024, 4096, 16384]) {
  const keys = Array.from({ length: N }, () => generateKeyPair());
  const leaves = keys.map((k) => computeLeaf(getPublicKey(k.privateKey), attrs));

  const build = timed(() => new MerkleTree(leaves), 5);
  const tree = new MerkleTree(leaves);
  const root = tree.root;
  const idx = 7;

  const prove = timed(() => proveEligibility(keys[idx].privateKey, attrs, tree, idx, ctx));
  const proof = proveEligibility(keys[idx].privateKey, attrs, tree, idx, ctx);
  const verify = timed(() => verifyEligibility(proof, root, ctx));

  const bytes =
    proof.publicKey.length +
    proof.attributes.length +
    proof.ownership.length +
    proof.merkleProof.reduce((a: number, s: any) => a + (s.sibling?.length ?? 48) + 1, 0);

  console.log(
    `${N}\t${proof.merkleProof.length}\t${bytes}\t\t${build.toFixed(2)}\t\t${prove.toFixed(2)}\t\t${verify.toFixed(2)}`,
  );
}
