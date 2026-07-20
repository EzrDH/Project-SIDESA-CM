/// Message a device signs to prove it holds the private key for the public key
/// it is enrolling. Binding the code prevents a captured proof from being reused
/// against another code; binding the public key prevents enrolling someone
/// else's key (which would permanently lock that person out, since publicKey is
/// unique).
export function buildEnrollMessage(code: string, publicKeyHex: string): Uint8Array {
  return new TextEncoder().encode(`SIDESA-enroll-v1|${normalizeCode(code)}|${publicKeyHex.toLowerCase()}`);
}

/// Codes are shown as `ABCD-EFGH` but typed however the user manages — compare
/// on the canonical form.
export function normalizeCode(code: string): string {
  return (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
