export interface BidSearchCandidate {
  title: string;
  url: string;
  date: string;
}

export function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function normalizeDate(raw: string): string {
  const normalized = cleanText(raw);
  const match = normalized.match(/(20\d{2})[.\-/年](\d{1,2})[.\-/月](\d{1,2})/);
  if (!match) return '';
  const year = match[1];
  const month = match[2].padStart(2, '0');
  const day = match[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dedupeCandidates(items: BidSearchCandidate[]): BidSearchCandidate[] {
  const deduped: BidSearchCandidate[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.title}\t${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function withQuery(baseUrl: string, key: string, query: string): string | null {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set(key, query);
    return url.toString();
  } catch {
    return null;
  }
}

export function buildSearchCandidates(
  query: string,
  baseEntries: string[],
  queryKeys: string[] = ['keyword', 'keywords', 'q', 'search', 'title'],
): string[] {
  const keyword = cleanText(query);
  const candidates: string[] = [];
  if (keyword) {
    for (const entry of baseEntries) {
      for (const key of queryKeys) {
        const withKeyword = withQuery(entry, key, keyword);
        if (withKeyword) candidates.push(withKeyword);
      }
    }
  }
  candidates.push(...baseEntries);
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const value = cleanText(item);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

export async function detectAuthPrompt(page: any): Promise<boolean> {
  const pageText = cleanText(await page.evaluate('document.body ? document.body.innerText : ""'));
  return /(请先登录|未登录|登录后|验证码|人机验证|权限不足|无权限)/.test(pageText);
}

export async function searchRowsFromEntries(
  page: any,
  {
    query,
    candidateUrls,
    allowedHostFragments,
    limit,
  }: {
    query: string;
    candidateUrls: string[];
    allowedHostFragments: string[];
    limit: number;
  },
): Promise<BidSearchCandidate[]> {
  const queryText = cleanText(query);
  const rows: BidSearchCandidate[] = [];

  for (const targetUrl of candidateUrls) {
    await page.goto(targetUrl);
    await page.wait(2);

    const payload = await page.evaluate(`
      (() => {
        const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const parseDate = (text) => {
          const normalized = clean(text);
          const match = normalized.match(/(20\\d{2})[.\\-/年](\\d{1,2})[.\\-/月](\\d{1,2})/);
          if (!match) return '';
          return match[1] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[3]).padStart(2, '0');
        };
        const toAbsolute = (href) => {
          if (!href) return '';
          if (href.startsWith('http://') || href.startsWith('https://')) return href;
          if (href.startsWith('/')) return new URL(href, window.location.origin).toString();
          return '';
        };

        const token = ${JSON.stringify(queryText)};
        const tokenParts = token.split(/\\s+/).filter(Boolean);
        const allowedHosts = ${JSON.stringify(allowedHostFragments.map((item) => item.toLowerCase()))};

        const rows = [];
        const seen = new Set();
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        for (const anchor of anchors) {
          const title = clean(anchor.textContent || '');
          if (!title || title.length < 4) continue;
          const url = toAbsolute(anchor.getAttribute('href') || anchor.href || '');
          if (!url) continue;
          const lowerUrl = url.toLowerCase();
          const hostMatched = allowedHosts.length === 0 || allowedHosts.some((item) => lowerUrl.includes(item));
          if (!hostMatched) continue;

          const contextNode = anchor.closest('tr, li, div, article, section') || anchor;
          const contextText = clean(contextNode.innerText || contextNode.textContent || '');
          const searchable = (title + ' ' + contextText).toLowerCase();
          const queryMatched = tokenParts.length === 0
            || tokenParts.some((part) => searchable.includes(part.toLowerCase()));
          if (!queryMatched) continue;

          const key = title + '\\t' + url;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            title,
            url,
            date: parseDate(contextText),
          });
        }
        return rows;
      })()
    `);

    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (!item || typeof item !== 'object') continue;
        const candidate = {
          title: cleanText((item as Record<string, unknown>).title),
          url: cleanText((item as Record<string, unknown>).url),
          date: normalizeDate(cleanText((item as Record<string, unknown>).date)),
        };
        if (!candidate.title || !candidate.url) continue;
        rows.push(candidate);
      }
    }

    if (rows.length >= limit) break;
  }

  return dedupeCandidates(rows).slice(0, limit);
}
