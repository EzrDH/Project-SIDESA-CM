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
