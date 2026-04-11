import { describe, expect, it } from 'vitest';
import { __test__ } from './queue.js';

describe('thaiticketmajor queue helpers', () => {
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

