/**
 * Penskalaan bukti kelayakan berbasis Schnorr terhadap ukuran registri.
 * Jalankan: npx tsx packages/crypto/bench/schnorr-scaling.ts
 */
import {
  randomScalar, derivePublic, proveKnowledge, verifyKnowledge,
  MerkleTree, verifyProof, computeLeaf,
} from '../src/index';

const enc = (s: string) => new TextEncoder().encode(s);
const attrs = enc('domisili=Cibeteung Muara;dewasa=true');
const ctx = enc('SIDESA-eligibility-v1|acc-1|janji-temu|nonce-0123456789abcdef');
const REPS = 50;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function timed(fn: () => void, reps = REPS): number {
  for (let i = 0; i < 10; i++) fn();
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
  const secrets = Array.from({ length: N }, () => randomScalar());
  const leaves = secrets.map((s) => computeLeaf(derivePublic(s), attrs));
  const build = timed(() => new MerkleTree(leaves), 5);

  const tree = new MerkleTree(leaves);
  const root = tree.root;
  const i = 7;
  const secret = secrets[i];
  const pub = derivePublic(secret);

  const prove = timed(() => ({ mp: tree.getProof(i), own: proveKnowledge(secret, pub, ctx) }));
  const mp = tree.getProof(i);
  const own = proveKnowledge(secret, pub, ctx);

  const verify = timed(() => {
    const leaf = computeLeaf(pub, attrs);
    return verifyProof(leaf, mp, root) && verifyKnowledge(pub, own, ctx);
  });

  const bytes = pub.length + attrs.length + own.R.length + own.s.length +
    mp.reduce((a: number, s: any) => a + s.sibling.length + 1, 0);

  console.log(`${N}\t${mp.length}\t${bytes}\t\t${build.toFixed(2)}\t\t${prove.toFixed(2)}\t\t${verify.toFixed(2)}`);
}
