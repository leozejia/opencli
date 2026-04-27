import { describe, expect, it } from 'vitest';
import {
  buildFlowStatus,
  detectAccessRestricted,
  detectCaptcha,
  detectTicketStage,
  extractShowsFromText,
  mapSearchCards,
  nextSeatRetryDecision,
  normalizeDeliveryMethod,
  normalizePaymentMethod,
  parseDetailSnapshot,
  parsePriceTiers,
  parseQueueState,
  parseZones,
  buildWaitAndClickAnyByTextEvaluate,
  buildWaitAndClickShowByLabelEvaluate,
  showLabelMatchesShowRow,
} from './shared.js';

describe('thaiticketmajor shared helpers', () => {
  it('classifies major stages', () => {
    expect(detectTicketStage({ url: 'https://www.thaiticketmajor.com/', text: 'Enter Site' })).toBe('enter-site');
    expect(detectTicketStage({ url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en', text: 'Email Password Login' })).toBe('login');
    expect(detectTicketStage({ url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en', text: 'Email Password reCAPTCHA' })).toBe('captcha');
    expect(detectTicketStage({ url: 'https://thaiticketmajor.queue-it.net/?c=abc', text: 'Estimated wait time 12 minutes' })).toBe('queue-progress');
    expect(detectTicketStage({ url: 'https://booking.thaiticketmajor.com/show', text: 'Zone A Zone B Price Zone' })).toBe('zone-map');
    expect(detectTicketStage({ url: 'https://booking.thaiticketmajor.com/show', text: 'Select Seat Available Seat' })).toBe('seat-map');
    expect(detectTicketStage({ url: 'https://booking.thaiticketmajor.com/show', text: 'Payment Method Delivery Method VISA Alipay' })).toBe('checkout');
    expect(detectTicketStage({ url: 'https://www.thaiticketmajor.com/concert/example.html', text: 'Official Ticket\nVISA Alipay\nBuy Ticket' })).toBe('event-detail');
    expect(detectTicketStage({ url: 'https://gatekeeper.thaiticketmajor.com/', text: '很抱歉，您的访问受到限制' })).toBe('access-restricted');
  });

  it('does not classify authenticated event pages as login pages', () => {
    expect(detectTicketStage({
      url: 'https://www.thaiticketmajor.com/performance/wu-the-fate-begins.html',
      title: 'Official Ticket | WU : The Fate Begins',
      text: 'View your profile My Ticket Purchase History Edit Profile Change Password Sign Out Ticket Status COMING SOON Tuesday 5 May 2026 19:30 Payment Condition Payment Method',
    })).toBe('session-list');
  });

  it('detects captcha and restricted access hints', () => {
    expect(detectCaptcha('Please complete reCAPTCHA before continuing')).toBe(true);
    expect(detectCaptcha('系统检测到您是机器，请输入验证码')).toBe(true);
    expect(detectAccessRestricted('很抱歉，您的访问受到限制', 'https://gatekeeper.thaiticketmajor.com/')).toBe(true);
    expect(detectAccessRestricted('Too many requests', 'https://booking.thaiticketmajor.com/show/x')).toBe(true);
  });

  it('extracts price tiers and show entries', () => {
    expect(parsePriceTiers('Ticket Price 2500 / 3500 / 4200 THB')).toEqual(['2500', '3500', '4200']);
    expect(extractShowsFromText('2026-05-01 19:00 รอบการแสดง\n2026-05-02 20:00 รอบการแสดง')).toHaveLength(2);
  });

  it('maps search cards into ranked rows', () => {
    const rows = mapSearchCards([
      {
        text: 'MAN WITH A MISSION\nBangkok\nBuy Ticket',
        href: 'https://www.thaiticketmajor.com/concert/man-with-a-mission-2026.html',
        tag: 'a',
        disabled: false,
        ariaLabel: '',
        className: '',
      },
    ], 5, 'mission');

    expect(rows).toEqual([
      {
        rank: 1,
        title: 'MAN WITH A MISSION',
        venue: 'Bangkok',
        sale_status: 'Buy Ticket',
        show_count: 0,
        url: 'https://www.thaiticketmajor.com/concert/man-with-a-mission-2026.html',
        source_page: 'https://www.thaiticketmajor.com/concert/man-with-a-mission-2026.html',
      },
    ]);
  });

  it('parses detail and queue states', () => {
    const detail = parseDetailSnapshot({
      url: 'https://www.thaiticketmajor.com/concert/example.html',
      title: 'MAN WITH A MISSION',
      text: 'Thunder Dome\nTicket Price 2500 3500 THB\n2026-05-01 19:00 รอบการแสดง\nBuy Ticket\nVISA Alipay',
      actions: [
        {
          text: 'Buy Ticket',
          href: 'https://booking.thaiticketmajor.com/show/example',
          tag: 'a',
          disabled: false,
          ariaLabel: '',
          className: '',
        },
      ],
    });
    expect(detail.title).toContain('MAN WITH A MISSION');
    expect(detail.venue).toContain('Thunder Dome');
    expect(detail.price_tiers).toEqual(['2500', '3500']);
    expect(detail.booking_url).toContain('booking.thaiticketmajor.com');

    const queue = parseQueueState({
      url: 'https://thaiticketmajor.queue-it.net/?c=abc',
      title: '',
      text: 'Estimated wait time\n00:12:59\n48%',
      actions: [],
    });
    expect(queue.stage).toBe('queue-countdown');
    expect(queue.countdown).toBe('00:12:59');
    expect(queue.progress_percent).toBe(48);
  });

  it('parses zones and normalizes checkout inputs', () => {
    const zones = parseZones({
      url: 'https://booking.thaiticketmajor.com/show/example',
      title: '',
      text: 'Zone A 3500 THB\nZone B Sold Out',
      actions: [
        { text: 'Zone A 3500 THB', href: '', tag: 'button', disabled: false, ariaLabel: '', className: '' },
        { text: 'Zone B Sold Out', href: '', tag: 'button', disabled: true, ariaLabel: '', className: 'disabled' },
      ],
    });
    expect(zones).toEqual([
      { zone: 'Zone A 3500 THB', available: true, price_hint: '3500', action_url: '' },
      { zone: 'Zone B Sold Out', available: false, price_hint: '', action_url: '' },
    ]);

    expect(normalizePaymentMethod('Alipay')).toBe('alipay');
    expect(normalizePaymentMethod('VISA')).toBe('visa');
    expect(normalizeDeliveryMethod('现场取票')).toBe('venue-pickup');
  });

  it('builds flow status and retry decisions', () => {
    const status = buildFlowStatus({
      url: 'https://booking.thaiticketmajor.com/tickets/register/?la=en',
      title: 'Login',
      text: 'Email Password',
      actions: [],
    });
    expect(status.stage).toBe('login');
    expect(status.requires_login).toBe(true);
    expect(nextSeatRetryDecision({ attempts: 2, maxAttempts: 5, lastReason: 'seat-locked' })).toBe('retry');
    expect(nextSeatRetryDecision({ attempts: 4, maxAttempts: 5, lastReason: 'seat-locked', hasFallbackZone: true })).toBe('switch-zone');
  });

  it('builds wait-and-click evaluator with mutation observer', () => {
    const script = buildWaitAndClickAnyByTextEvaluate(['join in', 'buy ticket'], 1200);
    expect(script).toContain('MutationObserver');
    expect(script).toContain('not-found-timeout');
    expect(script).toContain('setInterval');
  });

  it('matches target show labels against ThaiTicketMajor date rows and time buttons', () => {
    expect(showLabelMatchesShowRow(
      '2026-05-05 19:30',
      'Tuesday 5 May 2026 19:30',
      '19:30',
    )).toBe(true);
    expect(showLabelMatchesShowRow(
      '2026-05-06 19:30',
      'Tuesday 5 May 2026 19:30',
      '19:30',
    )).toBe(false);
    expect(showLabelMatchesShowRow(
      '19:30',
      'Tuesday 5 May 2026 19:30',
      '19:30',
    )).toBe(true);
  });

  it('builds show-time watcher for disabled-to-enabled transitions', () => {
    const script = buildWaitAndClickShowByLabelEvaluate('2026-05-05 19:30', 1200);
    expect(script).toContain('MutationObserver');
    expect(script).toContain('data-button');
    expect(script).toContain('not-allowed');
    expect(script).toContain('disabled');
    expect(script).toContain('rowText');
  });
});
