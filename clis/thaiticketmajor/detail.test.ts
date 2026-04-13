import { describe, expect, it } from 'vitest';
import { __test__ } from './detail.js';

describe('thaiticketmajor detail helpers', () => {
  it('extracts event metadata from detail snapshots', () => {
    const result = __test__.parseDetailSnapshot({
      url: 'https://www.thaiticketmajor.com/concert/example.html',
      title: 'MAN WITH A MISSION',
      text: 'Thunder Dome\nBuy Ticket\n2026-05-01 19:00 รอบการแสดง\nTicket Price 2500 3500 THB',
      actions: [
        { text: 'Buy Ticket', href: 'https://booking.thaiticketmajor.com/show/example', tag: 'a', disabled: false, ariaLabel: '', className: '' },
      ],
    });

    expect(result.title).toContain('MAN WITH A MISSION');
    expect(result.venue).toContain('Thunder Dome');
    expect(result.price_tiers).toEqual(['2500', '3500']);
    expect(result.shows[0].label).toContain('2026-05-01');
  });
});

