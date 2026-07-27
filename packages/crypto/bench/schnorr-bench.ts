/**
 * Pengukuran konstruksi ZKP: bukti-pengetahuan Schnorr dan bukti kelayakan
 * (keanggotaan Merkle + Schnorr atas konteks permohonan).
 *
 * Bukti kelayakan di sini disusun langsung dari primitif pustaka, persis
 * sebagaimana ditetapkan rencana migrasi Tahap 1 — bukan dari jalur ECDSA
 * yang masih terpasang pada src/eligibility.ts saat berkas ini ditulis.
 *
 * Jalankan: npx tsx packages/crypto/bench/schnorr-bench.ts
 */
import {
  randomScalar,
  derivePublic,
  proveKnowledge,
  verifyKnowledge,
  MerkleTree,
  verifyProof,
  computeLeaf,
  hash,
} from '../src/index';

const enc = (s: string) => new TextEncoder().encode(s);
const REPS = 200;
const WARMUP = 20;

function bench(name: string, fn: () => void): { name: string; mean: number; p95: number } {
  for (let i = 0; i < WARMUP; i++) fn();
  const xs: number[] = [];
  for (let i = 0; i < REPS; i++) {
    const t0 = process.hrtime.bigint();
    fn();
    xs.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  xs.sort((a, b) => a - b);
  return { name, mean: xs.reduce((a, b) => a + b, 0) / xs.length, p95: xs[Math.floor(xs.length * 0.95)] };
}

// --- primitif Schnorr ---
const x = randomScalar();
const X = derivePublic(x);
const ctx = enc('SIDESA-eligibility-v1|acc-1|janji-temu|nonce-0123456789abcdef');
const proof = proveKnowledge(x, X, ctx);

// --- registri Merkle 1024 penduduk ---
const N = 1024;
const secrets = Array.from({ length: N }, () => randomScalar());
const attrs = enc('domisili=Cibeteung Muara;dewasa=true');
const leaves = secrets.map((s) => computeLeaf(derivePublic(s), attrs));
const tree = new MerkleTree(leaves);
const root = tree.root;
const idx = 7;
const mp = tree.getProof(idx);

// bukti kelayakan berbasis Schnorr: keanggotaan + penguasaan kunci
function proveEligibilitySchnorr(secret: bigint) {
  const pub = derivePublic(secret);
  return { publicKey: pub, attributes: attrs, merkleProof: tree.getProof(idx), ownership: proveKnowledge(secret, pub, ctx) };
}
const elig = proveEligibilitySchnorr(secrets[idx]);

function verifyEligibilitySchnorr(p: typeof elig): boolean {
  const leaf = computeLeaf(p.publicKey, p.attributes);
  if (!verifyProof(leaf, p.merkleProof, root)) return false;
  return verifyKnowledge(p.publicKey, p.ownership, ctx);
}

const results = [
  bench('SHA-384 (64 B)', () => hash(ctx)),
  bench('Schnorr: bangkitkan rahasia', () => randomScalar()),
  bench('Schnorr: turunkan kunci publik', () => derivePublic(x)),
  bench('Schnorr: buat bukti (prove)', () => proveKnowledge(x, X, ctx)),
  bench('Schnorr: verifikasi bukti', () => verifyKnowledge(X, proof, ctx)),
  bench(`Merkle: bangun pohon (N=${N})`, () => new MerkleTree(leaves)),
  bench('Merkle: verifikasi jalur', () => verifyProof(leaves[idx], mp, root)),
  bench('Kelayakan: buat bukti', () => proveEligibilitySchnorr(secrets[idx])),
  bench('Kelayakan: verifikasi bukti', () => verifyEligibilitySchnorr(elig)),
];

console.log(`\nN=${REPS} ulangan (warmup ${WARMUP}), Node ${process.version}, ${process.platform}/${process.arch}\n`);
console.log('operasi'.padEnd(34), 'mean(ms)'.padStart(9), 'p95(ms)'.padStart(9));
for (const r of results) {
  console.log(r.name.padEnd(34), r.mean.toFixed(3).padStart(9), r.p95.toFixed(3).padStart(9));
}

const proofBytes = proof.R.length + proof.s.length;
const eligBytes =
  elig.publicKey.length + elig.attributes.length + proofBytes +
  elig.merkleProof.reduce((a, s: any) => a + s.sibling.length + 1, 0);

console.log('\n=== ukuran wire (bita) ===');
console.log('kunci publik terkompresi X :', X.length);
console.log('komitmen R                 :', proof.R.length);
console.log('respons s                  :', proof.s.length);
console.log('bukti Schnorr (R||s)       :', proofBytes);
console.log('digest SHA-384             :', hash(ctx).length);
console.log(`langkah Merkle (N=${N})      :`, elig.merkleProof.length);
console.log('atribut terungkap          :', attrs.length);
console.log('TOTAL bukti kelayakan      :', eligBytes);
