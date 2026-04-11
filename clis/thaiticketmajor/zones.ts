import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { buildFlowStatus, maybePassEnterSite, parseZones, probeCurrentPage } from './shared.js';

cli({
  site: 'thaiticketmajor',
  name: 'zones',
  description: 'List available ThaiTicketMajor seating zones on the current booking page',
  domain: 'booking.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'Booking page URL' },
  ],
  columns: ['zone', 'available', 'price_hint', 'action_url'],
  func: async (page, kwargs) => {
    const url = String(kwargs.url || '').trim();
    await page.goto(url);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);

    const probe = await probeCurrentPage(page, 200);
    const status = buildFlowStatus(probe);
    if (status.access_restricted) {
      throw new CommandExecutionError('ThaiTicketMajor zones page is blocked by an access restriction page', status.hint);
    }

    const zones = parseZones(probe);
    if (!zones.length) {
      throw new EmptyResultError('thaiticketmajor zones', `No seating zones were found on the current page (stage: ${status.stage})`);
    }
    return zones;
  },
});

export const __test__ = {
  parseZones,
};

