/// Context string a warga's ZKP eligibility proof is bound to. Including the
/// account, the letter type and a single-use server nonce means a captured
/// proof cannot be replayed for another request (or with a stolen token).
export function buildEligibilityContext(accountId: string, type: string, nonce: string): string {
  return `SIDESA-letter-eligibility-v1|${accountId}|${type}|${nonce}`;
}
