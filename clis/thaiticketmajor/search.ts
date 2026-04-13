import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  TTM_HOME_URL,
  buildFlowStatus,
  mapSearchCards,
  maybePassEnterSite,
  probeCurrentPage,
} from './shared.js';

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

cli({
  site: 'thaiticketmajor',
  name: 'search',
  description: 'Search ThaiTicketMajor event cards from the public site',
  domain: 'www.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search keyword' },
    { name: 'limit', type: 'int', default: 10, help: 'Number of results to return' },
  ],
  columns: ['rank', 'title', 'venue', 'sale_status', 'show_count', 'url'],
  func: async (page, kwargs) => {
    const query = String(kwargs.query || '').trim();
    const limit = normalizeLimit(kwargs.limit);

    await page.goto(TTM_HOME_URL);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);
    await page.wait({ time: 1 });

    const probe = await probeCurrentPage(page, 160);
    const status = buildFlowStatus(probe);
    if (status.access_restricted) {
      throw new CommandExecutionError(
        'ThaiTicketMajor search is blocked by an access restriction page',
        status.hint,
      );
    }

    return mapSearchCards(probe.actions, limit, query);
  },
});

export const __test__ = {
  normalizeLimit,
  mapSearchCards,
};

