import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { __test__ } from './search.js';

describe('cnce search helpers', () => {
  const command = getRegistry().get('cnce/search');

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds stable frontend detail urls from api rows', () => {
    const url = __test__.buildDetailUrl({
      noticeId: '2000376870309748738',
      businessId: '1996759401458167809',
      noticeType: '01',
      title: '融科橄榄家园3号楼5号楼8台电梯更新项目招标公告',
    });
    expect(url).toContain('https://scm.esinochem.com/hpc/index.html#/content?');
    expect(url).toContain('noticeId=2000376870309748738');
    expect(url).toContain('bid=1996759401458167809');
  });

  it('normalizes date text', () => {
    expect(__test__.normalizeDate('2026-4-8')).toBe('2026-04-08');
    expect(__test__.normalizeDate('公告时间：2026年4月8日')).toBe('2026-04-08');
  });

  it('deduplicates title/url pairs', () => {
    const deduped = __test__.dedupeCandidates([
      { title: 'A', url: 'https://a.com/1', date: '2026-04-08' },
      { title: 'A', url: 'https://a.com/1', date: '2026-04-08' },
      { title: 'B', url: 'https://a.com/1', date: '2026-04-08' },
    ]);
    expect(deduped).toHaveLength(2);
  });

  it('maps cnce api results into ranked procurement rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: true,
      code: '000000',
      data: {
        root: [
          {
            noticeId: '2000376870309748738',
            title: '融科橄榄家园3号楼5号楼8台电梯更新项目招标公告',
            plateType: 'Bid',
            plateTypeName: '招标系统公告',
            noticeType: '01',
            noticeTypeName: '招标公告',
            startTimeStr: '2025-12-15',
            endTimeStr: '2026-01-05',
            requireTypeDesc: '物资',
            purchaseCompanyName: '中化商务有限公司',
            buName: '金茂服务',
            purchaseMethodDesc: '招标',
            businessId: '1996759401458167809',
          },
        ],
      },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const rows = await command!.func!(null as never, { query: '电梯', limit: 5 }) as Array<Record<string, unknown>>;

    expect(fetchMock).toHaveBeenCalledWith(
      'https://scm.esinochem.com/gateway/obs/business/notice/outer/page/queryPageList',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rank: 1,
      title: '融科橄榄家园3号楼5号楼8台电梯更新项目招标公告',
      publish_time: '2025-12-15',
      source_site: 'cnce',
      content_type: 'notice',
      url: 'https://scm.esinochem.com/hpc/index.html#/content?noticeId=2000376870309748738&noticeType=01&s=01&bid=1996759401458167809&title=%E8%9E%8D%E7%A7%91%E6%A9%84%E6%A6%84%E5%AE%B6%E5%9B%AD3%E5%8F%B7%E6%A5%BC5%E5%8F%B7%E6%A5%BC8%E5%8F%B0%E7%94%B5%E6%A2%AF%E6%9B%B4%E6%96%B0%E9%A1%B9%E7%9B%AE%E6%8B%9B%E6%A0%87%E5%85%AC%E5%91%8A',
    });
  });
});
