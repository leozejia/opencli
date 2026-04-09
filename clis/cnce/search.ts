import { AuthRequiredError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  buildSearchCandidates,
  cleanText,
  dedupeCandidates,
  detectAuthPrompt,
  normalizeDate,
  searchRowsFromEntries,
} from '../jianyu/shared/china-bid-search.js';
import { toProcurementSearchRecords } from '../jianyu/shared/procurement-contract.js';

const SITE = 'cnce';
const DOMAIN = 'scm.esinochem.com';
const SEARCH_ENTRIES = [
  'https://scm.esinochem.com/hpc/index.html#/notice?type=01&f=bid',
  'https://scm.esinochem.com/hpc/index.html#/notice',
  'https://scm.esinochem.com/',
];

function siteSearchCandidates(query: string): string[] {
  return buildSearchCandidates(query, SEARCH_ENTRIES);
}

cli({
  site: SITE,
  name: 'search',
  description: '搜索中化采购公告',
  domain: DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search keyword, e.g. "elevator"' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of results (max 50)' },
  ],
  columns: ['rank', 'content_type', 'title', 'publish_time', 'project_code', 'budget_or_limit', 'url'],
  func: async (page, kwargs) => {
    const query = cleanText(kwargs.query);
    const limit = Math.max(1, Math.min(Number(kwargs.limit) || 20, 50));
    const rows = await searchRowsFromEntries(page, {
      query,
      candidateUrls: siteSearchCandidates(query),
      allowedHostFragments: ['scm.esinochem.com'],
      limit,
    });

    if (rows.length === 0 && await detectAuthPrompt(page)) {
      throw new AuthRequiredError(
        DOMAIN,
        '[taxonomy=selector_drift] site=cnce command=search login required or human verification',
      );
    }

    return toProcurementSearchRecords(dedupeCandidates(rows), {
      site: SITE,
      query,
      limit,
    });
  },
});

export const __test__ = {
  buildSearchCandidates: siteSearchCandidates,
  normalizeDate,
  dedupeCandidates,
};
