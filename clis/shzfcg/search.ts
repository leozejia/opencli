import { AuthRequiredError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  buildSearchCandidates,
  cleanText,
  dedupeCandidates,
  detectAuthPrompt,
  normalizeDate,
  searchRowsFromEntries,
} from '../_shared/china-bid-search.js';

const SITE = 'shzfcg';
const DOMAIN = 'www.zfcg.sh.gov.cn';
const SEARCH_ENTRIES = [
  'https://www.zfcg.sh.gov.cn/',
  'https://www.zfcg.sh.gov.cn/ZcyAnnouncement/ZcyAnnouncement4/ZcyAnnouncement3004/',
];

function siteSearchCandidates(query: string): string[] {
  return buildSearchCandidates(query, SEARCH_ENTRIES);
}

cli({
  site: SITE,
  name: 'search',
  description: '搜索上海政府采购公告',
  domain: DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search keyword, e.g. "elevator"' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of results (max 50)' },
  ],
  columns: ['rank', 'title', 'date', 'url'],
  func: async (page, kwargs) => {
    const query = cleanText(kwargs.query);
    const limit = Math.max(1, Math.min(Number(kwargs.limit) || 20, 50));
    const rows = await searchRowsFromEntries(page, {
      query,
      candidateUrls: siteSearchCandidates(query),
      allowedHostFragments: ['zfcg.sh.gov.cn'],
      limit,
    });

    if (rows.length === 0 && await detectAuthPrompt(page)) {
      throw new AuthRequiredError(
        DOMAIN,
        'SHZFCG search requires login or human verification',
      );
    }

    return dedupeCandidates(rows).slice(0, limit).map((item, index) => ({
      rank: index + 1,
      title: item.title,
      date: item.date,
      url: item.url,
    }));
  },
});

export const __test__ = {
  buildSearchCandidates: siteSearchCandidates,
  normalizeDate,
  dedupeCandidates,
};
