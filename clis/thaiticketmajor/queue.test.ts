import { describe, expect, it } from 'vitest';
import { __test__ } from './queue.js';

describe('thaiticketmajor queue helpers', () => {
  it('normalizes polls with long-window cap', () => {
    expect(__test__.normalizePolls(99999)).toBe(7200);
    expect(__test__.normalizePolls(0)).toBe(1);
  });

  it('keeps waiting during queue-countdown when wait=true', () => {
    expect(__test__.shouldReturnNow('queue-countdown', true)).toBe(false);
    expect(__test__.shouldReturnNow('queue-progress', true)).toBe(true);
    expect(__test__.shouldReturnNow('seat-map', true)).toBe(true);
  });

  it('uses high-frequency wait before join action is clicked', () => {
    expect(__test__.pickLoopWaitSeconds('event-detail', true, false)).toBe(0.2);
    expect(__test__.pickLoopWaitSeconds('queue-countdown', true, false)).toBe(0.2);
    expect(__test__.pickLoopWaitSeconds('queue-countdown', true, true)).toBe(2);
  });

  it('reuses current thaiticket page in wait mode to avoid refresh drift', () => {
    expect(__test__.shouldNavigateToTarget(
      'https://www.thaiticketmajor.com/concert/example.html',
      'https://booking.thaiticketmajor.com/booking/3m/zones.php?query=793',
      true,
    )).toBe(false);
    expect(__test__.shouldNavigateToTarget(
      'https://www.google.com/',
      'https://booking.thaiticketmajor.com/booking/3m/zones.php?query=793',
      true,
    )).toBe(true);
  });

  it('maps queue countdown and progress states', () => {
    expect(__test__.parseQueueState({
      url: 'https://booking.thaiticketmajor.com/show/example',
      title: '',
      text: 'Countdown 00:12:59 Buy Ticket',
      actions: [],
    }).stage).toBe('queue-countdown');

    expect(__test__.parseQueueState({
      url: 'https://thaiticketmajor.queue-it.net/?c=1',
      title: '',
      text: 'Estimated wait time 5 minutes progress 48%',
      actions: [],
    }).stage).toBe('queue-progress');
  });
});
