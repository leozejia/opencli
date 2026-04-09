import { type IPage } from '@jackwener/opencli/types';
import {
  cleanText,
  toProcurementDetailRecord,
  taxonomyError,
} from './procurement-contract.js';

export async function runProcurementDetail(
  page: IPage,
  {
    url,
    site,
    query = '',
  }: {
    url: string;
    site: string;
    query?: string;
  },
) {
  const targetUrl = cleanText(url);
  if (!targetUrl) {
    throw taxonomyError('relay_unavailable', {
      site,
      command: 'detail',
      detail: 'missing required detail url',
    });
  }

  await page.goto(targetUrl);
  await page.wait(2);

  const payload = await page.evaluate(`
    (() => {
      const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const title = clean(document.title || '');
      const bodyText = clean(document.body ? document.body.innerText : '');
      const maxLength = 12000;
      const limitedText = bodyText.length > maxLength ? bodyText.slice(0, maxLength) : bodyText;
      const dateMatch = limitedText.match(/(20\\d{2})[.\\-/年](\\d{1,2})[.\\-/月](\\d{1,2})/);
      const publishTime = dateMatch
        ? dateMatch[1] + '-' + String(dateMatch[2]).padStart(2, '0') + '-' + String(dateMatch[3]).padStart(2, '0')
        : '';
      return {
        title,
        detailText: limitedText,
        publishTime,
      };
    })()
  `);

  if (!payload || typeof payload !== 'object') {
    throw taxonomyError('extraction_drift', {
      site,
      command: 'detail',
      detail: `detail extraction returned invalid payload: ${targetUrl}`,
    });
  }

  const row = payload as Record<string, unknown>;
  const title = cleanText(row.title);
  const detailText = cleanText(row.detailText);
  const publishTime = cleanText(row.publishTime);
  if (!title && !detailText) {
    throw taxonomyError('empty_result', {
      site,
      command: 'detail',
      detail: `detail page has no readable content: ${targetUrl}`,
    });
  }

  return [
    toProcurementDetailRecord(
      {
        title: title || targetUrl,
        url: targetUrl,
        contextText: detailText,
        publishTime,
      },
      {
        site,
        query,
      },
    ),
  ];
}
