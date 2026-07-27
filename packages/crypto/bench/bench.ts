/**
 * Pengukuran kinerja primitif @sidesa/crypto untuk pelaporan akademik.
 * Jalankan: npx tsx packages/crypto/bench/bench.ts
 */
import {
  generateKeyPair,
  getPublicKey,
  signMessage,
  verifyMessage,
  hash,
  MerkleTree,
  computeLeaf,
  proveEligibility,
  verifyEligibility,
} from '../src/index';

const REPEATS = 200;
const WARMUP = 20;

function bench(name: string, fn: () => void): { name: string; mean: number; p50: number; p95: number } {
  for (let i = 0; i < WARMUP; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < REPEATS; i++) {
    const t0 = process.hrtime.bigint();
    fn();
    samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { name, mean, p50: samples[Math.floor(samples.length * 0.5)], p95: samples[Math.floor(samples.length * 0.95)] };
}

const enc = (s: string) => new TextEncoder().encode(s);

// --- ECDSA P-384 ---
const kp = generateKeyPair();
const msg = enc('SIDESA-letter-v1|contoh isi surat keterangan domisili yang dikanonikkan');
const sig = signMessage(kp.privateKey, msg);

// --- registri Merkle 1024 penduduk ---
const N = 1024;
const keys = Array.from({ length: N }, () => generateKeyPair());
const attrs = enc('domisili=Cibeteung Muara;dewasa=true');
const leaves = keys.map((k) => computeLeaf(getPublicKey(k.privateKey), attrs));
const tree = new MerkleTree(leaves);
const root = tree.root;
const ctx = enc('SIDESA-letter-eligibility-v1|acc-1|SKD|nonce-0123456789abcdef');
const proof = proveEligibility(keys[7].privateKey, attrs, tree, 7, ctx);

const results = [
  bench('SHA-384 (64 B)', () => hash(msg)),
  bench('ECDSA P-384 keygen', () => generateKeyPair()),
  bench('ECDSA P-384 sign', () => signMessage(kp.privateKey, msg)),
  bench('ECDSA P-384 verify', () => verifyMessage(kp.publicKey, msg, sig)),
  bench(`Merkle build (N=${N})`, () => new MerkleTree(leaves)),
  bench('Bukti kelayakan: prove', () => proveEligibility(keys[7].privateKey, attrs, tree, 7, ctx)),
  bench('Bukti kelayakan: verify', () => verifyEligibility(proof, root, ctx)),
];

console.log(`\nN=${REPEATS} ulangan (warmup ${WARMUP}), Node ${process.version}, ${process.platform}/${process.arch}\n`);
console.log('operasi'.padEnd(28), 'mean(ms)'.padStart(9), 'p50(ms)'.padStart(9), 'p95(ms)'.padStart(9));
for (const r of results) {
  console.log(r.name.padEnd(28), r.mean.toFixed(3).padStart(9), r.p50.toFixed(3).padStart(9), r.p95.toFixed(3).padStart(9));
}

const proofBytes =
  proof.publicKey.length +
  proof.attributes.length +
  proof.ownership.length +
  proof.merkleProof.reduce((a, s: any) => a + (s.hash?.length ?? s.sibling?.length ?? 48) + 1, 0);

console.log('\n=== ukuran wire (bita) ===');
console.log('kunci publik terkompresi :', getPublicKey(kp.privateKey).length);
console.log('tanda tangan compact     :', sig.length);
console.log('digest SHA-384           :', hash(msg).length);
console.log(`langkah Merkle (N=${N})    :`, proof.merkleProof.length);
console.log('atribut terungkap        :', proof.attributes.length);
console.log('TOTAL bukti kelayakan    :', proofBytes);
