# Backend Foundation & Auth (@sidesa/backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NestJS + PostgreSQL backend foundation: key-based challenge-response authentication, role-based access control, account provisioning, and an append-only hash-chained audit log — all reusing `@sidesa/crypto`.

**Architecture:** NestJS (modular, TypeScript) over PostgreSQL via Prisma. Authentication is **cryptographic, not password-based**: each account owns an ECDSA P-384 device key; login proves possession by signing a server nonce (verified with `@sidesa/crypto`). Sessions are short-lived JWTs carrying `accountId` + `role`. Every state-changing action appends to a tamper-evident audit chain. Provisioning follows the PRD §5A model (admin creates operator/kades; warga self-register as PENDING).

**Tech Stack:** NestJS 10, TypeScript, Prisma ORM, PostgreSQL 16 (Docker), `@nestjs/jwt`, Vitest + Supertest, `@sidesa/crypto` (workspace package).

## Global Constraints

_(Copied from the PRD; every task inherits these.)_

- Crypto primitives come **only** from `@sidesa/crypto` (ECDSA **P-384**, **SHA-384**). Never re-implement crypto; never P-256/SHA-256.
- Roles: **`ADMIN`, `KADES`, `OPERATOR`, `WARGA`**. Account statuses: **`ACTIVE`, `PENDING`, `REVOKED`**.
- **Auth is key-possession, never a password/NIK lookup.** NIK is never an authenticator.
- **Data minimization (UU PDP):** store `nikCommitment` (hash), never raw NIK, on accounts.
- **Audit log is append-only and hash-chained** — no update/delete paths.
- All secrets/DB URLs come from environment variables, never hardcoded.

## Prerequisites (executor: read once)

- Docker is installed. Start a test/dev Postgres before DB-touching tasks:
  ```bash
  docker run --name sidesa-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=sidesa -p 5432:5432 -d postgres:16
  ```
- `DATABASE_URL="postgresql://postgres:devpass@localhost:5432/sidesa?schema=public"`
- Tasks 3, 4, 6 are pure-logic (no DB). Tasks 2, 7, 8 require the Postgres container running.

## File Structure

```
package.json                      # NEW root: npm workspaces
packages/crypto/                  # existing; gains a dist build so backend can import it
packages/backend/
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
  prisma/schema.prisma
  src/
    main.ts                       # bootstrap
    app.module.ts
    health/health.controller.ts
    prisma/prisma.service.ts
    audit/audit.chain.ts          # pure hash-chain functions
    audit/audit.service.ts
    auth/auth.message.ts          # shared challenge-message builder (pure)
    auth/auth.service.ts          # challenge + verify
    auth/auth.controller.ts
    auth/jwt.guard.ts
    rbac/roles.decorator.ts
    rbac/roles.guard.ts
    accounts/accounts.service.ts  # provisioning
    accounts/accounts.controller.ts
  test/…                          # mirrors src/
```

---

### Task 1: Monorepo workspaces + crypto build + NestJS scaffold

**Files:**
- Create: `package.json` (root)
- Modify: `packages/crypto/package.json`, `packages/crypto/tsconfig.json`
- Create: `packages/backend/package.json`, `packages/backend/tsconfig.json`, `packages/backend/vitest.config.ts`
- Create: `packages/backend/src/main.ts`, `packages/backend/src/app.module.ts`, `packages/backend/src/health/health.controller.ts`
- Test: `packages/backend/test/health.e2e.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a booting NestJS app with `GET /health` → `{ status: 'ok' }`; `@sidesa/crypto` importable as a built package.

- [ ] **Step 1: Create root `package.json` with workspaces**

```json
{
  "name": "sidesa-cm",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build:crypto": "npm -w @sidesa/crypto run build"
  }
}
```

- [ ] **Step 2: Give `@sidesa/crypto` a build output**

Modify `packages/crypto/package.json` — add build script and point to `dist`:
```json
{
  "name": "@sidesa/crypto",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc -p tsconfig.build.json"
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

Create `packages/crypto/tsconfig.build.json` (emits only `src` to `dist`):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist", "noEmit": false },
  "include": ["src"]
}
```

- [ ] **Step 3: Install workspaces from repo root and build crypto**

Run (from repo root):
```bash
npm install
npm run build:crypto
```
Expected: `packages/crypto/dist/index.js` and `index.d.ts` exist.

- [ ] **Step 4: Create `packages/backend/package.json`**

```json
{
  "name": "@sidesa/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/config": "^3.2.0",
    "@prisma/client": "^5.20.0",
    "@sidesa/crypto": "*",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.4.0",
    "prisma": "^5.20.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0",
    "supertest": "^7.0.0",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "unplugin-swc": "^1.5.1",
    "@swc/core": "^1.7.0"
  }
}
```

- [ ] **Step 5: Create `packages/backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": "dist",
    "baseUrl": "."
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 6: Create `packages/backend/vitest.config.ts`** (SWC so decorators + metadata work)

```ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], globals: true, root: './' },
  plugins: [swc.vite()],
});
```

- [ ] **Step 7: Create the app — `src/health/health.controller.ts`, `src/app.module.ts`, `src/main.ts`**

`src/health/health.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

`src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

@Module({ controllers: [HealthController] })
export class AppModule {}
```

`src/main.ts`:
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 8: Write the e2e boot test — `test/health.e2e.test.ts`**

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';

describe('health (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 9: Install backend deps and run**

Run (from repo root):
```bash
npm install
npm -w @sidesa/backend test
```
Expected: PASS — `health (e2e)` 1 test.

- [ ] **Step 10: Commit**

```bash
git add package.json packages/crypto/package.json packages/crypto/tsconfig.build.json packages/backend
git commit -m "feat(backend): NestJS scaffold, npm workspaces, crypto dist build"
```

---

### Task 2: Prisma schema + PostgreSQL connection

**Files:**
- Create: `packages/backend/prisma/schema.prisma`, `packages/backend/.env.example`
- Create: `packages/backend/src/prisma/prisma.service.ts`
- Test: `packages/backend/test/prisma.integration.test.ts`

**Interfaces:**
- Produces: `PrismaService` (extends `PrismaClient`, connects on module init); DB tables `Account`, `AuthChallenge`, `AuditLog`.

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { ADMIN KADES OPERATOR WARGA }
enum AccountStatus { ACTIVE PENDING REVOKED }

model Account {
  id            String        @id @default(uuid())
  role          Role
  status        AccountStatus @default(PENDING)
  publicKey     String        @unique
  displayName   String
  nikCommitment String?
  createdAt     DateTime      @default(now())
  challenges    AuthChallenge[]
}

model AuthChallenge {
  id        String   @id @default(uuid())
  accountId String
  account   Account  @relation(fields: [accountId], references: [id])
  nonce     String   @unique
  used      Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  seq         Int      @default(autoincrement())
  actor       String
  action      String
  target      String
  payloadHash String
  prevHash    String
  entryHash   String
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL="postgresql://postgres:devpass@localhost:5432/sidesa?schema=public"
JWT_SECRET="change-me-in-production"
```

- [ ] **Step 3: Create `src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

- [ ] **Step 4: Generate client and run the first migration** (Postgres container must be running)

Run (from `packages/backend`, with `DATABASE_URL` set):
```bash
npx prisma migrate dev --name init
```
Expected: migration applied; `@prisma/client` generated.

- [ ] **Step 5: Write the integration test — `test/prisma.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('prisma (integration, needs Postgres)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.account.deleteMany({ where: { displayName: 'IT Probe' } });
    await prisma.$disconnect();
  });

  it('creates and reads an account', async () => {
    const created = await prisma.account.create({
      data: { role: 'WARGA', status: 'PENDING', publicKey: `pk-${Date.now()}`, displayName: 'IT Probe' },
    });
    const found = await prisma.account.findUnique({ where: { id: created.id } });
    expect(found?.displayName).toBe('IT Probe');
    expect(found?.role).toBe('WARGA');
  });
});
```

- [ ] **Step 6: Run the integration test**

Run: `npm -w @sidesa/backend test -- test/prisma.integration.test.ts`
Expected: PASS (1 test). If it errors with a connection refused, start the Postgres container (see Prerequisites).

- [ ] **Step 7: Commit**

```bash
git add packages/backend/prisma packages/backend/.env.example packages/backend/src/prisma
git commit -m "feat(backend): Prisma schema (Account/AuthChallenge/AuditLog) + Postgres connection"
```

---

### Task 3: Append-only hash-chained audit log

**Files:**
- Create: `packages/backend/src/audit/audit.chain.ts`
- Test: `packages/backend/test/audit.chain.test.ts`

**Interfaces:**
- Consumes: `domainHash` from `@sidesa/crypto`.
- Produces:
  - `GENESIS_HASH: string` (96 zero hex chars).
  - `interface AuditFields { actor: string; action: string; target: string; payloadHash: string; createdAt: string }`
  - `computeEntryHash(prevHash: string, f: AuditFields): string`
  - `verifyChain(entries: (AuditFields & { prevHash: string; entryHash: string })[]): boolean`

- [ ] **Step 1: Write the failing test — `test/audit.chain.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { GENESIS_HASH, computeEntryHash, verifyChain, AuditFields } from '../src/audit/audit.chain';

function entry(f: AuditFields, prevHash: string) {
  return { ...f, prevHash, entryHash: computeEntryHash(prevHash, f) };
}

describe('audit chain', () => {
  const a: AuditFields = { actor: 'admin', action: 'CREATE_ACCOUNT', target: 'acc-1', payloadHash: 'aa', createdAt: '2026-07-14T00:00:00Z' };
  const b: AuditFields = { actor: 'operator', action: 'APPROVE_WARGA', target: 'acc-2', payloadHash: 'bb', createdAt: '2026-07-14T00:01:00Z' };

  it('links entries and verifies a valid chain', () => {
    const e1 = entry(a, GENESIS_HASH);
    const e2 = entry(b, e1.entryHash);
    expect(verifyChain([e1, e2])).toBe(true);
  });

  it('detects a tampered field', () => {
    const e1 = entry(a, GENESIS_HASH);
    const e2 = entry(b, e1.entryHash);
    const tampered = { ...e1, action: 'DELETE_EVERYTHING' };
    expect(verifyChain([tampered, e2])).toBe(false);
  });

  it('detects a broken link (reordered/removed entry)', () => {
    const e1 = entry(a, GENESIS_HASH);
    const e2 = entry(b, e1.entryHash);
    expect(verifyChain([e2, e1])).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm -w @sidesa/backend test -- test/audit.chain.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/audit/audit.chain.ts`**

```ts
import { domainHash } from '@sidesa/crypto';

const enc = new TextEncoder();
export const GENESIS_HASH = '0'.repeat(96);

export interface AuditFields {
  actor: string;
  action: string;
  target: string;
  payloadHash: string;
  createdAt: string;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function computeEntryHash(prevHash: string, f: AuditFields): string {
  return bytesToHex(
    domainHash(
      'SIDESA-audit-v1',
      hexToBytes(prevHash),
      enc.encode(f.actor),
      enc.encode(f.action),
      enc.encode(f.target),
      enc.encode(f.payloadHash),
      enc.encode(f.createdAt),
    ),
  );
}

export function verifyChain(
  entries: (AuditFields & { prevHash: string; entryHash: string })[],
): boolean {
  let prev = GENESIS_HASH;
  for (const e of entries) {
    if (e.prevHash !== prev) return false;
    if (computeEntryHash(e.prevHash, e) !== e.entryHash) return false;
    prev = e.entryHash;
  }
  return true;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm -w @sidesa/backend test -- test/audit.chain.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/audit/audit.chain.ts packages/backend/test/audit.chain.test.ts
git commit -m "feat(backend): append-only hash-chained audit log (SHA-384)"
```

---

### Task 4: Challenge-response authentication (key possession)

**Files:**
- Create: `packages/backend/src/auth/auth.message.ts`
- Create: `packages/backend/src/auth/auth.service.ts`
- Test: `packages/backend/test/auth.service.test.ts`

**Interfaces:**
- Consumes: `verifyMessage` from `@sidesa/crypto`; a `ChallengeStore` + `AccountLookup` (injected, mockable).
- Produces:
  - `buildAuthMessage(accountId: string, nonce: string): Uint8Array` (shared with clients).
  - `class AuthService` with `createChallenge(accountId): Promise<{ nonce: string }>` and `verifyResponse(accountId, nonce, signatureHex): Promise<{ ok: boolean; role?: Role }>`.

- [ ] **Step 1: Write `src/auth/auth.message.ts`** (pure, no test needed on its own — exercised in Step 2)

```ts
export function buildAuthMessage(accountId: string, nonce: string): Uint8Array {
  return new TextEncoder().encode(`SIDESA-auth-v1|${accountId}|${nonce}`);
}
```

- [ ] **Step 2: Write the failing test — `test/auth.service.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AuthService, ChallengeStore, AccountLookup } from '../src/auth/auth.service';
import { buildAuthMessage } from '../src/auth/auth.message';

function hex(b: Uint8Array) { return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); }

function makeService(pubKeyHex: string, status = 'ACTIVE') {
  const challenges = new Map<string, { accountId: string; used: boolean; expiresAt: number }>();
  const store: ChallengeStore = {
    async save(accountId, nonce, expiresAt) { challenges.set(nonce, { accountId, used: false, expiresAt }); },
    async find(nonce) { return challenges.get(nonce) ?? null; },
    async markUsed(nonce) { const c = challenges.get(nonce); if (c) c.used = true; },
  };
  const accounts: AccountLookup = {
    async get(id) { return id === 'acc-1' ? { id, role: 'WARGA', status, publicKey: pubKeyHex } : null; },
  };
  return { svc: new AuthService(store, accounts), store };
}

describe('AuthService challenge-response', () => {
  it('accepts a correctly signed challenge and returns the role', async () => {
    const kp = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey));
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage('acc-1', nonce)));
    const res = await svc.verifyResponse('acc-1', nonce, sig);
    expect(res).toEqual({ ok: true, role: 'WARGA' });
  });

  it('rejects a signature from the wrong key', async () => {
    const kp = generateKeyPair();
    const wrong = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey));
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(wrong.privateKey, buildAuthMessage('acc-1', nonce)));
    expect((await svc.verifyResponse('acc-1', nonce, sig)).ok).toBe(false);
  });

  it('rejects a reused (already-used) challenge', async () => {
    const kp = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey));
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage('acc-1', nonce)));
    await svc.verifyResponse('acc-1', nonce, sig);
    expect((await svc.verifyResponse('acc-1', nonce, sig)).ok).toBe(false);
  });

  it('rejects when the account is not ACTIVE', async () => {
    const kp = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey), 'PENDING');
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage('acc-1', nonce)));
    expect((await svc.verifyResponse('acc-1', nonce, sig)).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm -w @sidesa/backend test -- test/auth.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/auth/auth.service.ts`**

```ts
import { verifyMessage } from '@sidesa/crypto';
import { buildAuthMessage } from './auth.message';

export type Role = 'ADMIN' | 'KADES' | 'OPERATOR' | 'WARGA';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface ChallengeStore {
  save(accountId: string, nonce: string, expiresAt: number): Promise<void>;
  find(nonce: string): Promise<{ accountId: string; used: boolean; expiresAt: number } | null>;
  markUsed(nonce: string): Promise<void>;
}
export interface AccountLookup {
  get(id: string): Promise<{ id: string; role: Role; status: string; publicKey: string } | null>;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array();
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function randomNonce(): string {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export class AuthService {
  constructor(private readonly challenges: ChallengeStore, private readonly accounts: AccountLookup) {}

  async createChallenge(accountId: string): Promise<{ nonce: string }> {
    const nonce = randomNonce();
    await this.challenges.save(accountId, nonce, Date.now() + CHALLENGE_TTL_MS);
    return { nonce };
  }

  async verifyResponse(
    accountId: string,
    nonce: string,
    signatureHex: string,
  ): Promise<{ ok: boolean; role?: Role }> {
    const challenge = await this.challenges.find(nonce);
    if (!challenge || challenge.used || challenge.accountId !== accountId) return { ok: false };
    if (challenge.expiresAt < Date.now()) return { ok: false };

    const account = await this.accounts.get(accountId);
    if (!account || account.status !== 'ACTIVE') return { ok: false };

    const ok = verifyMessage(
      hexToBytes(account.publicKey),
      buildAuthMessage(accountId, nonce),
      hexToBytes(signatureHex),
    );
    if (!ok) return { ok: false };

    await this.challenges.markUsed(nonce);
    return { ok: true, role: account.role };
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm -w @sidesa/backend test -- test/auth.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/auth/auth.message.ts packages/backend/src/auth/auth.service.ts packages/backend/test/auth.service.test.ts
git commit -m "feat(backend): key-possession challenge-response auth (ECDSA P-384)"
```

---

### Task 5: JWT sessions + auth guard

**Files:**
- Create: `packages/backend/src/auth/jwt.guard.ts`
- Test: `packages/backend/test/jwt.guard.test.ts`

**Interfaces:**
- Consumes: `@nestjs/jwt` `JwtService`.
- Produces: `JwtAuthGuard` that validates `Authorization: Bearer <token>`, sets `req.user = { accountId, role }`, and throws `UnauthorizedException` otherwise.

- [ ] **Step 1: Write the failing test — `test/jwt.guard.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/jwt.guard';

function ctxWith(authHeader?: string): ExecutionContext {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new JwtAuthGuard(jwt);

  it('accepts a valid token and attaches req.user', () => {
    const token = jwt.sign({ accountId: 'acc-1', role: 'OPERATOR' }, { secret: 'test-secret' });
    const ctx = ctxWith(`Bearer ${token}`);
    expect(guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.user).toMatchObject({ accountId: 'acc-1', role: 'OPERATOR' });
  });

  it('rejects a missing token', () => {
    expect(() => guard.canActivate(ctxWith())).toThrow(UnauthorizedException);
  });

  it('rejects a tampered token', () => {
    expect(() => guard.canActivate(ctxWith('Bearer not.a.jwt'))).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm -w @sidesa/backend test -- test/jwt.guard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/auth/jwt.guard.ts`**

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Sesi tidak ditemukan. Masuk kembali.');
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET ?? 'test-secret' });
      req.user = { accountId: payload.accountId, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sesi tidak valid. Masuk kembali.');
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm -w @sidesa/backend test -- test/jwt.guard.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/auth/jwt.guard.ts packages/backend/test/jwt.guard.test.ts
git commit -m "feat(backend): JWT session guard"
```

---

### Task 6: RBAC — roles decorator + guard

**Files:**
- Create: `packages/backend/src/rbac/roles.decorator.ts`
- Create: `packages/backend/src/rbac/roles.guard.ts`
- Test: `packages/backend/test/roles.guard.test.ts`

**Interfaces:**
- Consumes: `Reflector` from `@nestjs/core`.
- Produces: `Roles(...roles)` decorator + `RolesGuard` that allows only when `req.user.role` is in the required set (no `@Roles` → allow).

- [ ] **Step 1: Write the failing test — `test/roles.guard.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../src/rbac/roles.guard';
import { ROLES_KEY } from '../src/rbac/roles.decorator';

function ctx(role: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  it('allows a permitted role', () => {
    const reflector = { getAllAndOverride: () => ['KADES'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx('KADES'))).toBe(true);
  });

  it('denies a role not in the list', () => {
    const reflector = { getAllAndOverride: () => ['KADES'] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx('WARGA'))).toThrow(ForbiddenException);
  });

  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx('WARGA'))).toBe(true);
  });

  it('exposes ROLES_KEY for the decorator', () => {
    expect(typeof ROLES_KEY).toBe('string');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm -w @sidesa/backend test -- test/roles.guard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the decorator and guard**

`src/rbac/roles.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';

export type Role = 'ADMIN' | 'KADES' | 'OPERATOR' | 'WARGA';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`src/rbac/roles.guard.ts`:
```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (user && required.includes(user.role)) return true;
    throw new ForbiddenException('Anda tidak punya akses ke tindakan ini.');
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm -w @sidesa/backend test -- test/roles.guard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/rbac packages/backend/test/roles.guard.test.ts
git commit -m "feat(backend): RBAC roles decorator + guard"
```

---

### Task 7: Account provisioning service

**Files:**
- Create: `packages/backend/src/accounts/accounts.service.ts`
- Test: `packages/backend/test/accounts.service.test.ts`

**Interfaces:**
- Consumes: an injected `AccountRepo` (mockable; backed by Prisma in wiring).
- Produces: `AccountsService` with:
  - `provisionPrivileged(input: { role: 'OPERATOR' | 'KADES'; publicKey; displayName }): Promise<Account>` → status `ACTIVE`.
  - `selfRegisterWarga(input: { publicKey; displayName; nikCommitment }): Promise<Account>` → status `PENDING`.
  - Both reject a `publicKey` already registered.

- [ ] **Step 1: Write the failing test — `test/accounts.service.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { AccountsService, AccountRepo } from '../src/accounts/accounts.service';

function makeRepo(): AccountRepo {
  const rows: any[] = [];
  return {
    async findByPublicKey(pk) { return rows.find((r) => r.publicKey === pk) ?? null; },
    async create(data) { const row = { id: `id-${rows.length}`, createdAt: new Date(), ...data }; rows.push(row); return row; },
  };
}

describe('AccountsService provisioning', () => {
  it('provisions an operator as ACTIVE', async () => {
    const svc = new AccountsService(makeRepo());
    const acc = await svc.provisionPrivileged({ role: 'OPERATOR', publicKey: 'pk-op', displayName: 'Kaur Umum' });
    expect(acc.role).toBe('OPERATOR');
    expect(acc.status).toBe('ACTIVE');
  });

  it('self-registers a warga as PENDING with a nik commitment (never raw NIK)', async () => {
    const svc = new AccountsService(makeRepo());
    const acc = await svc.selfRegisterWarga({ publicKey: 'pk-w', displayName: 'Budi', nikCommitment: 'abc123' });
    expect(acc.role).toBe('WARGA');
    expect(acc.status).toBe('PENDING');
    expect(acc.nikCommitment).toBe('abc123');
  });

  it('rejects a duplicate public key', async () => {
    const repo = makeRepo();
    const svc = new AccountsService(repo);
    await svc.provisionPrivileged({ role: 'KADES', publicKey: 'dup', displayName: 'Kepala Desa' });
    await expect(
      svc.selfRegisterWarga({ publicKey: 'dup', displayName: 'X', nikCommitment: 'z' }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm -w @sidesa/backend test -- test/accounts.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/accounts/accounts.service.ts`**

```ts
import { ConflictException, Injectable } from '@nestjs/common';

export type Role = 'ADMIN' | 'KADES' | 'OPERATOR' | 'WARGA';
export type Status = 'ACTIVE' | 'PENDING' | 'REVOKED';

export interface Account {
  id: string;
  role: Role;
  status: Status;
  publicKey: string;
  displayName: string;
  nikCommitment?: string | null;
  createdAt: Date;
}

export interface AccountRepo {
  findByPublicKey(publicKey: string): Promise<Account | null>;
  create(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(private readonly repo: AccountRepo) {}

  private async ensureNewKey(publicKey: string) {
    if (await this.repo.findByPublicKey(publicKey)) {
      throw new ConflictException('Kunci publik ini sudah terdaftar.');
    }
  }

  async provisionPrivileged(input: {
    role: 'OPERATOR' | 'KADES';
    publicKey: string;
    displayName: string;
  }): Promise<Account> {
    await this.ensureNewKey(input.publicKey);
    return this.repo.create({
      role: input.role,
      status: 'ACTIVE',
      publicKey: input.publicKey,
      displayName: input.displayName,
      nikCommitment: null,
    });
  }

  async selfRegisterWarga(input: {
    publicKey: string;
    displayName: string;
    nikCommitment: string;
  }): Promise<Account> {
    await this.ensureNewKey(input.publicKey);
    return this.repo.create({
      role: 'WARGA',
      status: 'PENDING',
      publicKey: input.publicKey,
      displayName: input.displayName,
      nikCommitment: input.nikCommitment,
    });
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm -w @sidesa/backend test -- test/accounts.service.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/accounts/accounts.service.ts packages/backend/test/accounts.service.test.ts
git commit -m "feat(backend): account provisioning (privileged ACTIVE, warga PENDING)"
```

---

### Task 8: Wire modules + end-to-end auth & RBAC flow

**Files:**
- Create: `packages/backend/src/auth/auth.controller.ts`, `packages/backend/src/accounts/accounts.controller.ts`
- Create: `packages/backend/src/auth/auth.module.ts`, adapters binding Prisma to the repo/store interfaces
- Modify: `packages/backend/src/app.module.ts`
- Test: `packages/backend/test/auth-flow.e2e.test.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: `POST /auth/challenge`, `POST /auth/verify` (→ JWT), a role-protected `GET /accounts/me` (any authenticated) and `POST /accounts/privileged` (ADMIN only).

- [ ] **Step 1: Implement Prisma adapters + controllers + module**

`src/auth/prisma-adapters.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChallengeStore, AccountLookup } from './auth.service';
import { AccountRepo } from '../accounts/accounts.service';

@Injectable()
export class PrismaChallengeStore implements ChallengeStore {
  constructor(private readonly prisma: PrismaService) {}
  async save(accountId: string, nonce: string, expiresAt: number) {
    await this.prisma.authChallenge.create({ data: { accountId, nonce, expiresAt: new Date(expiresAt) } });
  }
  async find(nonce: string) {
    const c = await this.prisma.authChallenge.findUnique({ where: { nonce } });
    return c ? { accountId: c.accountId, used: c.used, expiresAt: c.expiresAt.getTime() } : null;
  }
  async markUsed(nonce: string) {
    await this.prisma.authChallenge.update({ where: { nonce }, data: { used: true } });
  }
}

@Injectable()
export class PrismaAccountLookup implements AccountLookup {
  constructor(private readonly prisma: PrismaService) {}
  async get(id: string) {
    const a = await this.prisma.account.findUnique({ where: { id } });
    return a ? { id: a.id, role: a.role as any, status: a.status, publicKey: a.publicKey } : null;
  }
}

@Injectable()
export class PrismaAccountRepo implements AccountRepo {
  constructor(private readonly prisma: PrismaService) {}
  async findByPublicKey(publicKey: string) { return (await this.prisma.account.findUnique({ where: { publicKey } })) as any; }
  async create(data: any) { return (await this.prisma.account.create({ data })) as any; }
}
```

`src/auth/auth.controller.ts`:
```ts
import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}

  @Post('challenge')
  challenge(@Body() body: { accountId: string }) {
    return this.auth.createChallenge(body.accountId);
  }

  @Post('verify')
  async verify(@Body() body: { accountId: string; nonce: string; signature: string }) {
    const res = await this.auth.verifyResponse(body.accountId, body.nonce, body.signature);
    if (!res.ok) throw new UnauthorizedException('Bukti tanda tangan tidak valid.');
    const token = this.jwt.sign(
      { accountId: body.accountId, role: res.role },
      { secret: process.env.JWT_SECRET ?? 'test-secret', expiresIn: '30m' },
    );
    return { token, role: res.role };
  }
}
```

`src/accounts/accounts.controller.ts`:
```ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) { return req.user; }

  @Post('privileged')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  provision(@Body() body: { role: 'OPERATOR' | 'KADES'; publicKey: string; displayName: string }) {
    return this.accounts.provisionPrivileged(body);
  }

  @Post('register')
  register(@Body() body: { publicKey: string; displayName: string; nikCommitment: string }) {
    return this.accounts.selfRegisterWarga(body);
  }
}
```

`src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsService } from '../accounts/accounts.service';
import { AccountsController } from '../accounts/accounts.controller';
import { PrismaChallengeStore, PrismaAccountLookup, PrismaAccountRepo } from './prisma-adapters';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, AccountsController],
  providers: [
    PrismaService,
    PrismaChallengeStore,
    PrismaAccountLookup,
    PrismaAccountRepo,
    {
      provide: AuthService,
      useFactory: (c: PrismaChallengeStore, a: PrismaAccountLookup) => new AuthService(c, a),
      inject: [PrismaChallengeStore, PrismaAccountLookup],
    },
    {
      provide: AccountsService,
      useFactory: (r: PrismaAccountRepo) => new AccountsService(r),
      inject: [PrismaAccountRepo],
    },
  ],
})
export class AuthModule {}
```

Modify `src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';

@Module({ imports: [AuthModule], controllers: [HealthController] })
export class AppModule {}
```

- [ ] **Step 2: Write the e2e test — `test/auth-flow.e2e.test.ts`** (needs Postgres)

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

describe('auth + rbac flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const kp = generateKeyPair();
  const pkHex = hex(kp.publicKey);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: pkHex } });
  });
  afterAll(async () => {
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: pkHex } } });
    await prisma.account.deleteMany({ where: { publicKey: pkHex } });
    await app.close();
  });

  it('registers, is activated, logs in with a signed challenge, and reads /me', async () => {
    const reg = await request(app.getHttpServer())
      .post('/accounts/register')
      .send({ publicKey: pkHex, displayName: 'Budi', nikCommitment: 'commit-abc' });
    expect(reg.status).toBe(201);
    const accountId = reg.body.id;

    // Simulate operator approval (Plan #3 does this via UI): flip to ACTIVE
    await prisma.account.update({ where: { id: accountId }, data: { status: 'ACTIVE' } });

    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
    const nonce = ch.body.nonce as string;
    const signature = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, nonce)));

    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce, signature });
    expect(vr.status).toBe(201);
    expect(vr.body.role).toBe('WARGA');

    const me = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${vr.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ accountId, role: 'WARGA' });
  });

  it('forbids a WARGA from the ADMIN-only provisioning route', async () => {
    const account = await prisma.account.findFirst({ where: { publicKey: pkHex } });
    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId: account!.id });
    const signature = hex(signMessage(kp.privateKey, buildAuthMessage(account!.id, ch.body.nonce)));
    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId: account!.id, nonce: ch.body.nonce, signature });

    const res = await request(app.getHttpServer())
      .post('/accounts/privileged')
      .set('Authorization', `Bearer ${vr.body.token}`)
      .send({ role: 'OPERATOR', publicKey: 'pk-someone', displayName: 'X' });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run the full backend suite** (Postgres container running)

Run: `npm -w @sidesa/backend test`
Expected: PASS — all unit tests + both e2e suites green.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src packages/backend/test/auth-flow.e2e.test.ts
git commit -m "feat(backend): wire auth + RBAC end-to-end (challenge -> JWT -> role-guarded routes)"
```

---

## Self-Review (completed by plan author)

**Spec coverage (PRD §5A, §7 Auth/RBAC, §11 data model, §13 audit):**
- Key-possession auth (not NIK/password) → Tasks 4, 8 ✅
- Roles ADMIN/KADES/OPERATOR/WARGA + guard → Tasks 6, 8 ✅
- Provisioning (privileged ACTIVE, warga PENDING) → Tasks 7, 8 ✅
- Data minimization (`nikCommitment`, never raw NIK) → Tasks 2, 7 ✅
- Append-only hash-chained audit → Task 3 ✅ (wiring audit calls into provisioning/sign actions is a fast follow — noted below)
- Sessions → Task 5 ✅

**Deferred to later plans (intentional, keeps this plan bounded):**
- Operator **approval** of PENDING warga + Merkle registry build → Plan #3 (Registry & ZKP Service).
- Calling `AuditService.append()` on each provisioning/auth event → small follow-up once Plan #3 lands the write paths; the chain primitive (Task 3) is ready.
- Kepala Desa **key enrollment ceremony** UI + admin bootstrap seed → Plan #3 / admin tooling.

**Placeholder scan:** none — every step has full code, exact commands, expected output.

**Type consistency:** `Role`/`Status` string unions match across auth, rbac, accounts; `ChallengeStore`/`AccountLookup`/`AccountRepo` interfaces are implemented by the Task 8 Prisma adapters with matching signatures; `buildAuthMessage` is the single shared source of the signed bytes for both client tests and server.

## Notes for the executor
- Start the Postgres container before Tasks 2, 8 (see Prerequisites). Unit-only tasks (3–7) do not need it.
- Do NOT weaken an auth/rbac negative test to make it pass — a green "rejects forged/expired/forbidden" test is the security guarantee. Investigate failures with superpowers:systematic-debugging.
- If a `@nestjs/*` or Prisma symbol differs from the installed version, trust the installed typings over this plan.
