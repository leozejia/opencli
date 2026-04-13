import { describe, expect, it } from 'vitest';
import { __test__ } from './checkout.js';

describe('thaiticketmajor checkout helpers', () => {
  it('normalizes payment and delivery options', () => {
    expect(__test__.normalizePaymentMethod('Alipay')).toBe('alipay');
    expect(__test__.normalizePaymentMethod('VISA')).toBe('visa');
    expect(__test__.normalizeDeliveryMethod('现场取票')).toBe('venue-pickup');
  });
});

