import type { IPage } from '@jackwener/opencli/types';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { TTM_HOME_URL, buildFlowStatus, probeCurrentPage } from './shared.js';

async function probeSession(page: IPage) {
  const currentUrl = await page.getCurrentUrl?.();
  if (!currentUrl || !/thaiticketmajor|queue-it|gatekeeper/i.test(currentUrl)) {
    await page.goto(TTM_HOME_URL);
    await page.wait({ time: 1.5 });
  }
  return buildFlowStatus(await probeCurrentPage(page, 120));
}

cli({
  site: 'thaiticketmajor',
  name: 'session',
  description: 'Inspect the current ThaiTicketMajor browser session state',
  domain: 'www.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [],
  columns: ['stage', 'requires_login', 'requires_captcha', 'access_restricted', 'url'],
  func: async (page) => [await probeSession(page)],
});

export const __test__ = {
  classifySession: buildFlowStatus,
};

