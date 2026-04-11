import { describe, expect, it } from 'vitest';
import { __test__ } from './hold.js';

describe('thaiticketmajor hold helpers', () => {
  it('retries locked seats before giving up', () => {
    expect(__test__.nextSeatRetryDecision({ attempts: 1, maxAttempts: 5, lastReason: 'seat-locked' })).toBe('retry');
    expect(__test__.nextSeatRetryDecision({
      attempts: 4,
      maxAttempts: 5,
      lastReason: 'selection-not-confirmed',
      hasFallbackZone: true,
    })).toBe('switch-zone');
  });
});

