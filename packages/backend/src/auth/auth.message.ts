export function buildAuthMessage(accountId: string, nonce: string): Uint8Array {
  return new TextEncoder().encode(`SIDESA-auth-v1|${accountId}|${nonce}`);
}
