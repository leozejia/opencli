import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { buildFlowStatus, maybePassEnterSite, parseDetailSnapshot, probeCurrentPage } from './shared.js';

cli({
  site: 'thaiticketmajor',
  name: 'detail',
  description: 'Read a ThaiTicketMajor event detail page',
  domain: 'www.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'ThaiTicketMajor event detail URL' },
  ],
  columns: ['title', 'venue', 'buy_button_state', 'show_count', 'booking_url', 'url'],
  func: async (page, kwargs) => {
    const url = String(kwargs.url || '').trim();
    await page.goto(url);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);
    await page.wait({ time: 1 });

    const probe = await probeCurrentPage(page, 180);
    const status = buildFlowStatus(probe);
    if (status.access_restricted) {
      throw new CommandExecutionError('ThaiTicketMajor detail is blocked by an access restriction page', status.hint);
    }

    const detail = parseDetailSnapshot(probe);
    if (!detail.title) {
      throw new EmptyResultError('thaiticketmajor detail', 'No event title or booking metadata was found on the current page');
    }
    return [detail];
  },
});

export const __test__ = {
  parseDetailSnapshot,
};

