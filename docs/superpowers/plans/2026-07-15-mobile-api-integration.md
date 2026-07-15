# Fase A1 — Integrasi API Mobile (warga) Implementation Plan

> **For agentic workers:** Executed vibe-coding style — glue code with unit tests as the guardrail. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The warga Flutter app talks to the real backend: real key-possession login, submit a letter request, list "my letters", and book/list appointments — replacing static demo data.

**Architecture:** A single `Session` holds the device `KeyStore`, `ApiClient`, `AuthService`, the JWT, and the account id; it exposes `login()` and authenticated calls. Screens read/write through `Session`. Base URL is configurable (`10.0.2.2:3000` reaches the host backend from the Android emulator).

**Tech Stack:** Flutter, `http` (already added), reuses `@sidesa/crypto`-compatible Dart ECDSA + `AuthService` from the mobile foundation.

## Global Constraints
- Auth via key possession (challenge → sign → token). No password/NIK-as-authenticator.
- All network through `ApiClient`; token attached as `Authorization: Bearer`.
- On the Android emulator, the host machine is `10.0.2.2` (not `localhost`).

## Tasks
1. **`AppConfig` + `Session` (app-side), wire login.** `Session.login(accountId)` runs challenge→sign→verify, stores the token. Unit-tested with a mock HTTP client.
2. **Backend: `GET /letters/mine`** — a warga lists their own requests (reuses Plan #4 data). Integration + role gate test.
3. **Authenticated `ApiClient` + wire surat flow** — `getJson`/`postJson` attach the token; form → `POST /letters/request`; "Surat Saya" → `GET /letters/mine`.
4. **Wire booking** — `POST /bookings`, `GET /bookings/mine`.
5. **On-device smoke** — run backend, seed one ACTIVE warga, `flutter run`, verify login + submit end-to-end.

Deferred: warga self-registration + operator approval UI (enrollment ceremony); secure token storage (flutter_secure_storage) — in-memory for now.

## Notes for the executor
- Keep the `Session` the single source of truth so screens stay thin.
- Backend must be running (`npm run backend:dev`) and Postgres up for Tasks 2 & 5.
