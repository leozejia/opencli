/**
 * Jianyu search — browser DOM extraction from Jianyu bid search page.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError } from '@jackwener/opencli/errors';
import {
  buildSearchCandidates,
  cleanText,
  dedupeCandidates,
  detectAuthPrompt,
  normalizeDate,
  searchRowsFromEntries,
} from '../_shared/china-bid-search.js';
import { toProcurementSearchRecords } from '../_shared/procurement-contract.js';

const SITE = 'jianyu';
const DOMAIN = 'www.jianyu360.cn';
const SEARCH_ENTRY = 'https://www.jianyu360.cn/jylab/supsearch/index.html';
const SEARCH_ENTRIES = [
  SEARCH_ENTRY,
  'https://www.jianyu360.cn/list/stype/ZBGG.html',
  'https://www.jianyu360.cn/',
];
const PROCUREMENT_TITLE_HINT = /(公告|招标|采购|中标|成交|项目|投标|结果|notice|tender|procurement|bidding)/i;
const AUTH_REQUIRED_HINT = /(请在下图依次点击|登录即可获得更多浏览权限|验证登录|请完成验证|图形验证码)/;
const NAVIGATION_PATH_PREFIXES = [
  '/product/',
  '/front/',
  '/helpcenter/',
  '/brand/',
  '/page_workdesktop/',
  '/list/',
  '/list/stype/',
  '/list/rmxm',
  '/big/page/',
  '/jylab/',
  '/tags/',
  '/sitemap',
  '/datasmt/',
  '/bank/',
  '/hj/',
  '/exhibition/',
  '/swordfish/page_big_pc/search/',
];

export function buildSearchUrl(query: string): string {
  const url = new URL(SEARCH_ENTRY);
  url.searchParams.set('keywords', query.trim());
  url.searchParams.set('selectType', 'title');
  url.searchParams.set('searchGroup', '1');
  return url.toString();
}

function siteSearchCandidates(query: string): string[] {
  const preferred = buildSearchUrl(query);
  const fallbacks = buildSearchCandidates(query, SEARCH_ENTRIES, ['keywords', 'keyword', 'q', 'search', 'title']);
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [preferred, ...fallbacks]) {
    const value = cleanText(candidate);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function isLikelyNavigationUrl(rawUrl: string): boolean {
  const urlText = cleanText(rawUrl);
  if (!urlText) return true;
  try {
    const parsed = new URL(urlText);
    const path = cleanText(parsed.pathname).toLowerCase().replace(/\/+$/, '/') || '/';
    if (path === '/') return true;
    if (NAVIGATION_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
    return false;
  } catch {
    return true;
  }
}

function filterNavigationRows(query: string, items: Array<{
  title?: string;
  url?: string;
  date?: string;
  contextText?: string;
}>): Array<{
  title: string;
  url: string;
  date?: string;
  contextText?: string;
}> {
  const queryTokens = cleanText(query).split(/\s+/).filter(Boolean).map((token) => token.toLowerCase());
  return items
    .map((item) => ({
      title: cleanText(item.title),
      url: cleanText(item.url),
      date: normalizeDate(cleanText(item.date)),
      contextText: cleanText(item.contextText),
    }))
    .filter((item) => {
      if (!item.title || !item.url) return false;
      const haystack = `${item.title} ${item.contextText}`.toLowerCase();
      const hasQuery = queryTokens.length === 0 || queryTokens.some((token) => haystack.includes(token));
      const hasProcurementHint = PROCUREMENT_TITLE_HINT.test(`${item.title} ${item.contextText}`);
      const hasDate = !!item.date;
      if (!hasQuery && !hasProcurementHint) return false;
      if (!isLikelyNavigationUrl(item.url)) return true;
      return hasDate && hasProcurementHint;
    });
}

async function isAuthRequired(page: any): Promise<boolean> {
  const pageText = cleanText(await page.evaluate('document.body ? document.body.innerText : ""'));
  if (AUTH_REQUIRED_HINT.test(pageText)) return true;
  return detectAuthPrompt(page);
}

cli({
  site: SITE,
  name: 'search',
  description: '搜索剑鱼标讯公告',
  domain: DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search keyword, e.g. "procurement"' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of results (max 50)' },
  ],
  columns: ['rank', 'content_type', 'title', 'publish_time', 'project_code', 'budget_or_limit', 'url'],
  func: async (page, kwargs) => {
    const query = cleanText(kwargs.query);
    const limit = Math.max(1, Math.min(Number(kwargs.limit) || 20, 50));
    const extractedRows = await searchRowsFromEntries(page, {
      query,
      candidateUrls: siteSearchCandidates(query),
      allowedHostFragments: ['jianyu360.cn'],
      limit,
    });
    const rows = dedupeCandidates(filterNavigationRows(query, extractedRows));

    if (rows.length === 0 && await isAuthRequired(page)) {
      throw new AuthRequiredError(
        DOMAIN,
        '[taxonomy=selector_drift] site=jianyu command=search login required or human verification',
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
  buildSearchUrl,
  normalizeDate,
  dedupeCandidates,
  filterNavigationRows,
};
