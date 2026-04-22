import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  type ProcurementSearchCandidateRaw,
  cleanText,
  normalizeDate,
  taxonomyError,
  toProcurementSearchRecords,
} from '../jianyu/shared/procurement-contract.js';

const SITE = 'cnce';
const DOMAIN = 'scm.esinochem.com';
const API_LIST_ENDPOINT = 'https://scm.esinochem.com/gateway/obs/business/notice/outer/page/queryPageList';
const FRONTEND_NOTICE_ROUTE = 'https://scm.esinochem.com/hpc/index.html#';

interface CnceNoticeListRow {
  noticeId?: string;
  title?: string;
  plateType?: string;
  plateTypeName?: string;
  noticeType?: string;
  noticeTypeName?: string;
  startTime?: string;
  startTimeStr?: string;
  endTime?: string;
  endTimeStr?: string;
  requireTypeDesc?: string;
  purchaseCompanyName?: string;
  buName?: string;
  purchaseMethodDesc?: string;
  businessId?: string;
  aftSupFileId?: string | null;
}

interface CnceListResponse {
  status?: boolean;
  success?: boolean;
  code?: string;
  msg?: string;
  data?: {
    root?: CnceNoticeListRow[];
  };
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

export function buildDetailUrl(row: Pick<CnceNoticeListRow, 'noticeId' | 'businessId' | 'noticeType' | 'title' | 'aftSupFileId'>): string {
  const noticeId = cleanText(row.noticeId);
  if (!noticeId) return '';

  const noticeType = cleanText(row.noticeType) || '01';
  const businessId = cleanText(row.businessId);
  const title = cleanText(row.title);
  const aftSupFileId = cleanText(row.aftSupFileId);
  const route = aftSupFileId ? '/noTenderPdf' : '/content';
  const params = new URLSearchParams({
    noticeId,
    noticeType,
    s: noticeType,
  });

  if (businessId) params.set('bid', businessId);
  if (title) params.set('title', title);
  if (aftSupFileId) params.set('pdfUrl', aftSupFileId);

  return `${FRONTEND_NOTICE_ROUTE}${route}?${params.toString()}`;
}

function toApiCandidate(row: CnceNoticeListRow): ProcurementSearchCandidateRaw | null {
  const title = cleanText(row.title);
  const url = buildDetailUrl(row);
  if (!title || !url) return null;

  const contextText = cleanText([
    row.noticeTypeName,
    row.plateTypeName,
    row.requireTypeDesc,
    row.purchaseMethodDesc,
    row.purchaseCompanyName,
    row.buName,
    row.startTimeStr,
    row.endTimeStr,
  ].filter(Boolean).join(' | '));

  return {
    title,
    url,
    date: normalizeDate(cleanText(row.startTimeStr || row.startTime || '')),
    contextText,
  };
}

async function searchRowsFromApi(query: string, limit: number): Promise<ProcurementSearchCandidateRaw[]> {
  const keyword = cleanText(query);
  const pageSize = Math.max(20, Math.min(100, Math.max(limit * 3, limit)));
  const response = await fetch(API_LIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({
      start: 0,
      limit: pageSize,
      currentPage: 1,
      model: {
        noticeType: '01',
        plateType: 'Bid',
        title: keyword,
      },
    }),
  });

  if (!response.ok) {
    throw taxonomyError('relay_unavailable', {
      site: SITE,
      command: 'search',
      detail: `cnce notice api HTTP ${response.status}`,
    });
  }

  const payload = await response.json() as CnceListResponse;
  if (!payload.status || payload.code !== '000000') {
    throw taxonomyError('relay_unavailable', {
      site: SITE,
      command: 'search',
      detail: `cnce notice api code=${cleanText(payload.code)} msg=${cleanText(payload.msg)}`,
    });
  }

  const rows = Array.isArray(payload.data?.root) ? payload.data!.root! : [];
  return dedupeCandidates(
    rows
      .map((row) => toApiCandidate(row))
      .filter((row): row is ProcurementSearchCandidateRaw => Boolean(row)),
  ).slice(0, limit);
}

cli({
  site: SITE,
  name: 'search',
  description: '搜索中化采购公告',
  domain: DOMAIN,
  strategy: Strategy.COOKIE,
  browser: false,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search keyword, e.g. "elevator"' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of results (max 50)' },
  ],
  columns: ['rank', 'content_type', 'title', 'publish_time', 'project_code', 'budget_or_limit', 'url'],
  func: async (_page, kwargs) => {
    const query = cleanText(kwargs.query);
    if (!query) {
      throw new Error('Search keyword cannot be empty');
    }

    const limit = Math.max(1, Math.min(Number(kwargs.limit) || 20, 50));
    const rows = await searchRowsFromApi(query, limit);
    if (rows.length === 0) return [];

    return toProcurementSearchRecords(rows, {
      site: SITE,
      query,
      limit,
    });
  },
});

export const __test__ = {
  buildDetailUrl,
  normalizeDate,
  dedupeCandidates,
  toApiCandidate,
  searchRowsFromApi,
};
