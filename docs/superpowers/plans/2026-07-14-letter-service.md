# Letter Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The end-to-end letter lifecycle: a warga requests a letter, an operator drafts it from a template, the Kepala Desa signs it with ECDSA, the server issues a numbered letter with a QR token, and anyone can verify it publicly.

**Architecture:** A request moves `SUBMITTED → DRAFTED → SIGNED` (or `REJECTED`). Drafting renders a **deterministic canonical document** from a per-type template + form data and assigns a letter number. The Kepala Desa signs the canonical bytes on-device (ECDSA); the server only *verifies* the signature and issues the `Letter`. Public verification recomputes the hash and checks the signature against the signer's registered `KADES` key. PDF rendering is a presentation concern for the mobile app (it draws the letter + a QR that points at `/verify/:token`); this service owns the signed data and the verification API.

**Tech Stack:** NestJS + Prisma + Postgres + `@sidesa/crypto` (existing), Vitest + Supertest. Reuses Plan #2 auth/RBAC and Plan #3 registry helpers.

## Global Constraints

- Crypto only from `@sidesa/crypto` (ECDSA P-384 + SHA-384). The **Kepala Desa key never reaches the server** — the server verifies the letter signature, never creates it.
- A letter is valid only if its signature verifies against a `KADES`-role account's public key over the exact stored canonical content.
- The canonical document is **deterministic** (same inputs → same bytes → same hash), so verification is reproducible.
- Role gates: request = `WARGA`; draft/reject = `OPERATOR`; sign = `KADES`; verify = public (no auth).
- Reuse `hexToBytes`/`bytesToHex` from `registry.builder`; never re-implement crypto.

## Prerequisites

- Postgres running (`docker start sidesa-pg`), `DATABASE_URL` set. Task 1 is pure; Tasks 2–5 touch the DB.

## File Structure

```
packages/backend/src/letters/
  letter.template.ts        # pure: renderCanonicalLetter, documentHashHex
  letter.service.ts         # DB lifecycle: request, queue, draft, sign, reject
  verification.service.ts   # recompute + verify by qrToken
  letter.controller.ts      # warga/operator/kades endpoints
  verification.controller.ts# public GET /verify/:token
  letter.module.ts
packages/backend/prisma/schema.prisma   # + LetterRequest, Letter, enums
```

---

### Task 1: Letter template + canonical document (pure)

**Files:**
- Create: `packages/backend/src/letters/letter.template.ts`
- Test: `packages/backend/test/letter.template.test.ts`

**Interfaces:**
- Consumes: `hash` from `@sidesa/crypto`.
- Produces:
  - `type LetterType = 'SURAT_PENGANTAR' | 'SKTM' | 'DOMISILI'`
  - `renderCanonicalLetter(type, data: Record<string,string>, letterNumber: string): string`
  - `documentHashHex(canonical: string): string`

- [ ] **Step 1: Write the failing test — `test/letter.template.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { renderCanonicalLetter, documentHashHex } from '../src/letters/letter.template';

describe('letter template', () => {
  const data = { nama: 'Budi Santoso', nik: '3201...', alamat: 'RT 01' };

  it('is deterministic for the same inputs', () => {
    const a = renderCanonicalLetter('DOMISILI', data, '1/SKD/2026');
    const b = renderCanonicalLetter('DOMISILI', { alamat: 'RT 01', nik: '3201...', nama: 'Budi Santoso' }, '1/SKD/2026');
    expect(a).toBe(b); // key order in input must not matter
    expect(documentHashHex(a)).toBe(documentHashHex(b));
  });

  it('changes the hash when any field changes', () => {
    const base = documentHashHex(renderCanonicalLetter('DOMISILI', data, '1/SKD/2026'));
    const changed = documentHashHex(renderCanonicalLetter('DOMISILI', { ...data, alamat: 'RT 99' }, '1/SKD/2026'));
    expect(changed).not.toBe(base);
  });

  it('produces a 96-hex document hash and includes the number + title', () => {
    const c = renderCanonicalLetter('SKTM', data, '7/SKTM/2026');
    expect(c).toContain('7/SKTM/2026');
    expect(c).toContain('Surat Keterangan Tidak Mampu');
    expect(documentHashHex(c)).toMatch(/^[0-9a-f]{96}$/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/letters/letter.template.ts`**

```ts
import { hash } from '@sidesa/crypto';

export type LetterType = 'SURAT_PENGANTAR' | 'SKTM' | 'DOMISILI';

const TITLES: Record<LetterType, string> = {
  SURAT_PENGANTAR: 'Surat Pengantar',
  SKTM: 'Surat Keterangan Tidak Mampu',
  DOMISILI: 'Surat Keterangan Domisili',
};

export function renderCanonicalLetter(
  type: LetterType,
  data: Record<string, string>,
  letterNumber: string,
): string {
  const lines = [
    'SIDESA-LETTER-v1',
    'Pemerintah Desa Cibeteung Muara, Kecamatan Ciseeng, Kabupaten Bogor',
    `Jenis: ${TITLES[type]}`,
    `Nomor: ${letterNumber}`,
  ];
  for (const key of Object.keys(data).sort()) lines.push(`${key}: ${data[key]}`);
  lines.push('Ditandatangani secara digital oleh Kepala Desa.');
  return lines.join('\n');
}

export function documentHashHex(canonical: string): string {
  return Array.from(hash(new TextEncoder().encode(canonical)), (x) => x.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/letters/letter.template.ts packages/backend/test/letter.template.test.ts
git commit -m "feat(backend): deterministic canonical letter template + SHA-384 doc hash"
```

---

### Task 2: DB schema — LetterRequest + Letter

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`
- Migration: `packages/backend/prisma/migrations/20260714150000_letters/migration.sql`
- Test: `packages/backend/test/letter.schema.integration.test.ts`

- [ ] **Step 1: Append to `schema.prisma`**

```prisma
enum LetterType {
  SURAT_PENGANTAR
  SKTM
  DOMISILI
}

enum LetterStatus {
  SUBMITTED
  DRAFTED
  SIGNED
  REJECTED
}

model LetterRequest {
  id             String       @id @default(uuid())
  wargaAccountId String
  type           LetterType
  formData       String
  status         LetterStatus @default(SUBMITTED)
  draftContent   String?
  draftNumber    String?
  createdAt      DateTime     @default(now())
  letter         Letter?
}

model Letter {
  id               String        @id @default(uuid())
  requestId        String        @unique
  request          LetterRequest @relation(fields: [requestId], references: [id])
  letterNumber     String        @unique
  canonicalContent String
  documentHash     String
  signature        String
  kadesAccountId   String
  kadesPublicKey   String
  qrToken          String        @unique
  signedAt         DateTime      @default(now())
}
```

- [ ] **Step 2: Generate the migration SQL** (non-interactive; Postgres running)

Run (from `packages/backend`):
```bash
npx prisma migrate diff --from-url "postgresql://postgres:devpass@localhost:5432/sidesa?schema=public" --to-schema-datamodel prisma/schema.prisma --script
```
Copy the printed SQL into `prisma/migrations/20260714150000_letters/migration.sql`, then apply:
```bash
npx prisma migrate deploy && npx prisma generate
```

- [ ] **Step 3: Write the integration test — `test/letter.schema.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('letter schema (integration)', () => {
  const prisma = new PrismaService();
  let reqId = '';
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'probe-warga' } });
    await prisma.$disconnect();
  });

  it('stores a letter request', async () => {
    const r = await prisma.letterRequest.create({
      data: { wargaAccountId: 'probe-warga', type: 'DOMISILI', formData: '{}' },
    });
    reqId = r.id;
    const found = await prisma.letterRequest.findUnique({ where: { id: reqId } });
    expect(found?.status).toBe('SUBMITTED');
    expect(found?.type).toBe('DOMISILI');
  });
});
```

- [ ] **Step 4: Run — expect PASS (1 test)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/prisma packages/backend/test/letter.schema.integration.test.ts
git commit -m "feat(backend): schema for LetterRequest + Letter"
```

---

### Task 3: LetterService (request, queue, draft, sign, reject)

**Files:**
- Create: `packages/backend/src/letters/letter.service.ts`
- Test: `packages/backend/test/letter.service.integration.test.ts`

**Interfaces:**
- Consumes: `PrismaService`, `letter.template`, `verifyMessage` from `@sidesa/crypto`, `hexToBytes` from `registry.builder`.
- Produces `LetterService`:
  - `createRequest(wargaAccountId, type, formData: Record<string,string>): Promise<{ id: string }>`
  - `listQueue(): Promise<{ id: string; type: string; createdAt: Date }[]>`
  - `draft(requestId): Promise<{ letterNumber: string; canonicalContent: string; documentHash: string }>`
  - `forSigning(requestId): Promise<{ canonicalContent: string; documentHash: string }>`
  - `sign(kadesAccountId, requestId, signatureHex): Promise<{ letterNumber: string; qrToken: string }>`
  - `reject(requestId): Promise<{ status: string }>`

- [ ] **Step 1: Write the failing test — `test/letter.service.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('LetterService (integration)', () => {
  const prisma = new PrismaService();
  const svc = new LetterService(prisma);
  const kades = generateKeyPair();
  const kadesPk = hex(kades.publicKey);
  let kadesId = '';
  let requestId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    kadesId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kadesPk, displayName: 'H. Asep' } })).id;
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: 'w-1' } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'w-1' } });
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    await prisma.$disconnect();
  });

  it('runs request -> draft -> sign and issues a verifiable letter', async () => {
    const r = await svc.createRequest('w-1', 'DOMISILI', { nama: 'Budi', alamat: 'RT 01' });
    requestId = r.id;

    const draft = await svc.draft(requestId);
    expect(draft.letterNumber).toMatch(/DOMISILI|SKD|\//);
    expect(draft.canonicalContent).toContain(draft.letterNumber);

    const fs = await svc.forSigning(requestId);
    const sig = hex(signMessage(kades.privateKey, enc.encode(fs.canonicalContent)));
    const issued = await svc.sign(kadesId, requestId, sig);
    expect(issued.qrToken).toBeTruthy();

    const letter = await prisma.letter.findUnique({ where: { requestId } });
    expect(letter?.signature).toBe(sig);
    expect((await prisma.letterRequest.findUnique({ where: { id: requestId } }))?.status).toBe('SIGNED');
  });

  it('rejects a signature that does not match the canonical content', async () => {
    const r = await svc.createRequest('w-1', 'SKTM', { nama: 'Siti' });
    await svc.draft(r.id);
    const wrong = generateKeyPair();
    const badSig = hex(signMessage(wrong.privateKey, enc.encode('not the document')));
    await expect(svc.sign(kadesId, r.id, badSig)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/letters/letter.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hexToBytes } from '../registry/registry.builder';
import { renderCanonicalLetter, documentHashHex, LetterType } from './letter.template';

const CODE: Record<LetterType, string> = { SURAT_PENGANTAR: 'SP', SKTM: 'SKTM', DOMISILI: 'SKD' };
const enc = new TextEncoder();

function randomToken(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

@Injectable()
export class LetterService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(wargaAccountId: string, type: LetterType, formData: Record<string, string>): Promise<{ id: string }> {
    const r = await this.prisma.letterRequest.create({
      data: { wargaAccountId, type, formData: JSON.stringify(formData) },
    });
    return { id: r.id };
  }

  async listQueue() {
    const rows = await this.prisma.letterRequest.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, type: r.type, createdAt: r.createdAt }));
  }

  async draft(requestId: string): Promise<{ letterNumber: string; canonicalContent: string; documentHash: string }> {
    const req = await this.prisma.letterRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Permohonan tidak ditemukan.');
    if (req.status !== 'SUBMITTED') throw new BadRequestException('Permohonan sudah diproses.');
    const type = req.type as LetterType;
    const seq = (await this.prisma.letterRequest.count({ where: { type: req.type, draftNumber: { not: null } } })) + 1;
    const letterNumber = `${seq}/${CODE[type]}/${new Date().getFullYear()}`;
    const canonicalContent = renderCanonicalLetter(type, JSON.parse(req.formData), letterNumber);
    await this.prisma.letterRequest.update({
      where: { id: requestId },
      data: { status: 'DRAFTED', draftContent: canonicalContent, draftNumber: letterNumber },
    });
    return { letterNumber, canonicalContent, documentHash: documentHashHex(canonicalContent) };
  }

  async forSigning(requestId: string): Promise<{ canonicalContent: string; documentHash: string }> {
    const req = await this.prisma.letterRequest.findUnique({ where: { id: requestId } });
    if (!req || !req.draftContent) throw new NotFoundException('Draft belum tersedia.');
    return { canonicalContent: req.draftContent, documentHash: documentHashHex(req.draftContent) };
  }

  async sign(kadesAccountId: string, requestId: string, signatureHex: string): Promise<{ letterNumber: string; qrToken: string }> {
    const kades = await this.prisma.account.findUnique({ where: { id: kadesAccountId } });
    if (!kades || kades.role !== 'KADES' || kades.status !== 'ACTIVE') {
      throw new BadRequestException('Hanya Kepala Desa aktif yang boleh menandatangani.');
    }
    const req = await this.prisma.letterRequest.findUnique({ where: { id: requestId } });
    if (!req || req.status !== 'DRAFTED' || !req.draftContent || !req.draftNumber) {
      throw new BadRequestException('Draft belum siap ditandatangani.');
    }
    const ok = verifyMessage(hexToBytes(kades.publicKey), enc.encode(req.draftContent), hexToBytes(signatureHex));
    if (!ok) throw new BadRequestException('Tanda tangan surat tidak valid.');

    const qrToken = randomToken();
    await this.prisma.letter.create({
      data: {
        requestId,
        letterNumber: req.draftNumber,
        canonicalContent: req.draftContent,
        documentHash: documentHashHex(req.draftContent),
        signature: signatureHex,
        kadesAccountId,
        kadesPublicKey: kades.publicKey,
        qrToken,
      },
    });
    await this.prisma.letterRequest.update({ where: { id: requestId }, data: { status: 'SIGNED' } });
    return { letterNumber: req.draftNumber, qrToken };
  }

  async reject(requestId: string): Promise<{ status: string }> {
    await this.prisma.letterRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    return { status: 'REJECTED' };
  }
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/letters/letter.service.ts packages/backend/test/letter.service.integration.test.ts
git commit -m "feat(backend): letter lifecycle service (request/draft/ECDSA-sign/issue)"
```

---

### Task 4: Public verification service + controllers + module

**Files:**
- Create: `packages/backend/src/letters/verification.service.ts`
- Create: `packages/backend/src/letters/letter.controller.ts`
- Create: `packages/backend/src/letters/verification.controller.ts`
- Create: `packages/backend/src/letters/letter.module.ts`
- Modify: `packages/backend/src/app.module.ts`
- Test: `packages/backend/test/verification.service.integration.test.ts`

**Interfaces:**
- `VerificationService.verifyByToken(token): Promise<{ valid: boolean; letterNumber?: string; signedAt?: Date; signer?: string; type?: string; content?: string }>`

- [ ] **Step 1: Write the failing test — `test/verification.service.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';
import { VerificationService } from '../src/letters/verification.service';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('VerificationService (integration)', () => {
  const prisma = new PrismaService();
  const letters = new LetterService(prisma);
  const verify = new VerificationService(prisma);
  const kades = generateKeyPair();
  const kadesPk = hex(kades.publicKey);
  let kadesId = '';
  let token = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    kadesId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kadesPk, displayName: 'H. Asep' } })).id;
    const r = await letters.createRequest('w-verify', 'DOMISILI', { nama: 'Budi' });
    await letters.draft(r.id);
    const fs = await letters.forSigning(r.id);
    const sig = hex(signMessage(kades.privateKey, enc.encode(fs.canonicalContent)));
    token = (await letters.sign(kadesId, r.id, sig)).qrToken;
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: 'w-verify' } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'w-verify' } });
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    await prisma.$disconnect();
  });

  it('verifies a genuine letter by its QR token', async () => {
    const res = await verify.verifyByToken(token);
    expect(res.valid).toBe(true);
    expect(res.signer).toBe('H. Asep');
    expect(res.letterNumber).toBeTruthy();
  });

  it('reports invalid for an unknown token', async () => {
    expect((await verify.verifyByToken('deadbeef')).valid).toBe(false);
  });

  it('reports invalid if the stored content was tampered with', async () => {
    await prisma.letter.update({ where: { qrToken: token }, data: { canonicalContent: 'TAMPERED' } });
    expect((await verify.verifyByToken(token)).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement the service, controllers, and module**

`src/letters/verification.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hexToBytes } from '../registry/registry.builder';
import { documentHashHex } from './letter.template';

const enc = new TextEncoder();

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyByToken(token: string) {
    const letter = await this.prisma.letter.findUnique({ where: { qrToken: token }, include: { request: true } });
    if (!letter) return { valid: false };

    const signer = await this.prisma.account.findUnique({ where: { id: letter.kadesAccountId } });
    const signerIsKades = !!signer && signer.role === 'KADES';
    const hashOk = documentHashHex(letter.canonicalContent) === letter.documentHash;
    const sigOk = verifyMessage(
      hexToBytes(letter.kadesPublicKey),
      enc.encode(letter.canonicalContent),
      hexToBytes(letter.signature),
    );

    if (!signerIsKades || !hashOk || !sigOk) return { valid: false };
    return {
      valid: true,
      letterNumber: letter.letterNumber,
      signedAt: letter.signedAt,
      signer: signer!.displayName,
      type: letter.request.type,
      content: letter.canonicalContent,
    };
  }
}
```

`src/letters/letter.controller.ts`:
```ts
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { LetterService } from './letter.service';
import { LetterType } from './letter.template';

@Controller('letters')
export class LetterController {
  constructor(private readonly letters: LetterService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  request(@Req() req: any, @Body() body: { type: LetterType; formData: Record<string, string> }) {
    return this.letters.createRequest(req.user.accountId, body.type, body.formData);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  queue() {
    return this.letters.listQueue();
  }

  @Post(':id/draft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  draft(@Param('id') id: string) {
    return this.letters.draft(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  reject(@Param('id') id: string) {
    return this.letters.reject(id);
  }

  @Get(':id/for-signing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  forSigning(@Param('id') id: string) {
    return this.letters.forSigning(id);
  }

  @Post(':id/sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  sign(@Req() req: any, @Param('id') id: string, @Body() body: { signature: string }) {
    return this.letters.sign(req.user.accountId, id, body.signature);
  }
}
```

`src/letters/verification.controller.ts`:
```ts
import { Controller, Get, Param } from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller('verify')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get(':token')
  verify(@Param('token') token: string) {
    return this.verification.verifyByToken(token);
  }
}
```

`src/letters/letter.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LetterService } from './letter.service';
import { VerificationService } from './verification.service';
import { LetterController } from './letter.controller';
import { VerificationController } from './verification.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [LetterController, VerificationController],
  providers: [PrismaService, LetterService, VerificationService],
})
export class LetterModule {}
```

Modify `src/app.module.ts` to add `LetterModule`:
```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { RegistryModule } from './registry/registry.module';
import { LetterModule } from './letters/letter.module';

@Module({ imports: [AuthModule, RegistryModule, LetterModule], controllers: [HealthController] })
export class AppModule {}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/letters packages/backend/src/app.module.ts packages/backend/test/verification.service.integration.test.ts
git commit -m "feat(backend): public letter verification + letter/verify endpoints"
```

---

### Task 5: End-to-end letter flow

**Files:**
- Test: `packages/backend/test/letter-flow.e2e.test.ts`

- [ ] **Step 1: Write the e2e test — `test/letter-flow.e2e.test.ts`** (needs Postgres)

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();

async function login(app: INestApplication, kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
  const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
  const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce)));
  const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce: ch.body.nonce, signature: sig });
  return vr.body.token;
}

describe('Letter flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair(), kades = generateKeyPair(), warga = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  let opId = '', kaId = '', waId = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'H. Asep Saepudin' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: waPk, displayName: 'Budi' } })).id;
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: waId } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: waId } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('warga requests -> operator drafts -> KaDes signs -> public verify succeeds', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    const waToken = await login(app, warga, waId);

    const req = await request(app.getHttpServer()).post('/letters/request')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ type: 'DOMISILI', formData: { nama: 'Budi Santoso', alamat: 'Kp. Muara RT 01' } }).expect(201);
    const id = req.body.id;

    await request(app.getHttpServer()).post(`/letters/${id}/draft`).set('Authorization', `Bearer ${opToken}`).expect(201);

    const fs = await request(app.getHttpServer()).get(`/letters/${id}/for-signing`).set('Authorization', `Bearer ${kaToken}`).expect(200);
    const sig = hex(signMessage(kades.privateKey, enc.encode(fs.body.canonicalContent)));
    const signed = await request(app.getHttpServer()).post(`/letters/${id}/sign`).set('Authorization', `Bearer ${kaToken}`).send({ signature: sig }).expect(201);

    const v = await request(app.getHttpServer()).get(`/verify/${signed.body.qrToken}`).expect(200);
    expect(v.body.valid).toBe(true);
    expect(v.body.signer).toBe('H. Asep Saepudin');
    expect(v.body.letterNumber).toBe(signed.body.letterNumber);
  });

  it('forbids a warga from drafting (operator-only)', async () => {
    const waToken = await login(app, warga, waId);
    const req = await request(app.getHttpServer()).post('/letters/request')
      .set('Authorization', `Bearer ${waToken}`).send({ type: 'SKTM', formData: { nama: 'Budi' } }).expect(201);
    await request(app.getHttpServer()).post(`/letters/${req.body.id}/draft`).set('Authorization', `Bearer ${waToken}`).expect(403);
  });
});
```

- [ ] **Step 2: Run the full backend suite** (Postgres running): `npm -w @sidesa/backend test`
Expected: PASS — all prior suites + `letter-flow.e2e` green.

- [ ] **Step 3: Commit**
```bash
git add packages/backend/test/letter-flow.e2e.test.ts
git commit -m "test(backend): e2e letter flow (request -> draft -> KaDes sign -> public verify)"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** deterministic template + canonical doc (Task 1) ✅; request/draft/sign lifecycle (Tasks 2–3) ✅; KaDes ECDSA signing, server verifies only (Task 3) ✅; public QR verification incl. tamper + wrong-signer detection (Task 4) ✅; role gates warga/operator/kades (Tasks 4–5) ✅; e2e (Task 5) ✅.

**Deferred (intentional):** PDF rendering (app concern — the app draws the letter + a QR to `/verify/:token`); binding a letter request to a ZKP eligibility proof (Plan #3's endpoint exists — a small follow-up gate on `/letters/request`); numbering with month/roman-numeral formatting (cosmetic).

**Placeholder scan:** none — full code, exact commands, expected output throughout.

**Type consistency:** `LetterType` shared by template, service, controller; `verifyMessage`/`hexToBytes` reused from crypto/registry; verification recomputes `documentHashHex` and checks the signer is a `KADES` account.

## Notes for the executor
- Migration is authored via `migrate diff` + `migrate deploy` (this environment can't run interactive `migrate dev`).
- Do NOT weaken the negative tests (bad signature rejected at sign; tampered content / unknown token / non-KADES signer → invalid at verify) — they are the letter-integrity guarantees.
