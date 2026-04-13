import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { clickAnyByText, maybePassEnterSite, parseQueueState, probeCurrentPage } from './shared.js';

function normalizePolls(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(7200, Math.floor(parsed)));
}

cli({
  site: 'thaiticketmajor',
  name: 'queue',
  description: 'Observe ThaiTicketMajor queue, countdown, and waiting-room states',
  domain: 'booking.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'Event or booking URL' },
    { name: 'show', help: 'Preferred show label to click before entering queue' },
    { name: 'wait', type: 'boolean', default: false, help: 'Keep polling for queue state transitions' },
    { name: 'polls', type: 'int', default: 10, help: 'Maximum probe count while waiting' },
  ],
  columns: ['stage', 'countdown', 'progress_percent', 'requires_captcha', 'access_restricted', 'url'],
  func: async (page, kwargs) => {
    const url = String(kwargs.url || '').trim();
    const show = String(kwargs.show || '').trim();
    const shouldWait = kwargs.wait === true || kwargs.wait === 'true';
    const polls = normalizePolls(kwargs.polls);
    const actionPatterns = show
      ? [show, 'join in', 'join queue', 'buy ticket', 'book now']
      : ['join in', 'join queue', 'buy ticket', 'book now'];

    await page.goto(url);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);

    let state = parseQueueState(await probeCurrentPage(page, 180));

    for (let attempt = 0; attempt < polls; attempt += 1) {
      if (['event-detail', 'session-list', 'queue-countdown'].includes(state.stage)) {
        const clicked = await clickAnyByText(page, actionPatterns);
        if (clicked.ok) {
          await page.wait({ time: 1.5 });
        }
      }

      state = parseQueueState(await probeCurrentPage(page, 180));
      if (state.access_restricted) {
        throw new CommandExecutionError('ThaiTicketMajor queue is blocked by an access restriction page', state.hint);
      }
      if (!shouldWait || ['captcha', 'queue-countdown', 'queue-progress', 'zone-map', 'seat-map', 'checkout'].includes(state.stage)) {
        return [{ ...state, attempt: attempt + 1 }];
      }
      await page.wait({ time: 2 });
    }

    return [state];
  },
});

export const __test__ = {
  normalizePolls,
  parseQueueState,
};
