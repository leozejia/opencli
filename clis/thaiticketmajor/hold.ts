import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { buildFlowStatus, clickAnyByText, maybePassEnterSite, nextSeatRetryDecision, normalizeText, probeCurrentPage, type FlowStatus } from './shared.js';

function normalizePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function buildSeatAttemptEvaluate(quantity: number): string {
  return `
    (() => {
      const clean = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
      const nodes = Array.from(document.querySelectorAll(
        'button, [role="button"], [class*="seat"], [data-seat], [aria-label*="seat" i], svg [data-seat], svg [class*="seat"]'
      ));
      const seatNodes = nodes.filter((node) => {
        const text = clean(node.innerText || node.textContent || node.getAttribute('aria-label') || node.getAttribute('title') || '');
        const classes = clean(node.getAttribute('class') || '');
        const disabled = Boolean(node.disabled || node.getAttribute('aria-disabled') === 'true');
        if (disabled) return false;
        if (/selected|active/.test(classes) && /seat/i.test(classes)) return true;
        if (/seat|row|available/i.test(text) || /seat/i.test(classes)) return true;
        return false;
      });

      const clicked = [];
      for (const node of seatNodes) {
        if (clicked.length >= ${Math.max(1, quantity)}) break;
        const text = clean(node.innerText || node.textContent || node.getAttribute('aria-label') || node.getAttribute('title') || '');
        if (/sold out|unavailable|disabled|held/i.test(text)) continue;
        node.click();
        clicked.push(text || 'seat');
      }

      return {
        ok: clicked.length >= ${Math.max(1, quantity)},
        clicked,
        reason: clicked.length ? 'clicked-seat-candidates' : 'no-seat-candidates',
      };
    })()
  `;
}

async function maybeClickBuyNow(page: FlowStatusPage): Promise<boolean> {
  const clicked = await clickAnyByText(page, [
    'buy now',
    'buy ticket',
    'confirm order',
    'continue',
    'checkout',
    'next',
  ]);
  if (clicked.ok) {
    await page.wait({ time: 1.2 });
    return true;
  }
  return false;
}

async function resolveFailureDialogs(page: FlowStatusPage, maxLoops = 3): Promise<number> {
  let resolved = 0;
  for (let i = 0; i < maxLoops; i += 1) {
    const clicked = await clickAnyByText(page, [
      'ok',
      'confirm',
      'close',
      'accept',
      'retry',
      '确定',
      '确认',
      '知道了',
      'ตกลง',
      'ยืนยัน',
    ]);
    if (!clicked.ok) {
      break;
    }
    resolved += 1;
    await page.wait({ time: 0.8 });
  }
  return resolved;
}

type FlowStatusPage = Parameters<typeof probeCurrentPage>[0];

function detectBookingBlock(status: FlowStatus): { message: string; hint?: string } | null {
  if (status.access_restricted) {
    return {
      message: 'ThaiTicketMajor hold is blocked by an access restriction page',
      hint: status.hint,
    };
  }
  if (status.requires_captcha) {
    return {
      message: 'ThaiTicketMajor hold is blocked by captcha verification',
      hint: status.hint,
    };
  }
  if (status.requires_login) {
    return {
      message: 'ThaiTicketMajor hold requires login before seat selection',
      hint: status.hint,
    };
  }
  if (['enter-site', 'event-detail', 'session-list', 'queue-countdown', 'queue-progress', 'unknown'].includes(status.stage)) {
    return {
      message: `ThaiTicketMajor hold requires a booking zone/seat page, but the current stage is ${status.stage}`,
      hint: 'Open the booking flow until zone-map or seat-map is visible, then rerun hold.',
    };
  }
  return null;
}

cli({
  site: 'thaiticketmajor',
  name: 'hold',
  description: 'Try to select a zone and hold ThaiTicketMajor seats with retry logic',
  domain: 'booking.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'Booking URL' },
    { name: 'zone', help: 'Preferred zone label or pattern' },
    { name: 'quantity', type: 'int', default: 1, help: 'Desired seat count' },
    { name: 'retry', type: 'int', default: 3, help: 'Maximum seat-hold attempts' },
    { name: 'fallback-zone', help: 'Optional fallback zone pattern' },
  ],
  columns: ['ok', 'stage', 'selected_zone', 'selected_count', 'reason', 'url'],
  func: async (page, kwargs) => {
    const url = String(kwargs.url || '').trim();
    const zone = String(kwargs.zone || '').trim();
    const fallbackZone = String(kwargs['fallback-zone'] || '').trim();
    const quantity = normalizePositiveInt(kwargs.quantity, 1, 4);
    const retry = normalizePositiveInt(kwargs.retry, 3, 20);

    await page.goto(url);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);

    let selectedZone = zone;
    if (selectedZone) {
      const clicked = await clickAnyByText(page, [selectedZone]);
      if (clicked.ok) {
        await page.wait({ time: 1.5 });
      }
    }

    for (let attempt = 0; attempt < retry; attempt += 1) {
      const probe = await probeCurrentPage(page, 200);
      const status = buildFlowStatus(probe);
      const block = detectBookingBlock(status);
      if (block) {
        throw new CommandExecutionError(block.message, block.hint);
      }
      if (status.stage === 'checkout') {
        return [{
          ok: true,
          stage: status.stage,
          selected_zone: selectedZone,
          selected_count: quantity,
          reason: 'already-at-checkout',
          url: probe.url,
        }];
      }

      const result = await page.evaluate(buildSeatAttemptEvaluate(quantity)) as {
        ok?: boolean;
        clicked?: string[];
        reason?: string;
      };

      const clickedCount = Array.isArray(result?.clicked) ? result.clicked.length : 0;
      if (clickedCount > 0) {
        await page.wait({ time: 2 });
        const buyNowClicked = await maybeClickBuyNow(page);
        const dialogResolved = await resolveFailureDialogs(page, 3);
        const afterProbe = await probeCurrentPage(page, 200);
        const afterStatus = buildFlowStatus(afterProbe);
        if (afterStatus.stage === 'checkout') {
          return [{
            ok: true,
            stage: afterStatus.stage,
            selected_zone: selectedZone,
            selected_count: clickedCount,
            reason: buyNowClicked ? 'buy-now-submitted' : 'seat-selection-advanced',
            url: afterProbe.url,
          }];
        }
        if (dialogResolved > 0) {
          result.reason = 'buy-now-locked-dialog';
        }
      }

      const decision = nextSeatRetryDecision({
        attempts: attempt,
        maxAttempts: retry,
        lastReason: result?.reason,
        hasFallbackZone: Boolean(fallbackZone),
      });
      if (decision === 'switch-zone' && fallbackZone) {
        const clicked = await clickAnyByText(page, [fallbackZone]);
        if (clicked.ok) {
          selectedZone = fallbackZone;
          await page.wait({ time: 1.5 });
          continue;
        }
      }
      if (decision === 'give-up') {
        throw new EmptyResultError(
          'thaiticketmajor hold',
          `No selectable seats were confirmed after ${retry} attempts (${normalizeText(result?.reason) || 'unknown'})`,
        );
      }
      await page.wait({ time: 1 });
    }

    throw new EmptyResultError('thaiticketmajor hold', 'No seats could be held on the current booking page');
  },
});

export const __test__ = {
  nextSeatRetryDecision,
  detectBookingBlock,
};
