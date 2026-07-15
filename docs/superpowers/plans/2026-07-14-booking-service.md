# Booking Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appointment booking with the Kepala Desa: a warga requests a slot for a purpose, the Kepala Desa confirms (or reschedules/cancels), and the operator checks the warga in via a QR token on the day.

**Architecture:** A `Booking` moves `REQUESTED → CONFIRMED → CHECKED_IN` (or `CANCELLED`). Confirmation binds a `confirmedSlot` and refuses a double-booking (no other active booking at the same slot). A random `checkinToken` (QR) marks attendance. Reuses Plan #2 auth/RBAC; no new crypto.

**Tech Stack:** NestJS + Prisma + Postgres, Vitest + Supertest.

## Global Constraints

- Role gates: create = `WARGA`; confirm = `KADES`; cancel = `OPERATOR`/`KADES`; queue = `OPERATOR`/`KADES`; check-in = `OPERATOR`.
- A slot cannot hold two active (`CONFIRMED`/`CHECKED_IN`) bookings.
- Check-in only succeeds for a `CONFIRMED` booking.

## Prerequisites

- Postgres running (`docker start sidesa-pg`), `DATABASE_URL` set.

## File Structure

```
packages/backend/src/booking/
  booking.service.ts
  booking.controller.ts
  booking.module.ts
packages/backend/prisma/schema.prisma   # + Booking, BookingStatus
```

---

### Task 1: DB schema — Booking

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`
- Migration: `packages/backend/prisma/migrations/20260714170000_booking/migration.sql`
- Test: `packages/backend/test/booking.schema.integration.test.ts`

- [ ] **Step 1: Append to `schema.prisma`**

```prisma
enum BookingStatus {
  REQUESTED
  CONFIRMED
  CANCELLED
  CHECKED_IN
}

model Booking {
  id             String        @id @default(uuid())
  wargaAccountId String
  purpose        String
  requestedSlot  DateTime
  confirmedSlot  DateTime?
  status         BookingStatus @default(REQUESTED)
  checkinToken   String        @unique
  createdAt      DateTime      @default(now())
}
```

- [ ] **Step 2: Generate + apply migration** (Postgres running; from `packages/backend`)
```bash
npx prisma migrate diff --from-url "postgresql://postgres:devpass@localhost:5432/sidesa?schema=public" --to-schema-datamodel prisma/schema.prisma --script
```
Save the printed SQL to `prisma/migrations/20260714170000_booking/migration.sql`, then:
```bash
npx prisma migrate deploy && npx prisma generate
```

- [ ] **Step 3: Write `test/booking.schema.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('booking schema (integration)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { wargaAccountId: 'probe-b' } });
    await prisma.$disconnect();
  });

  it('stores a booking', async () => {
    const b = await prisma.booking.create({
      data: { wargaAccountId: 'probe-b', purpose: 'Konsultasi', requestedSlot: new Date('2026-08-01T09:00:00Z'), checkinToken: `t-${Date.now()}` },
    });
    const found = await prisma.booking.findUnique({ where: { id: b.id } });
    expect(found?.status).toBe('REQUESTED');
    expect(found?.purpose).toBe('Konsultasi');
  });
});
```

- [ ] **Step 4: Run — expect PASS (1 test)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/prisma packages/backend/test/booking.schema.integration.test.ts
git commit -m "feat(backend): schema for Booking (janji temu)"
```

---

### Task 2: BookingService

**Files:**
- Create: `packages/backend/src/booking/booking.service.ts`
- Test: `packages/backend/test/booking.service.integration.test.ts`

**Interfaces:**
- `create(wargaAccountId, purpose, requestedSlotIso): Promise<{ id: string; checkinToken: string }>`
- `listForWarga(wargaAccountId)` / `listQueue()`
- `confirm(bookingId, slotIso?): Promise<{ status: string; confirmedSlot: Date }>` — reschedules when `slotIso` given; rejects a slot conflict.
- `cancel(bookingId): Promise<{ status: string }>`
- `checkin(token): Promise<{ status: string }>` — only for `CONFIRMED`.

- [ ] **Step 1: Write `test/booking.service.integration.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingService } from '../src/booking/booking.service';

describe('BookingService (integration)', () => {
  const prisma = new PrismaService();
  const svc = new BookingService(prisma);
  const slot = '2026-08-15T10:00:00.000Z';

  beforeAll(async () => { await prisma.$connect(); await prisma.booking.deleteMany({ where: { wargaAccountId: { in: ['bw-1', 'bw-2'] } } }); });
  afterAll(async () => { await prisma.booking.deleteMany({ where: { wargaAccountId: { in: ['bw-1', 'bw-2'] } } }); await prisma.$disconnect(); });

  it('creates, confirms, and checks in a booking', async () => {
    const b = await svc.create('bw-1', 'Konsultasi lahan', slot);
    const conf = await svc.confirm(b.id);
    expect(conf.status).toBe('CONFIRMED');
    const ci = await svc.checkin(b.checkinToken);
    expect(ci.status).toBe('CHECKED_IN');
  });

  it('refuses a second booking confirmed at the same slot', async () => {
    const b2 = await svc.create('bw-2', 'Tanda tangan', slot);
    await expect(svc.confirm(b2.id)).rejects.toThrow();
  });

  it('does not check in a booking that is not confirmed', async () => {
    const b = await svc.create('bw-1', 'X', '2026-08-16T10:00:00.000Z');
    await expect(svc.checkin(b.checkinToken)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/booking/booking.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function randomToken(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(wargaAccountId: string, purpose: string, requestedSlotIso: string) {
    const checkinToken = randomToken();
    const b = await this.prisma.booking.create({
      data: { wargaAccountId, purpose, requestedSlot: new Date(requestedSlotIso), checkinToken },
    });
    return { id: b.id, checkinToken };
  }

  listForWarga(wargaAccountId: string) {
    return this.prisma.booking.findMany({ where: { wargaAccountId }, orderBy: { requestedSlot: 'asc' } });
  }

  listQueue() {
    return this.prisma.booking.findMany({ where: { status: 'REQUESTED' }, orderBy: { requestedSlot: 'asc' } });
  }

  async confirm(bookingId: string, slotIso?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Janji temu tidak ditemukan.');
    const slot = slotIso ? new Date(slotIso) : booking.requestedSlot;
    const clash = await this.prisma.booking.count({
      where: { confirmedSlot: slot, status: { in: ['CONFIRMED', 'CHECKED_IN'] }, NOT: { id: bookingId } },
    });
    if (clash > 0) throw new BadRequestException('Slot waktu itu sudah terisi.');
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', confirmedSlot: slot },
    });
    return { status: updated.status, confirmedSlot: updated.confirmedSlot! };
  }

  async cancel(bookingId: string) {
    const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
    return { status: updated.status };
  }

  async checkin(token: string) {
    const booking = await this.prisma.booking.findUnique({ where: { checkinToken: token } });
    if (!booking) throw new NotFoundException('Janji temu tidak ditemukan.');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Janji temu belum dikonfirmasi.');
    const updated = await this.prisma.booking.update({ where: { checkinToken: token }, data: { status: 'CHECKED_IN' } });
    return { status: updated.status };
  }
}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

- [ ] **Step 5: Commit**
```bash
git add packages/backend/src/booking/booking.service.ts packages/backend/test/booking.service.integration.test.ts
git commit -m "feat(backend): booking service (create/confirm/cancel/checkin + slot conflict)"
```

---

### Task 3: Controllers + module

**Files:**
- Create: `packages/backend/src/booking/booking.controller.ts`
- Create: `packages/backend/src/booking/booking.module.ts`
- Modify: `packages/backend/src/app.module.ts`
- Test: covered by the e2e in Task 4.

- [ ] **Step 1: Implement `src/booking/booking.controller.ts`**

```ts
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { BookingService } from './booking.service';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  create(@Req() req: any, @Body() body: { purpose: string; requestedSlot: string }) {
    return this.bookings.create(req.user.accountId, body.purpose, body.requestedSlot);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  mine(@Req() req: any) {
    return this.bookings.listForWarga(req.user.accountId);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR', 'KADES')
  queue() {
    return this.bookings.listQueue();
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  confirm(@Param('id') id: string, @Body() body: { slot?: string }) {
    return this.bookings.confirm(id, body?.slot);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR', 'KADES')
  cancel(@Param('id') id: string) {
    return this.bookings.cancel(id);
  }

  @Post('checkin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  checkin(@Body() body: { token: string }) {
    return this.bookings.checkin(body.token);
  }
}
```

- [ ] **Step 2: Implement `src/booking/booking.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [BookingController],
  providers: [PrismaService, BookingService],
})
export class BookingModule {}
```

- [ ] **Step 3: Add `BookingModule` to `src/app.module.ts`** imports array.

- [ ] **Step 4: Commit**
```bash
git add packages/backend/src/booking/booking.controller.ts packages/backend/src/booking/booking.module.ts packages/backend/src/app.module.ts
git commit -m "feat(backend): booking endpoints + module wiring"
```

---

### Task 4: End-to-end booking flow

**Files:**
- Test: `packages/backend/test/booking-flow.e2e.test.ts`

- [ ] **Step 1: Write `test/booking-flow.e2e.test.ts`**

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

async function login(app: INestApplication, kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
  const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
  const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce)));
  const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce: ch.body.nonce, signature: sig });
  return vr.body.token;
}

describe('Booking flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair(), kades = generateKeyPair(), warga = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  let opId = '', kaId = '', waId = '';
  const slot = '2026-09-01T09:00:00.000Z';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'KaDes' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: waPk, displayName: 'Budi' } })).id;
  });
  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { wargaAccountId: waId } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('warga books -> KaDes confirms -> operator checks in; warga cannot confirm', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    const waToken = await login(app, warga, waId);

    const created = await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ purpose: 'Konsultasi bantuan sosial', requestedSlot: slot }).expect(201);
    const { id, checkinToken } = created.body;

    // warga cannot confirm (KADES-only)
    await request(app.getHttpServer()).post(`/bookings/${id}/confirm`).set('Authorization', `Bearer ${waToken}`).send({}).expect(403);

    await request(app.getHttpServer()).post(`/bookings/${id}/confirm`).set('Authorization', `Bearer ${kaToken}`).send({}).expect(201);

    const ci = await request(app.getHttpServer()).post('/bookings/checkin')
      .set('Authorization', `Bearer ${opToken}`).send({ token: checkinToken }).expect(201);
    expect(ci.body.status).toBe('CHECKED_IN');
  });
});
```

- [ ] **Step 2: Run the full backend suite** (Postgres running): `npm -w @sidesa/backend test`
Expected: PASS — all prior suites + `booking-flow.e2e` green.

- [ ] **Step 3: Commit**
```bash
git add packages/backend/test/booking-flow.e2e.test.ts
git commit -m "test(backend): e2e booking flow (book -> confirm -> check-in, role gates)"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** booking lifecycle (Tasks 1–2) ✅; KaDes confirms + reschedule (Task 2) ✅; double-booking refused (Task 2) ✅; QR check-in (Tasks 2–3) ✅; role gates warga/kades/operator (Tasks 3–4) ✅; e2e (Task 4) ✅.

**Deferred:** notifications/reminders (FCM — mobile + a scheduler follow-up); KaDes-published availability windows (this plan takes the warga's requested slot and lets the KaDes accept/reschedule, which covers the core need); calendar UI (mobile).

**Placeholder scan:** none. **Type consistency:** `BookingStatus` values match across service and tests; controllers reuse the Plan #2 guards; check-in is operator-gated.

## Notes for the executor
- Migration via `migrate diff` + `migrate deploy` (interactive `migrate dev` is unavailable here).
- Do NOT weaken the negative tests (slot conflict, check-in-before-confirm, warga-cannot-confirm).
