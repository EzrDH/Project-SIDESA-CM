/// Contexts a warga's ZKP eligibility proof is bound to.
///
/// Each flow gets its own domain prefix so a proof made for one can never
/// satisfy the other, and each carries a single-use server nonce so a captured
/// proof cannot be replayed (or used with a stolen token).

/// Booking an appointment — the service the product exists for.
///
/// The booking's own fields (purpose, requested slot) are deliberately NOT
/// bound. `purpose` is free-form text, so binding it would demand a
/// canonicalisation rule for whitespace and unicode that buys nothing here:
/// the nonce is single-use and already tied to this account, which is what
/// stops a proof being reused for a different request.
export function buildBookingEligibilityContext(accountId: string, nonce: string): string {
  return `SIDESA-booking-eligibility-v1|${accountId}|${nonce}`;
}

/// Letter requests. The letter subsystem leaves the product in Tahap 2; this
/// stays only until it does.
export function buildLetterEligibilityContext(accountId: string, type: string, nonce: string): string {
  return `SIDESA-letter-eligibility-v1|${accountId}|${type}|${nonce}`;
}
