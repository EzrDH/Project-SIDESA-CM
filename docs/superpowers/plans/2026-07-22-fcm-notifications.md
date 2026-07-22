# FCM Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver push notifications so warga, operator, and Kepala Desa learn of status changes (letters + bookings) without polling, with a backend abstraction that is fully testable before any Firebase credentials exist.

**Architecture:** Business services (`LetterService`, `BookingService`) emit domain events via `@nestjs/event-emitter`; a `NotificationsListener` turns each event into a minimal, privacy-preserving message and hands it to a `NotificationSender`. A `LoggingNotificationSender` is the default (dev/test); a `FcmNotificationSender` (firebase-admin) is selected only when `NOTIFICATIONS_DRIVER=fcm`. The Flutter app registers its FCM token through a `PushMessagingAdapter` that degrades to a no-op when Firebase is unavailable, so existing tests and the Android build stay intact until credentials are wired.

**Tech Stack:** NestJS 10, Prisma 5 + PostgreSQL, `@nestjs/event-emitter`, `firebase-admin` (backend); Flutter (Dart 3.12), `http` for the token endpoint, `firebase_messaging`/`firebase_core`/`flutter_local_notifications` deferred to the wiring task.

## Global Constraints

- Crypto compliance is unaffected here, but never weaken existing negative tests to make suites pass (project rule).
- Prisma migrations are **non-interactive**: never `prisma migrate dev`. Use `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script` → save to a new timestamped folder under `prisma/migrations/` → `prisma migrate deploy` → `prisma generate`.
- Backend tests import `@sidesa/crypto` from source via the vitest alias; DB-backed tests share one Postgres and run with `fileParallelism: false` (already configured).
- Notification payloads MUST NOT contain names, NIK, letter numbers, or letter content — only a generic body plus a `data` block of `{ type, refId, ts }`.
- Default driver is `log`. Real sending (`fcm`) is opt-in via env and is never exercised by automated tests.
- Secrets live only in `.env`; examples in `.env.example`. `google-services.json` and service-account keys are never committed.
- Conventional commits ending with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer. Commit after each task; push per project convention.

---

### Task 1: `DeviceToken` model + migration

**Files:**
- Modify: `packages/backend/prisma/schema.prisma` (append model)
- Create: `packages/backend/prisma/migrations/20260722HHMMSS_device_token/migration.sql`
- Test: `packages/backend/test/device-token.schema.integration.test.ts`

**Interfaces:**
- Produces: Prisma model `DeviceToken { id, accountId, token @unique, platform, createdAt, updatedAt }` and generated client accessor `prisma.deviceToken`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/test/device-token.schema.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DeviceToken schema (needs Postgres)', () => {
  const prisma = new PrismaService();
  const acc = 'acc-devtoken-test';
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.deviceToken.deleteMany({ where: { accountId: acc } });
  });
  afterAll(async () => {
    await prisma.deviceToken.deleteMany({ where: { accountId: acc } });
    await prisma.$disconnect();
  });

  it('stores a token uniquely and upserts on the token key', async () => {
    await prisma.deviceToken.create({ data: { accountId: acc, token: 'tok-1', platform: 'android' } });
    await expect(
      prisma.deviceToken.create({ data: { accountId: acc, token: 'tok-1', platform: 'android' } }),
    ).rejects.toThrow(); // unique(token)
    const rows = await prisma.deviceToken.findMany({ where: { accountId: acc } });
    expect(rows).toHaveLength(1);
    expect(rows[0].platform).toBe('android');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run db:up && npm -w @sidesa/backend run test -- device-token.schema`
Expected: FAIL — `prisma.deviceToken` is undefined (model not yet in client).

- [ ] **Step 3: Add the model to the schema**

Append to `packages/backend/prisma/schema.prisma`:

```prisma
model DeviceToken {
  id        String   @id @default(uuid())
  accountId String
  token     String   @unique
  platform  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([accountId])
}
```

- [ ] **Step 4: Generate the migration SQL (non-interactive) and apply it**

Run (from `packages/backend`, with `DATABASE_URL` set):

```bash
STAMP=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${STAMP}_device_token"
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "prisma/migrations/${STAMP}_device_token/migration.sql"
npx prisma migrate deploy
npx prisma generate
```

Expected: `migration.sql` contains `CREATE TABLE "DeviceToken"` with a unique index on `token`; `migrate deploy` reports the migration applied; `generate` succeeds.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm -w @sidesa/backend run test -- device-token.schema`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/prisma/schema.prisma packages/backend/prisma/migrations packages/backend/test/device-token.schema.integration.test.ts
git commit -m "feat(backend): DeviceToken model for FCM registration (Fase B)"
```

---

### Task 2: `NotificationSender` interface + `LoggingNotificationSender`

**Files:**
- Create: `packages/backend/src/notifications/notification-sender.ts`
- Create: `packages/backend/src/notifications/logging-notification-sender.ts`
- Test: `packages/backend/test/logging-notification-sender.test.ts`

**Interfaces:**
- Produces:
  - `interface NotificationMessage { title: string; body: string; data: Record<string, string>; }`
  - `interface SendResult { invalidTokens: string[]; }`
  - `abstract class NotificationSender { abstract send(tokens: string[], message: NotificationMessage): Promise<SendResult>; }`
  - `const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER')` (DI token)
  - `class LoggingNotificationSender extends NotificationSender` — records calls in a public `readonly sent: { tokens: string[]; message: NotificationMessage }[]` array for test assertions.

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/test/logging-notification-sender.test.ts
import { describe, it, expect } from 'vitest';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

describe('LoggingNotificationSender', () => {
  it('records the send and reports no invalid tokens', async () => {
    const s = new LoggingNotificationSender();
    const res = await s.send(['tok-a', 'tok-b'], { title: 'SIDESA-CM', body: 'Ada pembaruan.', data: { type: 'letter.signed', refId: 'r1', ts: '1' } });
    expect(res.invalidTokens).toEqual([]);
    expect(s.sent).toHaveLength(1);
    expect(s.sent[0].tokens).toEqual(['tok-a', 'tok-b']);
    expect(s.sent[0].message.data.type).toBe('letter.signed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm -w @sidesa/backend run test -- logging-notification-sender`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the interface and the logging sender**

```ts
// packages/backend/src/notifications/notification-sender.ts
export interface NotificationMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}
export interface SendResult {
  invalidTokens: string[];
}
export abstract class NotificationSender {
  abstract send(tokens: string[], message: NotificationMessage): Promise<SendResult>;
}
export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
```

```ts
// packages/backend/src/notifications/logging-notification-sender.ts
import { Logger } from '@nestjs/common';
import { NotificationMessage, NotificationSender, SendResult } from './notification-sender';

/** Default sender: records intent, sends nothing. Used in dev and all tests. */
export class LoggingNotificationSender extends NotificationSender {
  private readonly logger = new Logger('Notifications');
  readonly sent: { tokens: string[]; message: NotificationMessage }[] = [];

  async send(tokens: string[], message: NotificationMessage): Promise<SendResult> {
    this.sent.push({ tokens, message });
    this.logger.log(`notify type=${message.data.type} refId=${message.data.refId} tokens=${tokens.length} (log driver)`);
    return { invalidTokens: [] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm -w @sidesa/backend run test -- logging-notification-sender`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/notifications/notification-sender.ts packages/backend/src/notifications/logging-notification-sender.ts packages/backend/test/logging-notification-sender.test.ts
git commit -m "feat(backend): NotificationSender interface + logging sender"
```

---

### Task 3: `NotificationsService` — token registration

**Files:**
- Create: `packages/backend/src/notifications/notifications.service.ts`
- Test: `packages/backend/test/notifications.service.integration.test.ts`

**Interfaces:**
- Consumes: `PrismaService`, `NotificationSender` (via `NOTIFICATION_SENDER` token), `LoggingNotificationSender`.
- Produces (on `NotificationsService`):
  - `registerToken(accountId: string, token: string, platform: string): Promise<void>` — upsert on `token`.
  - `unregisterToken(token: string): Promise<void>` — delete if present.

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/test/notifications.service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

describe('NotificationsService token registration (needs Postgres)', () => {
  const prisma = new PrismaService();
  const svc = new NotificationsService(prisma, new LoggingNotificationSender());
  const acc = 'acc-notif-reg';
  beforeAll(async () => { await prisma.$connect(); await prisma.deviceToken.deleteMany({ where: { accountId: acc } }); });
  afterAll(async () => { await prisma.deviceToken.deleteMany({ where: { accountId: acc } }); await prisma.$disconnect(); });

  it('registers, re-registers idempotently, and unregisters', async () => {
    await svc.registerToken(acc, 'tok-x', 'android');
    await svc.registerToken(acc, 'tok-x', 'android'); // upsert, still one row
    let rows = await prisma.deviceToken.findMany({ where: { accountId: acc } });
    expect(rows).toHaveLength(1);

    await svc.unregisterToken('tok-x');
    rows = await prisma.deviceToken.findMany({ where: { accountId: acc } });
    expect(rows).toHaveLength(0);

    await svc.unregisterToken('tok-missing'); // no throw when absent
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm -w @sidesa/backend run test -- notifications.service`
Expected: FAIL — `NotificationsService` not found.

- [ ] **Step 3: Write the service (registration only for now)**

```ts
// packages/backend/src/notifications/notifications.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_SENDER, NotificationSender } from './notification-sender';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  async registerToken(accountId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { accountId, platform },
      create: { accountId, token, platform },
    });
  }

  async unregisterToken(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm -w @sidesa/backend run test -- notifications.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/notifications/notifications.service.ts packages/backend/test/notifications.service.integration.test.ts
git commit -m "feat(backend): NotificationsService token registration"
```

---

### Task 4: `NotificationsService.dispatch` — recipient resolution + minimal payload

**Files:**
- Modify: `packages/backend/src/notifications/notifications.service.ts`
- Create: `packages/backend/src/notifications/notification-events.ts`
- Test: `packages/backend/test/notifications.dispatch.integration.test.ts`

**Interfaces:**
- Produces:
  - `packages/backend/src/notifications/notification-events.ts`:
    ```ts
    export type NotificationType =
      | 'letter.submitted' | 'letter.drafted' | 'letter.signed' | 'letter.rejected'
      | 'booking.requested' | 'booking.confirmed' | 'booking.cancelled';
    export interface DomainEvent {
      type: NotificationType;
      refId: string;                 // letterRequestId or bookingId
      wargaAccountId?: string;       // owner, when the recipient is the warga
    }
    ```
  - On `NotificationsService`: `dispatch(event: DomainEvent): Promise<void>` — resolves recipients per the event→recipient table, gathers their tokens, builds the minimal message, calls `sender.send`, and prunes returned `invalidTokens`.
  - Recipient rules: `letter.submitted`/`booking.requested` → all `OPERATOR` `ACTIVE`; `letter.drafted` → the warga owner **and** all `KADES` `ACTIVE`; `letter.signed`/`letter.rejected`/`booking.confirmed`/`booking.cancelled` → the warga owner.

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/test/notifications.dispatch.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

const pk = (s: string) => '02' + s.padEnd(96, '0'); // dummy 49-byte-ish compressed hex, unique per test

describe('NotificationsService.dispatch (needs Postgres)', () => {
  const prisma = new PrismaService();
  const sender = new LoggingNotificationSender();
  const svc = new NotificationsService(prisma, sender);
  let warga = '', operator = '', kades = '';

  beforeAll(async () => {
    await prisma.$connect();
    warga = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: pk('warga-notif'), displayName: 'W' } })).id;
    operator = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: pk('op-notif'), displayName: 'O' } })).id;
    kades = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: pk('kades-notif'), displayName: 'K' } })).id;
    await svc.registerToken(warga, 'tok-warga', 'android');
    await svc.registerToken(operator, 'tok-op', 'android');
    await svc.registerToken(kades, 'tok-kades', 'android');
  });
  afterAll(async () => {
    const ids = [warga, operator, kades];
    await prisma.deviceToken.deleteMany({ where: { accountId: { in: ids } } });
    await prisma.account.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('routes letter.signed only to the warga owner with a PII-free payload', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'letter.signed', refId: 'req-1', wargaAccountId: warga });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].tokens).toEqual(['tok-warga']);
    const m = sender.sent[0].message;
    expect(m.data).toEqual({ type: 'letter.signed', refId: 'req-1', ts: expect.any(String) });
    // privacy: nothing but the generic strings
    expect(JSON.stringify(m)).not.toContain(warga);
    expect(m.body).not.toMatch(/\d{6,}/); // no long numbers / NIK / letter numbers
  });

  it('routes letter.submitted to every ACTIVE operator', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'letter.submitted', refId: 'req-2' });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].tokens).toEqual(['tok-op']);
  });

  it('routes letter.drafted to the warga owner and every ACTIVE kades', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'letter.drafted', refId: 'req-3', wargaAccountId: warga });
    const tokens = sender.sent[0].tokens.sort();
    expect(tokens).toEqual(['tok-kades', 'tok-warga']);
  });

  it('does not send and does not throw when there are no tokens', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'booking.confirmed', refId: 'b-1', wargaAccountId: 'nobody' });
    expect(sender.sent).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm -w @sidesa/backend run test -- notifications.dispatch`
Expected: FAIL — `dispatch` is not a function.

- [ ] **Step 3: Add events file and implement `dispatch`**

Create `packages/backend/src/notifications/notification-events.ts` with the `NotificationType`/`DomainEvent` definitions from the Interfaces block above.

Add to `NotificationsService` (import the new types + `NotificationMessage`):

```ts
// imports at top of notifications.service.ts
import { DomainEvent, NotificationType } from './notification-events';
import { NotificationMessage } from './notification-sender';

// generic, PII-free copy per audience
private message(event: DomainEvent): NotificationMessage {
  const forOfficer = event.type === 'letter.submitted' || event.type === 'booking.requested';
  const body = forOfficer ? 'Ada permohonan baru menunggu.' : 'Ada pembaruan pada permohonan Anda.';
  return { title: 'SIDESA-CM', body, data: { type: event.type, refId: event.refId, ts: Date.now().toString() } };
}

private async recipientIds(event: DomainEvent): Promise<string[]> {
  const officers = async (role: 'OPERATOR' | 'KADES') =>
    (await this.prisma.account.findMany({ where: { role, status: 'ACTIVE' }, select: { id: true } })).map((a) => a.id);
  switch (event.type) {
    case 'letter.submitted':
    case 'booking.requested':
      return officers('OPERATOR');
    case 'letter.drafted':
      return [...(event.wargaAccountId ? [event.wargaAccountId] : []), ...(await officers('KADES'))];
    default: // letter.signed | letter.rejected | booking.confirmed | booking.cancelled
      return event.wargaAccountId ? [event.wargaAccountId] : [];
  }
}

async dispatch(event: DomainEvent): Promise<void> {
  const accountIds = await this.recipientIds(event);
  if (accountIds.length === 0) return;
  const tokenRows = await this.prisma.deviceToken.findMany({ where: { accountId: { in: accountIds } }, select: { token: true } });
  const tokens = tokenRows.map((t) => t.token);
  if (tokens.length === 0) return;
  const { invalidTokens } = await this.sender.send(tokens, this.message(event));
  if (invalidTokens.length > 0) {
    await this.prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm -w @sidesa/backend run test -- notifications.dispatch`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/notifications/notification-events.ts packages/backend/src/notifications/notifications.service.ts packages/backend/test/notifications.dispatch.integration.test.ts
git commit -m "feat(backend): dispatch resolves recipients + minimal payloads"
```

---

### Task 5: `NotificationsModule` + token endpoints

**Files:**
- Create: `packages/backend/src/notifications/notifications.dto.ts`
- Create: `packages/backend/src/notifications/notifications.controller.ts`
- Create: `packages/backend/src/notifications/notifications.module.ts`
- Modify: `packages/backend/src/app.module.ts` (import `NotificationsModule`)
- Test: `packages/backend/test/notifications-token.e2e.test.ts`

**Interfaces:**
- Consumes: `NotificationsService`; `JwtAuthGuard` from `packages/backend/src/auth/jwt.guard.ts` (sets `req.user = { accountId, role }`); the caller's account is read via `@Req() req: any` → `req.user.accountId`, exactly as `enroll.controller.ts` does.
- Produces: `NotificationsModule` (provides `NotificationsService`, binds `NOTIFICATION_SENDER` → `LoggingNotificationSender` for now, exports `NotificationsService`); routes `POST /notifications/token` and `DELETE /notifications/token`.

- [ ] **Step 1: Write the failing e2e test**

```ts
// packages/backend/test/notifications-token.e2e.test.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('Notifications token endpoints (e2e, needs Postgres)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const kp = generateKeyPair(); const pk = hex(kp.publicKey); let accId = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: pk } });
    accId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: pk, displayName: 'W' } })).id;
  });
  afterAll(async () => {
    await prisma.deviceToken.deleteMany({ where: { accountId: accId } });
    await prisma.authChallenge.deleteMany({ where: { accountId: accId } });
    await prisma.account.deleteMany({ where: { id: accId } });
    await app.close();
  });

  async function login(): Promise<string> {
    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId: accId });
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accId, ch.body.nonce)));
    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId: accId, nonce: ch.body.nonce, signature: sig });
    return vr.body.token;
  }

  it('registers and unregisters the caller token; rejects an anonymous call', async () => {
    const token = await login();
    await request(app.getHttpServer()).post('/notifications/token').send({ token: 'fcm-tok-1', platform: 'android' }).expect(401);

    await request(app.getHttpServer())
      .post('/notifications/token').set('authorization', `Bearer ${token}`)
      .send({ token: 'fcm-tok-1', platform: 'android' }).expect(201);
    expect(await prisma.deviceToken.count({ where: { accountId: accId } })).toBe(1);

    await request(app.getHttpServer())
      .delete('/notifications/token').set('authorization', `Bearer ${token}`)
      .send({ token: 'fcm-tok-1' }).expect(200);
    expect(await prisma.deviceToken.count({ where: { accountId: accId } })).toBe(0);
  });

  it('rejects a malformed body', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/notifications/token').set('authorization', `Bearer ${token}`)
      .send({ platform: 'android' }).expect(400); // token missing
  });
});
```

- [ ] **Step 2: Write DTO, controller, module; register in app.module**

```ts
// packages/backend/src/notifications/notifications.dto.ts
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class RegisterTokenDto {
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
  @IsString() @IsIn(['android', 'ios']) platform!: string;
}
export class UnregisterTokenDto {
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
}
```

```ts
// packages/backend/src/notifications/notifications.controller.ts
// Uses the exact guard + accessor from enroll.controller.ts: JwtAuthGuard sets
// req.user = { accountId, role }, read via @Req().
import { Body, Controller, Delete, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto, UnregisterTokenDto } from './notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('token')
  async register(@Req() req: any, @Body() dto: RegisterTokenDto) {
    await this.notifications.registerToken(req.user.accountId, dto.token, dto.platform);
    return { ok: true };
  }

  @Delete('token')
  @HttpCode(200)
  async unregister(@Body() dto: UnregisterTokenDto) {
    await this.notifications.unregisterToken(dto.token);
    return { ok: true };
  }
}
```

```ts
// packages/backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NOTIFICATION_SENDER } from './notification-sender';
import { LoggingNotificationSender } from './logging-notification-sender';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    NotificationsService,
    { provide: NOTIFICATION_SENDER, useClass: LoggingNotificationSender },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

Add `NotificationsModule` to the `imports` array in `packages/backend/src/app.module.ts`.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm -w @sidesa/backend run test -- notifications-token`
Expected: PASS (anonymous → 401, register → 201 + row, delete → 200 + no row, malformed → 400).

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/notifications packages/backend/src/app.module.ts packages/backend/test/notifications-token.e2e.test.ts
git commit -m "feat(backend): notifications module + token endpoints"
```

---

### Task 6: Emit domain events from letter/booking flows

**Files:**
- Modify: `packages/backend/package.json` (add `@nestjs/event-emitter`)
- Modify: `packages/backend/src/app.module.ts` (register `EventEmitterModule.forRoot()`)
- Create: `packages/backend/src/notifications/notifications.listener.ts`
- Modify: `packages/backend/src/notifications/notifications.module.ts` (declare the listener)
- Modify: `packages/backend/src/letters/letter.service.ts` (inject `EventEmitter2`, emit on create/draft/sign/reject)
- Modify: `packages/backend/src/letters/letter.module.ts` (nothing if EventEmitter is global; verify)
- Modify: `packages/backend/src/booking/booking.service.ts` (emit on create/confirm/cancel)
- Test: `packages/backend/test/notifications.events.e2e.test.ts`

**Interfaces:**
- Consumes: `DomainEvent` (Task 4), `NotificationsService.dispatch` (Task 4), `EventEmitter2` from `@nestjs/event-emitter`.
- Produces: emitted events named by their `type` string (e.g. `emit('letter.signed', { type: 'letter.signed', refId, wargaAccountId })`); a `NotificationsListener` with `@OnEvent('letter.*')` and `@OnEvent('booking.*')` handlers calling `dispatch`.

- [ ] **Step 1: Install the dependency**

Run: `npm -w @sidesa/backend install @nestjs/event-emitter@^2.0.0`
Expected: package added to `dependencies`; lockfile updated.

- [ ] **Step 2: Write the failing e2e test**

```ts
// packages/backend/test/notifications.events.e2e.test.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';
import { NOTIFICATION_SENDER } from '../src/notifications/notification-sender';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('Domain events trigger notifications (e2e, needs Postgres)', () => {
  let app: INestApplication; let prisma: PrismaService; let letters: LetterService; let sender: LoggingNotificationSender;
  const warga = generateKeyPair(); const wpk = hex(warga.publicKey); let wargaId = '';

  beforeAll(async () => {
    // Force the logging sender so we can capture sends, overriding the module default.
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NOTIFICATION_SENDER).useValue(new LoggingNotificationSender())
      .compile();
    app = mod.createNestApplication(); await app.init();
    prisma = app.get(PrismaService); letters = app.get(LetterService);
    sender = app.get(NOTIFICATION_SENDER) as LoggingNotificationSender;
    wargaId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: wpk, displayName: 'W' } })).id;
    await prisma.deviceToken.create({ data: { accountId: wargaId, token: 'tok-w-evt', platform: 'android' } });
  });
  afterAll(async () => {
    await prisma.letter.deleteMany({ where: { request: { wargaAccountId: wargaId } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: wargaId } });
    await prisma.deviceToken.deleteMany({ where: { accountId: wargaId } });
    await prisma.account.deleteMany({ where: { id: wargaId } });
    await app.close();
  });

  it('emits letter.rejected -> warga owner receives a send', async () => {
    const req = await prisma.letterRequest.create({ data: { wargaAccountId: wargaId, type: 'DOMISILI', formData: '{}' } });
    sender.sent.length = 0;
    await letters.reject(req.id);
    // event handling is async; allow the microtask/emitter to flush
    await new Promise((r) => setTimeout(r, 50));
    expect(sender.sent.some((s) => s.message.data.type === 'letter.rejected' && s.tokens.includes('tok-w-evt'))).toBe(true);
  });
});
```

- [ ] **Step 3: Register the emitter, add the listener, emit from services**

In `app.module.ts` add to imports (top of the array): `EventEmitterModule.forRoot()` (import from `@nestjs/event-emitter`). It is global, so services can inject `EventEmitter2` without extra module wiring.

```ts
// packages/backend/src/notifications/notifications.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { DomainEvent } from './notification-events';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent('letter.*')
  @OnEvent('booking.*')
  async handle(event: DomainEvent): Promise<void> {
    await this.notifications.dispatch(event);
  }
}
```

Add `NotificationsListener` to the `providers` of `notifications.module.ts`.

In `letter.service.ts`: inject `constructor(private readonly prisma: PrismaService, private readonly events: EventEmitter2) {}` (import `EventEmitter2` from `@nestjs/event-emitter`) and emit at the end of each transition, using the request's `wargaAccountId`:
- `createRequest` after create: `this.events.emit('letter.submitted', { type: 'letter.submitted', refId: r.id });`
- `draft` after update: `this.events.emit('letter.drafted', { type: 'letter.drafted', refId: requestId, wargaAccountId: req.wargaAccountId });`
- `sign` after update: `this.events.emit('letter.signed', { type: 'letter.signed', refId: requestId, wargaAccountId: req.wargaAccountId });`
- `reject`: load the request first to get the owner, then emit:
  ```ts
  async reject(requestId: string): Promise<{ status: string }> {
    const req = await this.prisma.letterRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    this.events.emit('letter.rejected', { type: 'letter.rejected', refId: requestId, wargaAccountId: req.wargaAccountId });
    return { status: 'REJECTED' };
  }
  ```

In `booking.service.ts`: inject `EventEmitter2` and emit:
- `create`: `this.events.emit('booking.requested', { type: 'booking.requested', refId: b.id });`
- `confirm` after update: `this.events.emit('booking.confirmed', { type: 'booking.confirmed', refId: bookingId, wargaAccountId: booking.wargaAccountId });`
- `cancel`: load owner then emit `booking.cancelled` with `wargaAccountId` (mirror the `reject` pattern: capture the `update` result which includes `wargaAccountId`).

- [ ] **Step 4: Run the focused test, then the whole backend suite**

Run: `npm -w @sidesa/backend run test -- notifications.events`
Expected: PASS.
Run: `npm -w @sidesa/backend run test`
Expected: all pre-existing tests still PASS (no regression from injecting `EventEmitter2`).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/package.json packages/backend/package-lock.json packages/backend/src packages/backend/test/notifications.events.e2e.test.ts
git commit -m "feat(backend): emit domain events -> notifications listener (letters + bookings)"
```

---

### Task 7: `FcmNotificationSender` + driver selection + env/gitignore

**Files:**
- Modify: `packages/backend/package.json` (add `firebase-admin`)
- Create: `packages/backend/src/notifications/fcm-notification-sender.ts`
- Modify: `packages/backend/src/notifications/notifications.module.ts` (choose sender by `NOTIFICATIONS_DRIVER`)
- Modify: `packages/backend/.env.example` (add FCM vars)
- Modify: `.gitignore` (ignore service-account json + google-services.json)
- Test: `packages/backend/test/notifications-driver.test.ts`

**Interfaces:**
- Consumes: `NotificationSender`, `NotificationMessage`, `SendResult`.
- Produces: `class FcmNotificationSender extends NotificationSender` (lazy-inits firebase-admin from `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY`); a module factory that returns `LoggingNotificationSender` unless `NOTIFICATIONS_DRIVER==='fcm'`.

- [ ] **Step 1: Install firebase-admin**

Run: `npm -w @sidesa/backend install firebase-admin@^12.0.0`
Expected: added to `dependencies`.

- [ ] **Step 2: Write the failing test (driver defaults to logging)**

```ts
// packages/backend/test/notifications-driver.test.ts
import { describe, it, expect } from 'vitest';
import { selectNotificationSender } from '../src/notifications/notifications.module';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';
import { FcmNotificationSender } from '../src/notifications/fcm-notification-sender';

describe('selectNotificationSender', () => {
  it('returns the logging sender when driver is unset or "log"', () => {
    expect(selectNotificationSender(undefined)).toBeInstanceOf(LoggingNotificationSender);
    expect(selectNotificationSender('log')).toBeInstanceOf(LoggingNotificationSender);
  });
  it('returns the FCM sender when driver is "fcm"', () => {
    expect(selectNotificationSender('fcm')).toBeInstanceOf(FcmNotificationSender);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm -w @sidesa/backend run test -- notifications-driver`
Expected: FAIL — `selectNotificationSender`/`FcmNotificationSender` not found.

- [ ] **Step 4: Implement the FCM sender and the selector**

```ts
// packages/backend/src/notifications/fcm-notification-sender.ts
import { Logger } from '@nestjs/common';
import { NotificationMessage, NotificationSender, SendResult } from './notification-sender';

/** Real sender. Lazily initialises firebase-admin so importing it needs no creds. */
export class FcmNotificationSender extends NotificationSender {
  private readonly logger = new Logger('Notifications');
  private app: unknown;

  private async messaging() {
    const admin = await import('firebase-admin');
    if (!this.app) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: (process.env.FCM_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
        }),
      });
    }
    return admin.messaging();
  }

  async send(tokens: string[], message: NotificationMessage): Promise<SendResult> {
    if (tokens.length === 0) return { invalidTokens: [] };
    const messaging = await this.messaging();
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
    });
    const invalidTokens: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') invalidTokens.push(tokens[i]);
    });
    this.logger.log(`FCM sent type=${message.data.type} ok=${res.successCount} invalid=${invalidTokens.length}`);
    return { invalidTokens };
  }
}
```

Add to `notifications.module.ts` (and use it in the provider):

```ts
import { FcmNotificationSender } from './fcm-notification-sender';

export function selectNotificationSender(driver: string | undefined): NotificationSender {
  return driver === 'fcm' ? new FcmNotificationSender() : new LoggingNotificationSender();
}
```

Replace the `NOTIFICATION_SENDER` provider with:

```ts
{ provide: NOTIFICATION_SENDER, useFactory: () => selectNotificationSender(process.env.NOTIFICATIONS_DRIVER) },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm -w @sidesa/backend run test -- notifications-driver`
Expected: PASS.

- [ ] **Step 6: Update env example and gitignore**

Append to `packages/backend/.env.example`:

```
# Notifications: "log" (default, no sending) or "fcm" (requires the vars below)
NOTIFICATIONS_DRIVER="log"
FCM_PROJECT_ID=""
FCM_CLIENT_EMAIL=""
FCM_PRIVATE_KEY=""
```

Append to `.gitignore`:

```
# Firebase / FCM secrets
**/google-services.json
**/service-account*.json
```

- [ ] **Step 7: Commit**

```bash
git add packages/backend/package.json packages/backend/package-lock.json packages/backend/src/notifications packages/backend/.env.example .gitignore packages/backend/test/notifications-driver.test.ts
git commit -m "feat(backend): FCM sender + driver selection (log default)"
```

---

### Task 8: Flutter — `PushMessagingAdapter` + Session wiring

**Files:**
- Create: `packages/app/lib/push/push_messaging_adapter.dart`
- Modify: `packages/app/lib/state/session.dart` (accept an adapter; register on login, unregister on logout; add API methods)
- Modify: `packages/app/lib/api/api_client.dart` (add `deleteJson` for the unregister call)
- Test: `packages/app/test/push_adapter_test.dart`

**Interfaces:**
- Produces:
  - `abstract class PushMessagingAdapter { Future<String?> obtainToken(); void onTokenRefresh(void Function(String) cb); }`
  - `class NoopPushAdapter implements PushMessagingAdapter` — `obtainToken` returns `null`; `onTokenRefresh` does nothing. Default in `Session`.
  - `Session` gains a constructor param `PushMessagingAdapter? push` (defaults to `NoopPushAdapter()`), registers the token after `login`, and unregisters on `logout`.
  - `ApiClient.deleteJson(String path, Map<String, dynamic> body)`.

- [ ] **Step 1: Write the failing test**

```dart
// packages/app/test/push_adapter_test.dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';
import 'package:sidesa_app/push/push_messaging_adapter.dart';
import 'package:sidesa_app/state/session.dart';

class FakePushAdapter implements PushMessagingAdapter {
  final String? token;
  FakePushAdapter(this.token);
  @override
  Future<String?> obtainToken() async => token;
  @override
  void onTokenRefresh(void Function(String) cb) {}
}

void main() {
  test('registers the FCM token after login and unregisters on logout', () async {
    final requests = <String>[];
    final mock = MockClient((req) async {
      requests.add('${req.method} ${req.url.path}');
      if (req.url.path == '/auth/challenge') return http.Response(jsonEncode({'nonce': 'n1'}), 201);
      if (req.url.path == '/auth/verify') return http.Response(jsonEncode({'token': 'jwt', 'role': 'WARGA'}), 201);
      if (req.url.path == '/notifications/token') {
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        expect(body['token'], 'fcm-abc');
        expect(body['platform'], 'android');
        return http.Response(jsonEncode({'ok': true}), req.method == 'DELETE' ? 200 : 201);
      }
      return http.Response('nf', 404);
    });
    final kp = generateKeyPair();
    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: InMemoryKeyStore(kp.privateKey),
      push: FakePushAdapter('fcm-abc'),
    );
    await session.login('acc-1');
    expect(requests, contains('POST /notifications/token'));
    session.logout();
    await session.pendingPushWork; // flush the unregister call
    expect(requests, contains('DELETE /notifications/token'));
  });

  test('a null token (no Firebase) skips registration without error', () async {
    final requests = <String>[];
    final mock = MockClient((req) async {
      requests.add(req.url.path);
      if (req.url.path == '/auth/challenge') return http.Response(jsonEncode({'nonce': 'n1'}), 201);
      if (req.url.path == '/auth/verify') return http.Response(jsonEncode({'token': 'jwt', 'role': 'WARGA'}), 201);
      return http.Response('nf', 404);
    });
    final kp = generateKeyPair();
    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: InMemoryKeyStore(kp.privateKey),
      push: FakePushAdapter(null),
    );
    await session.login('acc-1');
    expect(requests.contains('/notifications/token'), isFalse);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/app && flutter test test/push_adapter_test.dart`
Expected: FAIL — `push_messaging_adapter.dart` missing; `Session` has no `push`/`pendingPushWork`.

- [ ] **Step 3: Implement the adapter, API method, and Session wiring**

```dart
// packages/app/lib/push/push_messaging_adapter.dart
/// Boundary over FCM so the app builds and tests run without Firebase.
abstract class PushMessagingAdapter {
  /// The current registration token, or null when push is unavailable.
  Future<String?> obtainToken();
  /// Register a callback for token rotation.
  void onTokenRefresh(void Function(String) cb);
}

/// Default: push disabled. Used in tests and when Firebase is not configured.
class NoopPushAdapter implements PushMessagingAdapter {
  @override
  Future<String?> obtainToken() async => null;
  @override
  void onTokenRefresh(void Function(String) cb) {}
}
```

Add to `ApiClient`:

```dart
Future<Map<String, dynamic>> deleteJson(String path, Map<String, dynamic> body) async {
  final res = await _client.delete(Uri.parse('$baseUrl$path'), headers: _headers(), body: jsonEncode(body));
  if (res.statusCode >= 400) {
    throw Exception('Request $path gagal (${res.statusCode}).');
  }
  return jsonDecode(res.body) as Map<String, dynamic>;
}
```

Modify `Session`:
- Import `../push/push_messaging_adapter.dart`.
- Add field `final PushMessagingAdapter push;` and constructor param `PushMessagingAdapter? push` defaulting to `NoopPushAdapter()` (mirror how `api`/`keyStore` default).
- Add `Future<void> pendingPushWork = Future.value();` (tests await it to observe fire-and-forget unregister).
- Track the registered token: `String? _pushToken;`.
- At the end of `login`, after `api.authToken = token;`:
  ```dart
  final t = await push.obtainToken();
  if (t != null) {
    _pushToken = t;
    push.onTokenRefresh((nt) { _pushToken = nt; api.postJson('/notifications/token', {'token': nt, 'platform': _platform()}); });
    await api.postJson('/notifications/token', {'token': t, 'platform': _platform()});
  }
  ```
- In `logout`, before clearing `api.authToken`, capture the token and fire the unregister:
  ```dart
  final t = _pushToken;
  if (t != null) {
    pendingPushWork = api.deleteJson('/notifications/token', {'token': t}).catchError((_) => <String, dynamic>{});
    _pushToken = null;
  }
  ```
  Keep clearing `token/accountId/role/api.authToken` after capturing (the unregister needs the auth header, so send it before nulling `api.authToken`; adjust ordering so the DELETE carries the bearer token).
- Add a private `String _platform()` returning `'android'` (the only target now; iOS later).

> Ordering note: the unregister DELETE must run while `api.authToken` is still set. Send the request (capture the Future) first, then clear the session fields.

- [ ] **Step 4: Run the focused test, then the whole app suite**

Run: `cd packages/app && flutter test test/push_adapter_test.dart`
Expected: PASS (both cases).
Run: `cd packages/app && flutter test`
Expected: all 23 existing tests still PASS (Session's new param is optional, defaults to no-op).

- [ ] **Step 5: Commit**

```bash
git add packages/app/lib/push packages/app/lib/state/session.dart packages/app/lib/api/api_client.dart packages/app/test/push_adapter_test.dart
git commit -m "feat(app): push adapter + token (un)registration on login/logout"
```

---

### Task 9 (DEFERRED — run only when Firebase credentials exist): real FCM wiring

Do not start this task until the user has created a Firebase project and provided `google-services.json` + service-account values (see the design doc appendix). It touches native Android build config that fails without `google-services.json`, so it is intentionally separate from the tested tasks above. There is no automated test here; verification is manual on a Google-Play emulator image.

**Files:**
- Modify: `packages/app/pubspec.yaml` (add `firebase_core`, `firebase_messaging`, `flutter_local_notifications`)
- Modify: `packages/app/android/app/build.gradle` + `packages/app/android/build.gradle` (Google Services plugin)
- Add (untracked): `packages/app/android/app/google-services.json`
- Create: `packages/app/lib/push/fcm_push_adapter.dart` (implements `PushMessagingAdapter` over `firebase_messaging`; requests `POST_NOTIFICATIONS`; foreground messages via `flutter_local_notifications`; tap routing by `data.type`)
- Modify: `packages/app/lib/main.dart` (`Firebase.initializeApp()` in a try/catch; pass `FcmPushAdapter()` to `Session` when init succeeds, else keep `NoopPushAdapter`)
- Modify: `packages/backend/.env` (set `NOTIFICATIONS_DRIVER=fcm` + the three FCM vars)

- [ ] **Step 1:** Follow the design-doc appendix steps 1–5 to create the project, place `google-services.json`, add the Gradle plugin, and fill backend env.
- [ ] **Step 2:** Add the pubspec deps; run `flutter pub get`.
- [ ] **Step 3:** Implement `FcmPushAdapter` and wire it in `main.dart` behind a `try/catch` around `Firebase.initializeApp()` so a missing/invalid config falls back to `NoopPushAdapter`.
- [ ] **Step 4:** Manual verify on the Pixel_7 Google-Play emulator: enrol → login → sign a letter as KaDes → confirm the warga device shows a generic push; check `DeviceToken` rows exist and an invalid token gets pruned after uninstall.
- [ ] **Step 5:** Commit (excluding `google-services.json` and any service-account file, which are gitignored):

```bash
git add packages/app/pubspec.yaml packages/app/android packages/app/lib/push/fcm_push_adapter.dart packages/app/lib/main.dart
git commit -m "feat(app): wire real FCM sender + adapter (requires Firebase project)"
```

---

## Self-Review

**Spec coverage:**
- §2 architecture (event-emitter decoupling) → Task 6. ✓
- §3.1 DeviceToken → Task 1. ✓
- §3.2 sender interface + Logging + FCM → Tasks 2, 7. ✓
- §3.3 service register/unregister/dispatch → Tasks 3, 4. ✓
- §3.4 controller endpoints + DTO → Task 5. ✓
- §3.5 event emission map → Task 6. ✓
- §4 minimal payload (no PII) → Task 4 (asserted by the privacy checks in the dispatch test). ✓
- §5 Flutter adapter + graceful degradation + login/logout timing → Tasks 8 (interface/no-op/wiring) and 9 (real FCM). ✓
- §6 testing → each backend task ships tests; app Task 8 ships adapter tests. ✓
- §7 secrets/config → Task 7 (.env.example, .gitignore) + Task 9 (.env). ✓
- §8 Firebase setup guide → referenced from Task 9; lives in the design doc. ✓

**Placeholder scan:** The only intentional placeholder is the authenticated-account accessor in Task 5's controller, which is explicitly resolved by reading `enroll.controller.ts` in Step 1 and the note in Step 3 (the codebase's existing mechanism, not inventable here). No `TBD`/`handle edge cases`/`write tests for the above`.

**Type consistency:** `NotificationMessage`/`SendResult`/`NotificationSender`/`NOTIFICATION_SENDER` defined in Task 2 and used unchanged in 3–7. `DomainEvent`/`NotificationType` defined in Task 4, used in 6. `PushMessagingAdapter`/`NoopPushAdapter` defined in Task 8, implemented again in 9. `selectNotificationSender` defined and consumed in Task 7. Event names (`letter.*`/`booking.*`) match between emit sites (Task 6) and the dispatch recipient switch (Task 4).
