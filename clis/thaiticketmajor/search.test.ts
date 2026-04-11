import { describe, expect, it } from 'vitest';
import { __test__ } from './search.js';

describe('thaiticketmajor search helpers', () => {
  it('normalizes limits', () => {
    expect(__test__.normalizeLimit(undefined)).toBe(10);
    expect(__test__.normalizeLimit(0)).toBe(1);
    expect(__test__.normalizeLimit(99)).toBe(50);
  });

  it('maps event cards into ranked search rows', () => {
    const rows = __test__.mapSearchCards([
      {
        text: 'MAN WITH A MISSION\nBangkok\nBuy Ticket',
        href: '/concert/man-with-a-mission-2026.html',
        tag: 'a',
        disabled: false,
        ariaLabel: '',
        className: '',
      },
    ], 5, 'mission');

    expect(rows[0]).toEqual({
      rank: 1,
      title: 'MAN WITH A MISSION',
      venue: 'Bangkok',
      sale_status: 'Buy Ticket',
      show_count: 0,
      url: 'https://www.thaiticketmajor.com/concert/man-with-a-mission-2026.html',
      source_page: 'https://www.thaiticketmajor.com/concert/man-with-a-mission-2026.html',
    });
  });
});

