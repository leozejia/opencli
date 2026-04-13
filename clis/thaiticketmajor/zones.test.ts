import { describe, expect, it } from 'vitest';
import { __test__ } from './zones.js';

describe('thaiticketmajor zones helpers', () => {
  it('lists clickable and sold-out zones', () => {
    const zones = __test__.parseZones({
      url: 'https://booking.thaiticketmajor.com/show/example',
      title: '',
      text: 'Zone A Available\nZone B Sold Out',
      actions: [
        { text: 'Zone A 3500 THB', href: '', tag: 'button', disabled: false, ariaLabel: '', className: '' },
        { text: 'Zone B Sold Out', href: '', tag: 'button', disabled: true, ariaLabel: '', className: 'disabled' },
      ],
    });

    expect(zones).toEqual([
      { zone: 'Zone A 3500 THB', available: true, price_hint: '3500', action_url: '' },
      { zone: 'Zone B Sold Out', available: false, price_hint: '', action_url: '' },
    ]);
  });

  it('classifies login/captcha/access blocks before zone parsing', () => {
    expect(__test__.detectZonesBlock({
      ok: true,
      stage: 'login',
      url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en',
      requires_login: true,
      hint: 'Complete login first.',
    })).toEqual({
      message: 'ThaiTicketMajor zones requires login before seat map access',
      hint: 'Complete login first.',
    });
  });
});
