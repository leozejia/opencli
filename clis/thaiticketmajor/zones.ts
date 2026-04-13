import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { buildFlowStatus, maybePassEnterSite, parseZones, probeCurrentPage, type FlowStatus } from './shared.js';

function detectZonesBlock(status: FlowStatus): { message: string; hint?: string } | null {
  if (status.access_restricted) {
    return {
      message: 'ThaiTicketMajor zones page is blocked by an access restriction page',
      hint: status.hint,
    };
  }
  if (status.requires_captcha) {
    return {
      message: 'ThaiTicketMajor zones is blocked by captcha verification',
      hint: status.hint,
    };
  }
  if (status.requires_login) {
    return {
      message: 'ThaiTicketMajor zones requires login before seat map access',
      hint: status.hint,
    };
  }
  return null;
}

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
    const block = detectZonesBlock(status);
    if (block) {
      throw new CommandExecutionError(block.message, block.hint);
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
  detectZonesBlock,
};
