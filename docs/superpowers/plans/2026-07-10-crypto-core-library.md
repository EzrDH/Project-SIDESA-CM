# Crypto Core Library (@sidesa/crypto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, fully unit-tested TypeScript cryptography library implementing the ECDSA and ZKP primitives that the whole SIDESA-CM system depends on.

**Architecture:** Pure-logic library (no server, no DB, no I/O) built on the audited `@noble/curves` + `@noble/hashes`. Exposes: SHA-384 hashing, ECDSA P-384 document signing, a domain-separated Merkle tree, a non-interactive Schnorr proof-of-knowledge (Fiat-Shamir), and a composed "eligibility proof" (Merkle membership + key ownership + selective attribute disclosure). Consumed later by the backend (directly) and the mobile app (via a Dart port).

**Tech Stack:** TypeScript (ESM), Node.js 20, Vitest, `@noble/curves`, `@noble/hashes`. Package lives at `packages/crypto/` to anticipate a monorepo (`packages/backend`, `packages/app` come in later plans).

**Working style (vibe coding + guardrails):** Code is AI-generated task-by-task; the failing test written FIRST is the contract. Never hand-roll EC/hash primitives — always call `@noble/*`. The human reviews each task's diff (especially the crypto logic and the negative/soundness tests) before the next task starts.

## Global Constraints

_(Copied verbatim from the PRD; every task implicitly inherits these.)_

- Elliptic curve: **P-384 (secp384r1)** only. **Never P-256.**
- Hash (standalone, for signing / Fiat-Shamir / Merkle): **SHA-384** only. **Never SHA-256 as a standalone hash.**
- Signature scheme: **ECDSA** (per assignment requirement), over P-384 + SHA-384.
- Compliance basis: **Kepka BSSN No. 443 Tahun 2025** (Algoritma Kriptografi Indonesia).
- All randomness for scalars must come from a CSPRNG (`@noble/hashes/utils` `randomBytes`), reduced mod curve order `n`, non-zero.
- **Honest scope note (write in README):** the eligibility proof reveals a *pseudonymous* public key `P` (linkable across requests) and only the attributes needed — it does **not** provide full unlinkable anonymity. Fully-unlinkable ZK membership (hiding which leaf) requires a zk-SNARK toolchain and is explicitly **out of scope** for this prototype (future work).

---

### Task 1: Package bootstrap

**Files:**
- Create: `.gitignore`
- Create: `packages/crypto/package.json`
- Create: `packages/crypto/tsconfig.json`
- Create: `packages/crypto/vitest.config.ts`
- Create: `packages/crypto/src/index.ts` (placeholder)
- Create: `packages/crypto/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable Vitest setup and the `@sidesa/crypto` package skeleton.

- [ ] **Step 1: Initialize git repo (root) and gitignore**

Run from repo root `DesaBinaan/`:
```bash
git init
```

Create `.gitignore`:
```gitignore
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 2: Create `packages/crypto/package.json`**

```json
{
  "name": "@sidesa/crypto",
  "version": "0.1.0",
  "type": "module",
  "description": "SIDESA-CM cryptographic core (ECDSA P-384, Merkle, Schnorr ZKP) — Kepka BSSN 443/2025 compliant",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@noble/curves": "^1.6.0",
    "@noble/hashes": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.1.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 3: Create `packages/crypto/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Create `packages/crypto/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create placeholder `packages/crypto/src/index.ts`**

```ts
export const VERSION = '0.1.0';
```

- [ ] **Step 6: Write the smoke test `packages/crypto/test/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('package', () => {
  it('exposes a version', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
```

- [ ] **Step 7: Install deps and run the smoke test**

Run:
```bash
cd packages/crypto && npm install && npm test
```
Expected: Vitest reports `1 passed` for `smoke.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add .gitignore packages/crypto
git commit -m "chore: bootstrap @sidesa/crypto package with vitest"
```

---

### Task 2: SHA-384 hashing + domain separation

**Files:**
- Create: `packages/crypto/src/hash.ts`
- Test: `packages/crypto/test/hash.test.ts`

**Interfaces:**
- Consumes: `@noble/hashes`.
- Produces:
  - `hash(data: Uint8Array): Uint8Array` — raw SHA-384 (48 bytes).
  - `hashUtf8(text: string): Uint8Array` — SHA-384 of UTF-8 text.
  - `domainHash(domain: string, ...parts: Uint8Array[]): Uint8Array` — length-prefixed, domain-separated SHA-384 (used by Merkle, Schnorr, eligibility).

- [ ] **Step 1: Write the failing test `test/hash.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { hash, hashUtf8, domainHash } from '../src/hash';

describe('hash', () => {
  it('computes the known SHA-384 vector for "abc"', () => {
    // NIST FIPS 180-4 test vector
    expect(bytesToHex(hashUtf8('abc'))).toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7'
    );
  });

  it('hash() and hashUtf8() agree', () => {
    expect(bytesToHex(hash(utf8ToBytes('abc')))).toBe(bytesToHex(hashUtf8('abc')));
  });

  it('domainHash is length-prefixed (no concatenation collisions)', () => {
    const a = domainHash('d', utf8ToBytes('ab'), utf8ToBytes('c'));
    const b = domainHash('d', utf8ToBytes('a'), utf8ToBytes('bc'));
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });

  it('domainHash separates by domain', () => {
    const a = domainHash('domain-1', utf8ToBytes('x'));
    const b = domainHash('domain-2', utf8ToBytes('x'));
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/hash.test.ts`
Expected: FAIL — cannot import from `../src/hash` (module not found).

- [ ] **Step 3: Implement `src/hash.ts`**

```ts
import { sha384 } from '@noble/hashes/sha512';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils';

export function hash(data: Uint8Array): Uint8Array {
  return sha384(data);
}

export function hashUtf8(text: string): Uint8Array {
  return sha384(utf8ToBytes(text));
}

function lenPrefixed(b: Uint8Array): Uint8Array {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, b.length, false); // big-endian length
  return concatBytes(len, b);
}

export function domainHash(domain: string, ...parts: Uint8Array[]): Uint8Array {
  const chunks: Uint8Array[] = [lenPrefixed(utf8ToBytes(domain))];
  for (const p of parts) chunks.push(lenPrefixed(p));
  return sha384(concatBytes(...chunks));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/hash.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/crypto/src/hash.ts packages/crypto/test/hash.test.ts
git commit -m "feat(crypto): SHA-384 hashing with domain separation"
```

---

### Task 3: ECDSA P-384 document signing

**Files:**
- Create: `packages/crypto/src/ecdsa.ts`
- Test: `packages/crypto/test/ecdsa.test.ts`

**Interfaces:**
- Consumes: `hash` domain is NOT used here; signing prehashes with SHA-384 internally.
- Produces:
  - `interface KeyPair { privateKey: Uint8Array; publicKey: Uint8Array }`
  - `generateKeyPair(): KeyPair`
  - `getPublicKey(privateKey: Uint8Array): Uint8Array` — compressed (49 bytes).
  - `signMessage(privateKey: Uint8Array, message: Uint8Array): Uint8Array` — SHA-384 prehash, returns 96-byte compact signature.
  - `verifyMessage(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean`

- [ ] **Step 1: Write the failing test `test/ecdsa.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { generateKeyPair, getPublicKey, signMessage, verifyMessage } from '../src/ecdsa';

describe('ecdsa P-384', () => {
  it('sign/verify roundtrip succeeds', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const msg = utf8ToBytes('Surat Keterangan Domisili No. 470/12');
    const sig = signMessage(privateKey, msg);
    expect(verifyMessage(publicKey, msg, sig)).toBe(true);
  });

  it('rejects a tampered message (1 byte changed)', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const msg = utf8ToBytes('amount: 1000000');
    const sig = signMessage(privateKey, msg);
    const tampered = utf8ToBytes('amount: 9000000');
    expect(verifyMessage(publicKey, tampered, sig)).toBe(false);
  });

  it('rejects a signature from the wrong key', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    const msg = utf8ToBytes('hello');
    const sig = signMessage(a.privateKey, msg);
    expect(verifyMessage(b.publicKey, msg, sig)).toBe(false);
  });

  it('derives a 49-byte compressed public key', () => {
    const { privateKey, publicKey } = generateKeyPair();
    expect(publicKey.length).toBe(49);
    expect(getPublicKey(privateKey)).toEqual(publicKey);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/ecdsa.test.ts`
Expected: FAIL — module `../src/ecdsa` not found.

- [ ] **Step 3: Implement `src/ecdsa.ts`**

```ts
import { p384 } from '@noble/curves/nist';
import { sha384 } from '@noble/hashes/sha512';

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const privateKey = p384.utils.randomPrivateKey();
  const publicKey = p384.getPublicKey(privateKey, true); // compressed
  return { privateKey, publicKey };
}

export function getPublicKey(privateKey: Uint8Array): Uint8Array {
  return p384.getPublicKey(privateKey, true);
}

export function signMessage(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  const digest = sha384(message);
  const sig = p384.sign(digest, privateKey);
  return sig.toCompactRawBytes();
}

export function verifyMessage(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): boolean {
  const digest = sha384(message);
  return p384.verify(signature, digest, publicKey);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/ecdsa.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/crypto/src/ecdsa.ts packages/crypto/test/ecdsa.test.ts
git commit -m "feat(crypto): ECDSA P-384 sign/verify with SHA-384 prehash"
```

---

### Task 4: Domain-separated Merkle tree

**Files:**
- Create: `packages/crypto/src/merkle.ts`
- Test: `packages/crypto/test/merkle.test.ts`

**Interfaces:**
- Consumes: `@noble/hashes` (SHA-384).
- Produces:
  - `interface ProofStep { sibling: Uint8Array; isRight: boolean }` — `isRight` = the sibling sits on the right of the accumulator.
  - `hashLeaf(data: Uint8Array): Uint8Array` — `SHA-384(0x00 ‖ data)`.
  - `class MerkleTree { constructor(leafData: Uint8Array[]); get root(): Uint8Array; getProof(index: number): ProofStep[]; readonly leaves: Uint8Array[] }`
  - `verifyProof(leafData: Uint8Array, proof: ProofStep[], root: Uint8Array): boolean`

- [ ] **Step 1: Write the failing test `test/merkle.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { MerkleTree, verifyProof, hashLeaf } from '../src/merkle';

const leaves = ['nik-1', 'nik-2', 'nik-3', 'nik-4', 'nik-5'].map(utf8ToBytes);

describe('merkle tree', () => {
  it('verifies a valid proof for every leaf (odd count included)', () => {
    const tree = new MerkleTree(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = tree.getProof(i);
      expect(verifyProof(leaves[i], proof, tree.root)).toBe(true);
    }
  });

  it('rejects a proof against a non-member leaf', () => {
    const tree = new MerkleTree(leaves);
    const proof = tree.getProof(0);
    expect(verifyProof(utf8ToBytes('nik-999'), proof, tree.root)).toBe(false);
  });

  it('rejects a proof against a wrong root', () => {
    const tree = new MerkleTree(leaves);
    const other = new MerkleTree(['x', 'y'].map(utf8ToBytes));
    expect(verifyProof(leaves[0], tree.getProof(0), other.root)).toBe(false);
  });

  it('single-leaf tree: root equals hashLeaf, empty proof verifies', () => {
    const tree = new MerkleTree([utf8ToBytes('solo')]);
    expect(tree.getProof(0)).toEqual([]);
    expect(tree.root).toEqual(hashLeaf(utf8ToBytes('solo')));
    expect(verifyProof(utf8ToBytes('solo'), [], tree.root)).toBe(true);
  });

  it('throws on empty leaf set', () => {
    expect(() => new MerkleTree([])).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/merkle.test.ts`
Expected: FAIL — module `../src/merkle` not found.

- [ ] **Step 3: Implement `src/merkle.ts`**

```ts
import { sha384 } from '@noble/hashes/sha512';
import { concatBytes } from '@noble/hashes/utils';

const LEAF = Uint8Array.of(0x00);
const NODE = Uint8Array.of(0x01);

export interface ProofStep {
  sibling: Uint8Array;
  isRight: boolean;
}

export function hashLeaf(data: Uint8Array): Uint8Array {
  return sha384(concatBytes(LEAF, data));
}

function hashNode(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha384(concatBytes(NODE, left, right));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class MerkleTree {
  readonly leaves: Uint8Array[];
  private readonly layers: Uint8Array[][];

  constructor(leafData: Uint8Array[]) {
    if (leafData.length === 0) throw new Error('MerkleTree requires at least one leaf');
    this.leaves = leafData.map(hashLeaf);
    this.layers = [this.leaves];
    let current = this.leaves;
    while (current.length > 1) {
      const next: Uint8Array[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : current[i]; // duplicate last if odd
        next.push(hashNode(left, right));
      }
      this.layers.push(next);
      current = next;
    }
  }

  get root(): Uint8Array {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): ProofStep[] {
    if (index < 0 || index >= this.leaves.length) throw new Error('index out of range');
    const proof: ProofStep[] = [];
    let idx = index;
    for (let l = 0; l < this.layers.length - 1; l++) {
      const layer = this.layers[l];
      const isRightNode = idx % 2 === 1;
      const siblingIdx = isRightNode ? idx - 1 : idx + 1;
      const sibling = siblingIdx < layer.length ? layer[siblingIdx] : layer[idx]; // odd -> duplicate self
      proof.push({ sibling, isRight: !isRightNode });
      idx = Math.floor(idx / 2);
    }
    return proof;
  }
}

export function verifyProof(leafData: Uint8Array, proof: ProofStep[], root: Uint8Array): boolean {
  let acc = hashLeaf(leafData);
  for (const step of proof) {
    acc = step.isRight ? hashNode(acc, step.sibling) : hashNode(step.sibling, acc);
  }
  return equalBytes(acc, root);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/merkle.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/crypto/src/merkle.ts packages/crypto/test/merkle.test.ts
git commit -m "feat(crypto): domain-separated SHA-384 Merkle tree with membership proofs"
```

---

### Task 5: Non-interactive Schnorr proof-of-knowledge (Fiat-Shamir)

**Files:**
- Create: `packages/crypto/src/schnorr.ts`
- Test: `packages/crypto/test/schnorr.test.ts`

**Interfaces:**
- Consumes: `domainHash` from `./hash`, `p384` from `@noble/curves/nist`.
- Produces:
  - `randomScalar(): bigint` — CSPRNG scalar in `[1, n-1]`.
  - `derivePublic(secret: bigint): Uint8Array` — compressed `secret*G`.
  - `interface SchnorrProof { R: Uint8Array; s: Uint8Array }`
  - `proveKnowledge(secret: bigint, publicKey: Uint8Array, context: Uint8Array): SchnorrProof` — proves knowledge of `secret` s.t. `publicKey = secret*G`, bound to `context`.
  - `verifyKnowledge(publicKey: Uint8Array, proof: SchnorrProof, context: Uint8Array): boolean`

- [ ] **Step 1: Write the failing test `test/schnorr.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { randomScalar, derivePublic, proveKnowledge, verifyKnowledge } from '../src/schnorr';

describe('schnorr non-interactive PoK', () => {
  it('accepts a valid proof under the same context', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const ctx = utf8ToBytes('permohonan#42');
    const proof = proveKnowledge(x, P, ctx);
    expect(verifyKnowledge(P, proof, ctx)).toBe(true);
  });

  it('rejects a proof replayed under a different context', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const proof = proveKnowledge(x, P, utf8ToBytes('permohonan#42'));
    expect(verifyKnowledge(P, proof, utf8ToBytes('permohonan#43'))).toBe(false);
  });

  it('rejects a proof for a different public key (soundness)', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const Pother = derivePublic(randomScalar());
    const ctx = utf8ToBytes('c');
    const proof = proveKnowledge(x, P, ctx);
    expect(verifyKnowledge(Pother, proof, ctx)).toBe(false);
  });

  it('rejects a tampered response s', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const ctx = utf8ToBytes('c');
    const proof = proveKnowledge(x, P, ctx);
    proof.s[proof.s.length - 1] ^= 0x01;
    expect(verifyKnowledge(P, proof, ctx)).toBe(false);
  });

  it('a prover without the secret cannot forge (uses P but not x)', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const guess = randomScalar(); // attacker's wrong secret
    const ctx = utf8ToBytes('c');
    const forged = proveKnowledge(guess, P, ctx); // claims P but signs with guess
    expect(verifyKnowledge(P, forged, ctx)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/schnorr.test.ts`
Expected: FAIL — module `../src/schnorr` not found.

- [ ] **Step 3: Implement `src/schnorr.ts`**

```ts
import { p384 } from '@noble/curves/nist';
import { mod } from '@noble/curves/abstract/modular';
import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/abstract/utils';
import { randomBytes } from '@noble/hashes/utils';
import { domainHash } from './hash';

const Point = p384.ProjectivePoint;
const N = p384.CURVE.n;
const SCALAR_BYTES = 48;

export interface SchnorrProof {
  R: Uint8Array; // compressed commitment point
  s: Uint8Array; // response scalar, 48 bytes big-endian
}

export function randomScalar(): bigint {
  // 64 bytes reduced mod n removes modulo bias; retry on the negligible zero case.
  for (;;) {
    const s = mod(bytesToNumberBE(randomBytes(64)), N);
    if (s !== 0n) return s;
  }
}

export function derivePublic(secret: bigint): Uint8Array {
  return Point.BASE.multiply(secret).toRawBytes(true);
}

function challenge(publicKey: Uint8Array, R: Uint8Array, context: Uint8Array): bigint {
  const h = domainHash('SIDESA-schnorr-v1', publicKey, R, context);
  return mod(bytesToNumberBE(h), N);
}

export function proveKnowledge(
  secret: bigint,
  publicKey: Uint8Array,
  context: Uint8Array
): SchnorrProof {
  for (;;) {
    const k = randomScalar();
    const Rbytes = Point.BASE.multiply(k).toRawBytes(true);
    const c = challenge(publicKey, Rbytes, context);
    if (c === 0n) continue; // negligible; keeps c in [1, n-1]
    const s = mod(k + c * secret, N);
    if (s === 0n) continue;
    return { R: Rbytes, s: numberToBytesBE(s, SCALAR_BYTES) };
  }
}

export function verifyKnowledge(
  publicKey: Uint8Array,
  proof: SchnorrProof,
  context: Uint8Array
): boolean {
  let P, R;
  try {
    P = Point.fromHex(publicKey);
    R = Point.fromHex(proof.R);
  } catch {
    return false;
  }
  const s = bytesToNumberBE(proof.s);
  if (s <= 0n || s >= N) return false;
  const c = challenge(publicKey, proof.R, context);
  if (c === 0n) return false;
  // Verify s*G == R + c*P
  const lhs = Point.BASE.multiply(s);
  const rhs = R.add(P.multiply(c));
  return lhs.equals(rhs);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/schnorr.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/crypto/src/schnorr.ts packages/crypto/test/schnorr.test.ts
git commit -m "feat(crypto): non-interactive Schnorr PoK with Fiat-Shamir context binding"
```

---

### Task 6: Composed eligibility proof (Merkle membership + key ownership)

**Files:**
- Create: `packages/crypto/src/eligibility.ts`
- Test: `packages/crypto/test/eligibility.test.ts`

**Interfaces:**
- Consumes: `MerkleTree`, `ProofStep`, `verifyProof` from `./merkle`; `proveKnowledge`, `verifyKnowledge`, `derivePublic`, `SchnorrProof` from `./schnorr`; `domainHash` from `./hash`.
- Produces:
  - `computeLeaf(publicKey: Uint8Array, attributes: Uint8Array): Uint8Array` — the resident's registry leaf.
  - `interface EligibilityProof { publicKey: Uint8Array; attributes: Uint8Array; merkleProof: ProofStep[]; ownership: SchnorrProof }`
  - `proveEligibility(secret: bigint, attributes: Uint8Array, tree: MerkleTree, leafIndex: number, context: Uint8Array): EligibilityProof`
  - `verifyEligibility(proof: EligibilityProof, signedRoot: Uint8Array, context: Uint8Array): boolean`

Note: the registry `MerkleTree` MUST be built from `leafData[i] = computeLeaf(P_i, attrs_i)`. The caller is responsible for verifying `signedRoot` is the desa-ECDSA-signed root (that happens in Task 7's integration test and later in the backend).

- [ ] **Step 1: Write the failing test `test/eligibility.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { MerkleTree } from '../src/merkle';
import { randomScalar, derivePublic } from '../src/schnorr';
import { computeLeaf, proveEligibility, verifyEligibility } from '../src/eligibility';

function buildRegistry(count: number) {
  const secrets = Array.from({ length: count }, () => randomScalar());
  const attrs = Array.from({ length: count }, (_, i) => utf8ToBytes(`rt=00${i};domisili=CibeteungMuara`));
  const leafData = secrets.map((s, i) => computeLeaf(derivePublic(s), attrs[i]));
  const tree = new MerkleTree(leafData);
  return { secrets, attrs, tree };
}

describe('eligibility proof', () => {
  it('accepts a genuine resident with a valid proof', () => {
    const { secrets, attrs, tree } = buildRegistry(6);
    const ctx = utf8ToBytes('permohonan#100');
    const proof = proveEligibility(secrets[3], attrs[3], tree, 3, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });

  it('rejects a non-member (key not in the registry)', () => {
    const { tree } = buildRegistry(6);
    const outsiderSecret = randomScalar();
    const outsiderAttrs = utf8ToBytes('rt=001;domisili=CibeteungMuara');
    const ctx = utf8ToBytes('c');
    // Build a fake proof by putting the outsider into a throwaway 1-leaf tree
    const fakeTree = new MerkleTree([computeLeaf(derivePublic(outsiderSecret), outsiderAttrs)]);
    const proof = proveEligibility(outsiderSecret, outsiderAttrs, fakeTree, 0, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(false); // wrong (real) root
  });

  it('rejects a replayed proof under a different request context', () => {
    const { secrets, attrs, tree } = buildRegistry(4);
    const proof = proveEligibility(secrets[1], attrs[1], tree, 1, utf8ToBytes('permohonan#1'));
    expect(verifyEligibility(proof, tree.root, utf8ToBytes('permohonan#2'))).toBe(false);
  });

  it('rejects attribute tampering after the proof is built', () => {
    const { secrets, attrs, tree } = buildRegistry(4);
    const ctx = utf8ToBytes('c');
    const proof = proveEligibility(secrets[2], attrs[2], tree, 2, ctx);
    proof.attributes = utf8ToBytes('rt=999;domisili=Elsewhere'); // forge attributes
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(false);
  });

  it('rejects an impersonator who copies a real public key but lacks the secret', () => {
    const { secrets, attrs, tree } = buildRegistry(4);
    const ctx = utf8ToBytes('c');
    const honest = proveEligibility(secrets[0], attrs[0], tree, 0, ctx);
    // attacker reuses victim's publicKey/attributes/merkleProof but forges ownership with a wrong secret
    const attacker = proveEligibility(randomScalar(), attrs[0], tree, 0, ctx);
    const forged = { ...honest, ownership: attacker.ownership };
    expect(verifyEligibility(forged, tree.root, ctx)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/eligibility.test.ts`
Expected: FAIL — module `../src/eligibility` not found.

- [ ] **Step 3: Implement `src/eligibility.ts`**

```ts
import { MerkleTree, ProofStep, verifyProof } from './merkle';
import { proveKnowledge, verifyKnowledge, derivePublic, SchnorrProof } from './schnorr';
import { domainHash } from './hash';

export function computeLeaf(publicKey: Uint8Array, attributes: Uint8Array): Uint8Array {
  return domainHash('SIDESA-resident-leaf-v1', publicKey, attributes);
}

export interface EligibilityProof {
  publicKey: Uint8Array;    // revealed pseudonymous identity key P
  attributes: Uint8Array;   // revealed attributes required for the service
  merkleProof: ProofStep[]; // membership of the leaf under the signed root
  ownership: SchnorrProof;  // PoK of secret x s.t. P = xG, bound to context
}

export function proveEligibility(
  secret: bigint,
  attributes: Uint8Array,
  tree: MerkleTree,
  leafIndex: number,
  context: Uint8Array
): EligibilityProof {
  const publicKey = derivePublic(secret);
  const merkleProof = tree.getProof(leafIndex);
  const ownership = proveKnowledge(secret, publicKey, context);
  return { publicKey, attributes, merkleProof, ownership };
}

export function verifyEligibility(
  proof: EligibilityProof,
  signedRoot: Uint8Array,
  context: Uint8Array
): boolean {
  const leaf = computeLeaf(proof.publicKey, proof.attributes);
  if (!verifyProof(leaf, proof.merkleProof, signedRoot)) return false; // registered resident?
  if (!verifyKnowledge(proof.publicKey, proof.ownership, context)) return false; // owns key + bound to request
  return true;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/eligibility.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/crypto/src/eligibility.ts packages/crypto/test/eligibility.test.ts
git commit -m "feat(crypto): composed eligibility proof (Merkle membership + Schnorr ownership)"
```

---

### Task 7: Public API surface + end-to-end integration test + README

**Files:**
- Modify: `packages/crypto/src/index.ts`
- Test: `packages/crypto/test/integration.test.ts`
- Create: `packages/crypto/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: `@sidesa/crypto` barrel exports; a full-flow test proving the modules compose; compliance/limitations documentation.

- [ ] **Step 1: Write the failing integration test `test/integration.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import {
  generateKeyPair, signMessage, verifyMessage,
  MerkleTree, computeLeaf, proveEligibility, verifyEligibility,
  randomScalar, derivePublic,
} from '../src/index';

describe('end-to-end village flow', () => {
  it('desa signs registry root; resident proves eligibility; verifier checks both', () => {
    // 1. Enroll residents -> build registry
    const residents = Array.from({ length: 5 }, () => randomScalar());
    const attrs = residents.map((_, i) => utf8ToBytes(`rt=00${i}`));
    const leafData = residents.map((s, i) => computeLeaf(derivePublic(s), attrs[i]));
    const tree = new MerkleTree(leafData);

    // 2. Kepala Desa ECDSA-signs the Merkle root
    const kades = generateKeyPair();
    const rootSig = signMessage(kades.privateKey, tree.root);
    expect(verifyMessage(kades.publicKey, tree.root, rootSig)).toBe(true);

    // 3. A resident proves eligibility for a specific request
    const ctx = utf8ToBytes('permohonan:SKTM:2026-07-10:seq=7');
    const proof = proveEligibility(residents[2], attrs[2], tree, 2, ctx);

    // 4. Verifier: (a) trust the root via ECDSA, (b) check eligibility against it
    expect(verifyMessage(kades.publicKey, tree.root, rootSig)).toBe(true);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/integration.test.ts`
Expected: FAIL — the named exports are not yet re-exported from `../src/index`.

- [ ] **Step 3: Implement the barrel `src/index.ts`**

```ts
export const VERSION = '0.1.0';

export { hash, hashUtf8, domainHash } from './hash';
export { generateKeyPair, getPublicKey, signMessage, verifyMessage } from './ecdsa';
export type { KeyPair } from './ecdsa';
export { MerkleTree, verifyProof, hashLeaf } from './merkle';
export type { ProofStep } from './merkle';
export { randomScalar, derivePublic, proveKnowledge, verifyKnowledge } from './schnorr';
export type { SchnorrProof } from './schnorr';
export { computeLeaf, proveEligibility, verifyEligibility } from './eligibility';
export type { EligibilityProof } from './eligibility';
```

- [ ] **Step 4: Run the FULL suite to verify everything passes together**

Run: `npm test`
Expected: PASS — all files (`smoke`, `hash`, `ecdsa`, `merkle`, `schnorr`, `eligibility`, `integration`), 25 tests total.

- [ ] **Step 5: Write `README.md`**

```markdown
# @sidesa/crypto

Cryptographic core for SIDESA-CM (layanan Desa Cibeteung Muara).

## Compliance
Algorithms conform to **Kepka BSSN No. 443 Tahun 2025**:
- Signatures: **ECDSA over P-384** with **SHA-384** prehash.
- Hashing / Fiat-Shamir / Merkle: **SHA-384**.
- Never P-256; never SHA-256 as a standalone hash.

## Modules
- `hash` — SHA-384 + domain-separated hashing.
- `ecdsa` — P-384 keygen / sign / verify (document & Merkle-root signing).
- `merkle` — SHA-384 Merkle tree + membership proofs.
- `schnorr` — non-interactive Schnorr proof-of-knowledge (Fiat-Shamir, context-bound).
- `eligibility` — composed proof: Merkle membership + key ownership + selective attribute disclosure.

## Security scope & limitations (read before defending academically)
- The eligibility proof reveals a **pseudonymous** public key `P` (linkable across requests)
  and only the attributes required for a service. It proves *"a registered resident who owns
  this key, with these attributes, is making this specific request"* without revealing the
  underlying PII (NIK/KK).
- It does **NOT** provide full unlinkable anonymity. Hiding *which* leaf is used requires a
  zk-SNARK Merkle-path circuit and is **out of scope** for this prototype (future work).
- `context` MUST be unique per request (e.g. `jenis:tanggal:sequence`) to prevent replay.
- Callers MUST verify the Merkle root's ECDSA signature (desa root key) before trusting a proof.

## Test
    npm install
    npm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/crypto/src/index.ts packages/crypto/test/integration.test.ts packages/crypto/README.md
git commit -m "feat(crypto): public API, end-to-end integration test, and compliance README"
```

---

## Self-Review (completed by plan author)

**Spec coverage (crypto portions of PRD §10):**
- ECDSA P-384 + SHA-384 signing → Task 3 ✅
- SHA-384 hashing / domain separation → Task 2 ✅
- Merkle tree membership (SHA-384) → Task 4 ✅
- Schnorr + Fiat-Shamir, context-bound (anti-replay) → Task 5 ✅
- Composed ZKP eligibility (membership + selective disclosure) → Task 6 ✅
- Root signing + full flow → Task 7 integration ✅
- Pedersen commitment / numeric range proofs → intentionally deferred (YAGNI) to a later "attribute-privacy" plan; noted in README limitations.

**Placeholder scan:** none — every step contains full code, exact commands, and expected output.

**Type consistency:** `ProofStep`, `SchnorrProof`, `EligibilityProof`, `KeyPair` used identically across Tasks 4–7; barrel exports in Task 7 match the symbols defined in Tasks 2–6.

## Notes for the executor
- Pin the installed `@noble/curves` / `@noble/hashes` versions from Task 1. If a symbol name differs in the installed version (`ProjectivePoint`, `p384.CURVE.n`, `toCompactRawBytes`, `numberToBytesBE`), verify against that version's typings before "fixing" a test — the audited library is the source of truth, not this plan.
- Do NOT weaken a failing negative/soundness test to make it pass. A red soundness test means the crypto is wrong; investigate with superpowers:systematic-debugging.
