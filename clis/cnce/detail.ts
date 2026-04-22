import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  cleanText,
  normalizeDate,
  taxonomyError,
  toProcurementDetailRecord,
} from '../jianyu/shared/procurement-contract.js';

const SITE = 'cnce';
const DOMAIN = 'scm.esinochem.com';
const API_DETAIL_ENDPOINT = 'https://scm.esinochem.com/gateway/obs/business/notice/outer/query/getDetail';

interface CnceAttachment {
  name?: string;
  url?: string;
}

interface CnceDetailResponse {
  status?: boolean;
  success?: boolean;
  code?: string;
  msg?: string;
  data?: {
    noticeId?: string;
    title?: string;
    content?: string;
    purchaseCompanyName?: string;
    buName?: string;
    purchaseMethodDesc?: string;
    requireTypeDesc?: string;
    startTime?: string;
    endTime?: string;
    publishTime?: string;
    noticeTypeName?: string;
    plateTypeName?: string;
    attachmentsDTOs?: CnceAttachment[];
  };
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|td|th|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, '\'')
    .replace(/&quot;/gi, '"');
}

export function extractNoticeId(url: string): string {
  const targetUrl = cleanText(url);
  if (!targetUrl) return '';

  try {
    const parsed = new URL(targetUrl);
    const direct = cleanText(parsed.searchParams.get('noticeId'));
    if (direct) return direct;

    const hash = cleanText(parsed.hash);
    const queryIndex = hash.indexOf('?');
    if (queryIndex < 0) return '';
    const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
    return cleanText(hashParams.get('noticeId'));
  } catch {
    return '';
  }
}

async function fetchNoticeDetail(noticeId: string) {
  const response = await fetch(API_DETAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ noticeId }),
  });

  if (!response.ok) {
    throw taxonomyError('relay_unavailable', {
      site: SITE,
      command: 'detail',
      detail: `cnce detail api HTTP ${response.status}`,
    });
  }

  const payload = await response.json() as CnceDetailResponse;
  if (!payload.status || payload.code !== '000000' || !payload.data) {
    throw taxonomyError('relay_unavailable', {
      site: SITE,
      command: 'detail',
      detail: `cnce detail api code=${cleanText(payload.code)} msg=${cleanText(payload.msg)}`,
    });
  }

  return payload.data;
}

function buildDetailContext(detail: NonNullable<CnceDetailResponse['data']>): string {
  const contentText = cleanText(stripHtml(detail.content || ''));
  const attachments = Array.isArray(detail.attachmentsDTOs)
    ? detail.attachmentsDTOs
      .map((item) => cleanText([item.name, item.url].filter(Boolean).join(' ')))
      .filter(Boolean)
    : [];

  return cleanText([
    contentText,
    detail.noticeTypeName,
    detail.plateTypeName,
    detail.purchaseCompanyName ? `采购代理机构：${detail.purchaseCompanyName}` : '',
    detail.buName ? `业务单元：${detail.buName}` : '',
    detail.purchaseMethodDesc ? `采购方式：${detail.purchaseMethodDesc}` : '',
    detail.requireTypeDesc ? `需求类型：${detail.requireTypeDesc}` : '',
    attachments.length > 0 ? `附件：${attachments.join(' | ')}` : '',
  ].filter(Boolean).join('\n'));
}

cli({
  site: SITE,
  name: 'detail',
  description: '读取中化采购详情页并抽取证据字段',
  domain: DOMAIN,
  strategy: Strategy.COOKIE,
  browser: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'Detail page URL from cnce/search' },
    { name: 'query', help: 'Optional query for evidence ranking' },
  ],
  columns: ['title', 'publish_time', 'content_type', 'project_code', 'budget_or_limit', 'deadline_or_open_time', 'url'],
  func: async (_page, kwargs) => {
    const targetUrl = cleanText(kwargs.url);
    const noticeId = extractNoticeId(targetUrl);
    if (!noticeId) {
      throw taxonomyError('relay_unavailable', {
        site: SITE,
        command: 'detail',
        detail: `missing noticeId in cnce detail url: ${targetUrl}`,
      });
    }

    const detail = await fetchNoticeDetail(noticeId);
    const publishTime = normalizeDate(cleanText(detail.startTime || detail.publishTime || ''));
    const contextText = buildDetailContext(detail);
    if (!cleanText(detail.title) && !contextText) {
      throw taxonomyError('empty_result', {
        site: SITE,
        command: 'detail',
        detail: `cnce detail api returned empty content for noticeId=${noticeId}`,
      });
    }

    return [
      toProcurementDetailRecord(
        {
          title: cleanText(detail.title) || targetUrl,
          url: targetUrl,
          contextText,
          publishTime,
        },
        {
          site: SITE,
          query: cleanText(kwargs.query),
        },
      ),
    ];
  },
});

export const __test__ = {
  extractNoticeId,
  stripHtml,
  buildDetailContext,
};
