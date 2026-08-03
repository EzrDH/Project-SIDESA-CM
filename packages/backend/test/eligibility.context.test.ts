import { describe, it, expect } from 'vitest';
import { buildBookingEligibilityContext, buildLetterEligibilityContext } from '../src/registry/eligibility.context';

describe('eligibility contexts are domain-separated', () => {
  const account = 'acc-1';
  const nonce = 'n1';

  it('the booking context carries its own domain', () => {
    expect(buildBookingEligibilityContext(account, nonce)).toBe(
      `SIDESA-booking-eligibility-v1|${account}|${nonce}`,
    );
  });

  it('booking and letter contexts never collide for the same account and nonce', () => {
    // If these could coincide, a proof made to book an appointment would also
    // satisfy a letter request, and vice versa.
    const booking = buildBookingEligibilityContext(account, nonce);
    const letter = buildLetterEligibilityContext(account, 'SKTM', nonce);
    expect(booking).not.toBe(letter);
    expect(booking.startsWith('SIDESA-booking-')).toBe(true);
    expect(letter.startsWith('SIDESA-letter-')).toBe(true);
  });

  it('different nonces give different booking contexts', () => {
    expect(buildBookingEligibilityContext(account, 'a')).not.toBe(
      buildBookingEligibilityContext(account, 'b'),
    );
  });

  it('different accounts give different booking contexts', () => {
    expect(buildBookingEligibilityContext('acc-1', nonce)).not.toBe(
      buildBookingEligibilityContext('acc-2', nonce),
    );
  });
});
