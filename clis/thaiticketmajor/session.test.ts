import { describe, expect, it } from 'vitest';
import { __test__ } from './session.js';

describe('thaiticketmajor session helpers', () => {
  it('reports login and captcha states without crashing', () => {
    const result = __test__.classifySession({
      url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en',
      title: 'Login',
      text: 'Email Password reCAPTCHA',
      actions: [],
    });

    expect(result.stage).toBe('captcha');
    expect(result.requires_login).toBe(true);
    expect(result.requires_captcha).toBe(true);
  });
});

