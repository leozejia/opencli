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

const SITE = 'chinabidding';
const DOMAIN = 'www.chinabidding.com.cn';
const SEARCH_ENTRIES = [
  'https://www.chinabidding.com.cn/',
];

function siteSearchCandidates(query: string): string[] {
  return buildSearchCandidates(query, SEARCH_ENTRIES);
}

cli({
  site: SITE,
  name: 'search',
  description: '搜索中国采购与招标网公告',
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
      allowedHostFragments: ['chinabidding.com.cn'],
      limit,
    });

    if (rows.length === 0 && await detectAuthPrompt(page)) {
      throw new AuthRequiredError(
        DOMAIN,
        'Chinabidding search requires login or human verification',
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
