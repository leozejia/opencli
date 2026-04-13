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

  it('classifies login/captcha/access blocks before seat retries', () => {
    expect(__test__.detectBookingBlock({
      ok: true,
      stage: 'login',
      url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en',
      requires_login: true,
      hint: 'Complete login first.',
    })).toEqual({
      message: 'ThaiTicketMajor hold requires login before seat selection',
      hint: 'Complete login first.',
    });

    expect(__test__.detectBookingBlock({
      ok: false,
      stage: 'captcha',
      url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en',
      requires_captcha: true,
      hint: 'Solve captcha first.',
    })?.message).toContain('captcha');

    expect(__test__.detectBookingBlock({
      ok: true,
      stage: 'event-detail',
      url: 'https://www.thaiticketmajor.com/concert/example.html',
    })?.message).toContain('requires a booking zone/seat page');
  });
});
