# Registry & ZKP Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect `@sidesa/crypto`'s eligibility proof to the backend: an operator-approved resident registry (Merkle tree), a Kepala-Desa-signed registry root, and a server endpoint that verifies a warga's zero-knowledge eligibility proof.

**Architecture:** Approved warga accounts form the leaves of a Merkle tree (`computeLeaf(publicKey, attributes)`). The server computes the root; the **Kepala Desa signs the root from their device** (ECDSA) and publishes the signature — the server only *verifies* it (the KaDes private key never touches the server). A warga fetches their Merkle proof, produces a Schnorr proof-of-ownership over a request context on-device, and the server verifies the whole thing with `verifyEligibility`. Crucially, a warga's **single device key** doubles as ECDSA auth key and Schnorr identity key: `getPublicKey(priv) == derivePublic(scalar(priv))`.

**Tech Stack:** NestJS + Prisma + Postgres + `@sidesa/crypto` (existing), Vitest + Supertest.

## Global Constraints

- Crypto only from `@sidesa/crypto` (ECDSA P-384, SHA-384, Merkle, Schnorr). Never re-implement.
- The **Kepala Desa private key never reaches the server** — the server verifies the root signature, never creates it.
- A registry root is trusted only when it is **signed by an ACTIVE `KADES` account** and marked active.
- Eligibility `context` binds a proof to one request; the client picks it, the server echoes and verifies it.
- Attributes are a canonical UTF-8 string (e.g. `rt=001;domisili=CibeteungMuara`); server and client hash identical bytes.
- Reuse Plan #2's auth/RBAC/audit; every state change is an operator/kades action guarded by role.

## Prerequisites

- Postgres container running (`docker start sidesa-pg`), `DATABASE_URL` in `packages/backend/.env`.
- Tasks 1 is pure (no DB). Tasks 2–5 touch the DB.

## File Structure

```
packages/backend/src/registry/
  registry.builder.ts     # pure: entries -> Merkle tree + hex helpers
  registry.service.ts     # DB: approve warga, build tree, proof, snapshot, publish signed root
  registry.controller.ts  # operator/kades/warga endpoints
  eligibility.service.ts  # verify a submitted eligibility proof against the active signed root
  eligibility.controller.ts
  registry.module.ts
packages/backend/prisma/schema.prisma   # + Account.attributes/leafIndex, + RegistryVersion
```

---

### Task 1: Registry builder (pure)

**Files:**
- Create: `packages/backend/src/registry/registry.builder.ts`
- Test: `packages/backend/test/registry.builder.test.ts`

**Interfaces:**
- Consumes: `MerkleTree`, `computeLeaf` from `@sidesa/crypto`.
- Produces:
  - `interface RegistryEntry { publicKey: string; attributes: string }` (publicKey hex, attributes utf8)
  - `hexToBytes(hex)`, `bytesToHex(bytes)`
  - `buildRegistryTree(entries): MerkleTree`
  - `rootHex(tree): string`

- [ ] **Step 1: Write the failing test — `test/registry.builder.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { randomScalar, derivePublic, proveEligibility, verifyEligibility } from '@sidesa/crypto';
import { buildRegistryTree, rootHex, bytesToHex, RegistryEntry } from '../src/registry/registry.builder';

const enc = new TextEncoder();

describe('registry builder', () => {
  it('builds a tree whose proofs satisfy crypto verifyEligibility', () => {
    const secrets = [randomScalar(), randomScalar(), randomScalar()];
    const attrs = ['rt=001', 'rt=002', 'rt=003'];
    const entries: RegistryEntry[] = secrets.map((s, i) => ({ publicKey: bytesToHex(derivePublic(s)), attributes: attrs[i] }));
    const tree = buildRegistryTree(entries);

    const ctx = enc.encode('permohonan#1');
    const proof = proveEligibility(secrets[1], enc.encode(attrs[1]), tree, 1, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });

  it('produces a stable 96-hex root', () => {
    const entries: RegistryEntry[] = [{ publicKey: bytesToHex(derivePublic(randomScalar())), attributes: 'a' }];
    expect(rootHex(buildRegistryTree(entries))).toMatch(/^[0-9a-f]{96}$/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm -w @sidesa/backend test -- test/registry.builder.test.ts`)

- [ ] **Step 3: Implement `src/registry/registry.builder.ts`**

```ts
import { MerkleTree, computeLeaf } from '@sidesa/crypto';

export interface RegistryEntry {
  publicKey: string; // compressed P-384 point, hex
  attributes: string; // canonical utf8 string
}

const enc = new TextEncoder();

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function buildRegistryTree(entries: RegistryEntry[]): MerkleTree {
  const leaves = entries.map((e) => computeLeaf(hexToBytes(e.publicKey), enc.encode(e.attributes)));
  return new MerkleTree(leaves);
}

export function rootHex(tree: MerkleTree): string {
  return bytesToHex(tree.root);
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/registry/registry.builder.ts packages/backend/test/registry.builder.test.ts
git commit -m "feat(backend): pure registry Merkle builder (crypto-compatible proofs)"
```

---

### Task 2: DB schema — resident attributes + registry versions

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`
- Test: `packages/backend/test/registry.schema.integration.test.ts`

- [ ] **Step 1: Add to `schema.prisma`** — new fields on `Account` and a new model:

Add inside `model Account { ... }` (after `nikCommitment`):
```prisma
  attributes    String?
  leafIndex     Int?     @unique
```

Append a new model:
```prisma
model RegistryVersion {
  id        String   @id @default(uuid())
  version   Int      @unique @default(autoincrement())
  root      String
  signature String?
  signedBy  String?
  active    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Migrate** (Postgres running)
Run (from `packages/backend`): `npx prisma migrate dev --name registry`
Expected: migration applied, client regenerated.

- [ ] **Step 3: Write the integration test — `test/registry.schema.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('registry schema (integration)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.registryVersion.deleteMany({ where: { root: 'root-probe' } });
    await prisma.$disconnect();
  });

  it('stores a registry version and reads it back', async () => {
    const v = await prisma.registryVersion.create({ data: { root: 'root-probe', active: false } });
    const found = await prisma.registryVersion.findUnique({ where: { id: v.id } });
    expect(found?.root).toBe('root-probe');
    expect(found?.active).toBe(false);
  });
});
```

- [ ] **Step 4: Run — expect PASS (1 test)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/prisma packages/backend/test/registry.schema.integration.test.ts
git commit -m "feat(backend): schema for resident attributes/leafIndex + RegistryVersion"
```

---

### Task 3: RegistryService (approve, build, proof, snapshot, publish)

**Files:**
- Create: `packages/backend/src/registry/registry.service.ts`
- Test: `packages/backend/test/registry.service.integration.test.ts`

**Interfaces:**
- Consumes: `PrismaService`, `registry.builder`, `verifyMessage` from `@sidesa/crypto`.
- Produces `RegistryService` with:
  - `approveWarga(wargaAccountId, attributes): Promise<{ leafIndex: number }>`
  - `proofForAccount(accountId): Promise<{ attributes: string; leafIndex: number; root: string; merkleProof: { sibling: string; isRight: boolean }[] }>`
  - `snapshotRoot(): Promise<{ version: number; root: string }>`
  - `publishSignedRoot(kadesAccountId, version, signatureHex): Promise<{ active: boolean }>`
  - `activeRootHex(): Promise<string | null>`

- [ ] **Step 1: Write the failing test — `test/registry.service.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';
import { hexToBytes } from '../src/registry/registry.builder';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('RegistryService (integration)', () => {
  const prisma = new PrismaService();
  const svc = new RegistryService(prisma);
  const kades = generateKeyPair();
  const warga = generateKeyPair();
  const kadesPk = hex(kades.publicKey);
  const wargaPk = hex(warga.publicKey);
  let wargaId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.account.deleteMany({ where: { publicKey: { in: [kadesPk, wargaPk] } } });
    await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kadesPk, displayName: 'KaDes' } });
    const w = await prisma.account.create({ data: { role: 'WARGA', status: 'PENDING', publicKey: wargaPk, displayName: 'Budi', nikCommitment: 'c' } });
    wargaId = w.id;
  });
  afterAll(async () => {
    await prisma.registryVersion.deleteMany({ where: { signedBy: kadesPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [kadesPk, wargaPk] } } });
    await prisma.$disconnect();
  });

  it('approves a warga, snapshots a root, and publishes it with a valid KaDes signature', async () => {
    await svc.approveWarga(wargaId, 'rt=001;domisili=CibeteungMuara');
    const activated = await prisma.account.findUnique({ where: { id: wargaId } });
    expect(activated?.status).toBe('ACTIVE');
    expect(activated?.leafIndex).not.toBeNull();

    const snap = await svc.snapshotRoot();
    expect(snap.root).toMatch(/^[0-9a-f]{96}$/);

    const sig = hex(signMessage(kades.privateKey, hexToBytes(snap.root)));
    const kadesAcc = await prisma.account.findUnique({ where: { publicKey: kadesPk } });
    const res = await svc.publishSignedRoot(kadesAcc!.id, snap.version, sig);
    expect(res.active).toBe(true);
    expect(await svc.activeRootHex()).toBe(snap.root);
  });

  it('rejects a root signature that is not from the KaDes key', async () => {
    const snap = await svc.snapshotRoot();
    const wrong = generateKeyPair();
    const badSig = hex(signMessage(wrong.privateKey, hexToBytes(snap.root)));
    const kadesAcc = await prisma.account.findUnique({ where: { publicKey: kadesPk } });
    await expect(svc.publishSignedRoot(kadesAcc!.id, snap.version, badSig)).rejects.toThrow();
  });

  it('returns a warga proof for the active root', async () => {
    const p = await svc.proofForAccount(wargaId);
    expect(p.attributes).toBe('rt=001;domisili=CibeteungMuara');
    expect(Array.isArray(p.merkleProof)).toBe(true);
    expect(p.root).toMatch(/^[0-9a-f]{96}$/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/registry/registry.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { buildRegistryTree, rootHex, hexToBytes, RegistryEntry } from './registry.builder';

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  private async activeEntries(): Promise<{ id: string; leafIndex: number; entry: RegistryEntry }[]> {
    const rows = await this.prisma.account.findMany({
      where: { role: 'WARGA', status: 'ACTIVE', leafIndex: { not: null } },
      orderBy: { leafIndex: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      leafIndex: r.leafIndex as number,
      entry: { publicKey: r.publicKey, attributes: r.attributes ?? '' },
    }));
  }

  async approveWarga(wargaAccountId: string, attributes: string): Promise<{ leafIndex: number }> {
    const acc = await this.prisma.account.findUnique({ where: { id: wargaAccountId } });
    if (!acc || acc.role !== 'WARGA') throw new NotFoundException('Warga tidak ditemукan.');
    const count = await this.prisma.account.count({ where: { role: 'WARGA', leafIndex: { not: null } } });
    const leafIndex = acc.leafIndex ?? count;
    await this.prisma.account.update({
      where: { id: wargaAccountId },
      data: { attributes, status: 'ACTIVE', leafIndex },
    });
    return { leafIndex };
  }

  async snapshotRoot(): Promise<{ version: number; root: string }> {
    const entries = (await this.activeEntries()).map((e) => e.entry);
    if (entries.length === 0) throw new BadRequestException('Registri penduduk masih kosong.');
    const root = rootHex(buildRegistryTree(entries));
    const v = await this.prisma.registryVersion.create({ data: { root, active: false } });
    return { version: v.version, root };
  }

  async publishSignedRoot(kadesAccountId: string, version: number, signatureHex: string): Promise<{ active: boolean }> {
    const kades = await this.prisma.account.findUnique({ where: { id: kadesAccountId } });
    if (!kades || kades.role !== 'KADES' || kades.status !== 'ACTIVE') {
      throw new BadRequestException('Hanya Kepala Desa aktif yang boleh menandatangani root.');
    }
    const ver = await this.prisma.registryVersion.findUnique({ where: { version } });
    if (!ver) throw new NotFoundException('Versi registri tidak ditemukan.');
    const ok = verifyMessage(hexToBytes(kades.publicKey), hexToBytes(ver.root), hexToBytes(signatureHex));
    if (!ok) throw new BadRequestException('Tanda tangan root tidak valid.');
    await this.prisma.registryVersion.updateMany({ where: { active: true }, data: { active: false } });
    await this.prisma.registryVersion.update({
      where: { version },
      data: { active: true, signature: signatureHex, signedBy: kades.publicKey },
    });
    return { active: true };
  }

  async activeRootHex(): Promise<string | null> {
    const v = await this.prisma.registryVersion.findFirst({ where: { active: true }, orderBy: { version: 'desc' } });
    return v?.root ?? null;
  }

  async proofForAccount(accountId: string) {
    const entries = await this.activeEntries();
    const idx = entries.findIndex((e) => e.id === accountId);
    if (idx < 0) throw new NotFoundException('Akun belum terdaftar di registri aktif.');
    const tree = buildRegistryTree(entries.map((e) => e.entry));
    const proof = tree.getProof(idx);
    return {
      attributes: entries[idx].entry.attributes,
      leafIndex: entries[idx].leafIndex,
      root: rootHex(tree),
      merkleProof: proof.map((s) => ({ sibling: Array.from(s.sibling, (x) => x.toString(16).padStart(2, '0')).join(''), isRight: s.isRight })),
    };
  }
}
```

> Note: fix the accidental Cyrillic in `'Warga tidak ditemукan.'` → `'Warga tidak ditemukan.'` when implementing.

- [ ] **Step 4: Run — expect PASS (3 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/registry/registry.service.ts packages/backend/test/registry.service.integration.test.ts
git commit -m "feat(backend): registry service (approve, snapshot, KaDes-signed root, proof)"
```

---

### Task 4: Eligibility verification service + controllers + module

**Files:**
- Create: `packages/backend/src/registry/eligibility.service.ts`
- Create: `packages/backend/src/registry/registry.controller.ts`
- Create: `packages/backend/src/registry/eligibility.controller.ts`
- Create: `packages/backend/src/registry/registry.module.ts`
- Modify: `packages/backend/src/app.module.ts` (import `RegistryModule`)
- Test: `packages/backend/test/eligibility.service.test.ts`

**Interfaces:**
- `interface EligibilityProofDto { publicKey: string; attributes: string; merkleProof: { sibling: string; isRight: boolean }[]; ownership: { R: string; s: string } }`
- `EligibilityService.verify(dto, context): Promise<{ valid: boolean }>` — loads active root, calls crypto `verifyEligibility`.

- [ ] **Step 1: Write the failing test — `test/eligibility.service.test.ts`** (pure; injects a fake RegistryService)

```ts
import { describe, it, expect } from 'vitest';
import { randomScalar, derivePublic, proveEligibility } from '@sidesa/crypto';
import { buildRegistryTree, rootHex, bytesToHex } from '../src/registry/registry.builder';
import { EligibilityService } from '../src/registry/eligibility.service';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('EligibilityService.verify', () => {
  const secret = randomScalar();
  const attrs = 'rt=007';
  const entries = [{ publicKey: bytesToHex(derivePublic(secret)), attributes: attrs }];
  const tree = buildRegistryTree(entries);
  const svc = new EligibilityService({ activeRootHex: async () => rootHex(tree) } as any);

  function dtoFor(context: string) {
    const p = proveEligibility(secret, enc.encode(attrs), tree, 0, enc.encode(context));
    return {
      publicKey: hex(p.publicKey),
      attributes: attrs,
      merkleProof: p.merkleProof.map((s) => ({ sibling: hex(s.sibling), isRight: s.isRight })),
      ownership: { R: hex(p.ownership.R), s: hex(p.ownership.s) },
    };
  }

  it('accepts a valid proof under the same context', async () => {
    expect((await svc.verify(dtoFor('req-1'), 'req-1')).valid).toBe(true);
  });

  it('rejects a proof replayed under a different context', async () => {
    expect((await svc.verify(dtoFor('req-1'), 'req-2')).valid).toBe(false);
  });

  it('rejects when there is no active root', async () => {
    const svc2 = new EligibilityService({ activeRootHex: async () => null } as any);
    expect((await svc2.verify(dtoFor('req-1'), 'req-1')).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement the service, controllers, and module**

`src/registry/eligibility.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { verifyEligibility } from '@sidesa/crypto';
import { hexToBytes } from './registry.builder';
import { RegistryService } from './registry.service';

export interface EligibilityProofDto {
  publicKey: string;
  attributes: string;
  merkleProof: { sibling: string; isRight: boolean }[];
  ownership: { R: string; s: string };
}

const enc = new TextEncoder();

@Injectable()
export class EligibilityService {
  constructor(private readonly registry: RegistryService) {}

  async verify(dto: EligibilityProofDto, context: string): Promise<{ valid: boolean }> {
    const rootHexStr = await this.registry.activeRootHex();
    if (!rootHexStr) return { valid: false };
    const proof = {
      publicKey: hexToBytes(dto.publicKey),
      attributes: enc.encode(dto.attributes),
      merkleProof: dto.merkleProof.map((s) => ({ sibling: hexToBytes(s.sibling), isRight: s.isRight })),
      ownership: { R: hexToBytes(dto.ownership.R), s: hexToBytes(dto.ownership.s) },
    };
    const valid = verifyEligibility(proof, hexToBytes(rootHexStr), enc.encode(context));
    return { valid };
  }
}
```

`src/registry/registry.controller.ts`:
```ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Post('approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  approve(@Body() body: { wargaAccountId: string; attributes: string }) {
    return this.registry.approveWarga(body.wargaAccountId, body.attributes);
  }

  @Post('snapshot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  snapshot() {
    return this.registry.snapshotRoot();
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  publish(@Req() req: any, @Body() body: { version: number; signature: string }) {
    return this.registry.publishSignedRoot(req.user.accountId, body.version, body.signature);
  }

  @Get('proof')
  @UseGuards(JwtAuthGuard)
  proof(@Req() req: any) {
    return this.registry.proofForAccount(req.user.accountId);
  }
}
```

`src/registry/eligibility.controller.ts`:
```ts
import { Body, Controller, Post } from '@nestjs/common';
import { EligibilityService, EligibilityProofDto } from './eligibility.service';

@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly eligibility: EligibilityService) {}

  @Post('verify')
  verify(@Body() body: { proof: EligibilityProofDto; context: string }) {
    return this.eligibility.verify(body.proof, body.context);
  }
}
```

`src/registry/registry.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from './registry.service';
import { EligibilityService } from './eligibility.service';
import { RegistryController } from './registry.controller';
import { EligibilityController } from './eligibility.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [RegistryController, EligibilityController],
  providers: [PrismaService, RegistryService, EligibilityService],
})
export class RegistryModule {}
```

Modify `src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { RegistryModule } from './registry/registry.module';

@Module({ imports: [AuthModule, RegistryModule], controllers: [HealthController] })
export class AppModule {}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/registry packages/backend/src/app.module.ts packages/backend/test/eligibility.service.test.ts
git commit -m "feat(backend): eligibility verification service + registry/eligibility endpoints"
```

---

### Task 5: End-to-end ZKP flow

**Files:**
- Test: `packages/backend/test/zkp-flow.e2e.test.ts`

**Interfaces:** consumes all prior tasks + Plan #2 auth.

- [ ] **Step 1: Write the e2e test — `test/zkp-flow.e2e.test.ts`** (needs Postgres)

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, getPublicKey, signMessage, proveKnowledge } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { hexToBytes } from '../src/registry/registry.builder';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();

async function login(app: INestApplication, kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
  const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
  const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce)));
  const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce: ch.body.nonce, signature: sig });
  return vr.body.token;
}

describe('ZKP eligibility flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair();
  const kades = generateKeyPair();
  const warga = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  const wargaScalar = BigInt('0x' + hex(warga.privateKey));
  let opId = '', kaId = '', waId = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'KaDes' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'PENDING', publicKey: waPk, displayName: 'Budi', nikCommitment: 'c' } })).id;
  });
  afterAll(async () => {
    await prisma.registryVersion.deleteMany({ where: { signedBy: kaPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('approve -> sign root -> warga proves eligibility -> server verifies', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    const waToken = await login(app, warga, waId);

    await request(app.getHttpServer()).post('/registry/approve')
      .set('Authorization', `Bearer ${opToken}`)
      .send({ wargaAccountId: waId, attributes: 'rt=001;domisili=CibeteungMuara' }).expect(201);

    const snap = await request(app.getHttpServer()).post('/registry/snapshot')
      .set('Authorization', `Bearer ${opToken}`).expect(201);

    const rootSig = hex(signMessage(kades.privateKey, hexToBytes(snap.body.root)));
    await request(app.getHttpServer()).post('/registry/publish')
      .set('Authorization', `Bearer ${kaToken}`)
      .send({ version: snap.body.version, signature: rootSig }).expect(201);

    const p = await request(app.getHttpServer()).get('/registry/proof')
      .set('Authorization', `Bearer ${waToken}`).expect(200);

    const context = 'permohonan:SKTM:seq=1';
    const ownership = proveKnowledge(wargaScalar, getPublicKey(warga.privateKey), enc.encode(context));
    const proof = {
      publicKey: waPk,
      attributes: p.body.attributes,
      merkleProof: p.body.merkleProof,
      ownership: { R: hex(ownership.R), s: hex(ownership.s) },
    };

    const res = await request(app.getHttpServer()).post('/eligibility/verify').send({ proof, context }).expect(201);
    expect(res.body.valid).toBe(true);

    const replay = await request(app.getHttpServer()).post('/eligibility/verify').send({ proof, context: 'different' }).expect(201);
    expect(replay.body.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run the full backend suite** (Postgres running): `npm -w @sidesa/backend test`
Expected: PASS — all prior suites + `zkp-flow.e2e` green.

- [ ] **Step 3: Commit**
```bash
git add packages/backend/test/zkp-flow.e2e.test.ts
git commit -m "test(backend): e2e ZKP flow (approve -> signed root -> prove -> verify)"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** Merkle resident registry (Tasks 1–3) ✅; KaDes-signed root, server verifies only (Task 3) ✅; warga Merkle proof retrieval (Task 3) ✅; ZK eligibility verification wired to crypto (Task 4) ✅; anti-replay via context (Tasks 4–5) ✅; role-guarded operator/kades actions (Task 4) ✅.

**Key identity reuse:** the warga's ECDSA auth key and Schnorr identity key are the same point (`getPublicKey(priv) == derivePublic(scalar(priv))`), so one device key serves login and eligibility — the e2e derives `wargaScalar = BigInt('0x'+hex(privateKey))` to prove ownership.

**Placeholder scan:** none. One deliberate note: fix the Cyrillic typo in Task 3 Step 3 when typing.

**Type consistency:** `EligibilityProofDto` (Task 4) mirrors crypto's `EligibilityProof` with hex-encoded bytes; `RegistryService` method signatures match their controller and test call sites; `hexToBytes`/`bytesToHex` come from `registry.builder` everywhere.

## Notes for the executor
- Do NOT weaken the negative tests (wrong root signature rejected, replay rejected, no-active-root rejected) — they are the ZKP security guarantees.
- Concurrency: `approveWarga` assigns `leafIndex` from a count; fine for the prototype. A later hardening plan can make index assignment transactional.
