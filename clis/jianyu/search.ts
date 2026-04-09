/**
 * Jianyu search — browser DOM extraction from Jianyu bid search page.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError } from '@jackwener/opencli/errors';
import {
  type ProcurementSearchCandidateRaw,
  cleanText,
  normalizeDate,
  toProcurementSearchRecords,
} from '../_shared/procurement-contract.js';

const SEARCH_ENTRY = 'https://www.jianyu360.cn/jylab/supsearch/index.html';

export function buildSearchUrl(query: string): string {
  const url = new URL(SEARCH_ENTRY);
  url.searchParams.set('keywords', query.trim());
  url.searchParams.set('selectType', 'title');
  url.searchParams.set('searchGroup', '1');
  return url.toString();
}

function dedupeCandidates(items: ProcurementSearchCandidateRaw[]): ProcurementSearchCandidateRaw[] {
  const deduped: ProcurementSearchCandidateRaw[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.title}\t${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

cli({
  site: 'jianyu',
  name: 'search',
  description: '搜索剑鱼标讯公告',
  domain: 'www.jianyu360.cn',
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
    const searchUrl = buildSearchUrl(query);

    await page.goto(searchUrl);
    await page.wait(2);

    const payload = await page.evaluate(`
      (() => {
        const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const toAbsolute = (href) => {
          if (!href) return '';
          if (href.startsWith('http://') || href.startsWith('https://')) return href;
          if (href.startsWith('/')) return new URL(href, window.location.origin).toString();
          return '';
        };
        const parseDate = (text) => {
          const normalized = clean(text);
          const match = normalized.match(/(20\\d{2})[.\\-/年](\\d{1,2})[.\\-/月](\\d{1,2})/);
          if (!match) return '';
          const month = String(match[2]).padStart(2, '0');
          const day = String(match[3]).padStart(2, '0');
          return match[1] + '-' + month + '-' + day;
        };
        const pickContext = (node) => {
          return clean((node.closest('tr, li, div, article, section') || node).innerText || '');
        };

        const anchors = Array.from(
          document.querySelectorAll('a[href*="/nologin/content/"], a[href*="/content/"]'),
        );
        const rows = [];
        const seen = new Set();
        for (const anchor of anchors) {
          const url = toAbsolute(anchor.getAttribute('href') || anchor.href || '');
          const title = clean(anchor.textContent || '');
          if (!url || !title || title.length < 4) continue;
          const key = title + '\\t' + url;
          if (seen.has(key)) continue;
          seen.add(key);
          const contextText = pickContext(anchor);
          rows.push({
            title,
            url,
            date: parseDate(contextText),
            contextText,
          });
        }
        return rows;
      })()
    `);

    const pageText = cleanText(await page.evaluate('document.body ? document.body.innerText : ""'));
    const rows = Array.isArray(payload)
      ? payload
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item) => ({
          title: cleanText(item.title),
          url: cleanText(item.url),
          date: normalizeDate(cleanText(item.date)),
          contextText: cleanText(item.contextText),
        }))
        .filter((item) => item.title && item.url)
      : [];

    if (
      rows.length === 0
      && /(请先登录|登录后|未登录|验证码|人机验证)/.test(pageText)
    ) {
      throw new AuthRequiredError(
        'www.jianyu360.cn',
        '[taxonomy=selector_drift] site=jianyu command=search login required or human verification',
      );
    }

    return toProcurementSearchRecords(dedupeCandidates(rows), {
      site: 'jianyu',
      query,
      limit,
    });
  },
});

export const __test__ = {
  buildSearchUrl,
  normalizeDate,
  dedupeCandidates,
};
