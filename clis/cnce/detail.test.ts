import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { __test__ } from './detail.js';

describe('cnce detail', () => {
  const command = getRegistry().get('cnce/detail');

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('extracts noticeId from the frontend detail route', () => {
    expect(__test__.extractNoticeId(
      'https://scm.esinochem.com/hpc/index.html#/content?noticeId=2000376870309748738&noticeType=01&bid=1996759401458167809',
    )).toBe('2000376870309748738');
  });

  it('maps cnce detail api content into procurement detail rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: true,
      code: '000000',
      data: {
        noticeId: '2000376870309748738',
        title: '融科橄榄家园3号楼5号楼8台电梯更新项目招标公告',
        noticeTypeName: '招标公告',
        plateTypeName: '招标系统公告',
        purchaseCompanyName: '中化商务有限公司',
        buName: '金茂服务',
        purchaseMethodDesc: '招标',
        requireTypeDesc: '物资',
        startTime: '2025-12-15T09:26:24.000+08:00',
        endTime: '2026-01-05T09:00:00.000+08:00',
        content: '<p>招标编号/包号：0747-2560SCCZG467/01</p><p>投标文件递交截止时间：2026年1月5日9:00。</p>',
        attachmentsDTOs: [
          {
            name: '招标公告.pdf',
            url: 'https://scm.esinochem.com/example.pdf',
          },
        ],
      },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const rows = await command!.func!(null as never, {
      url: 'https://scm.esinochem.com/hpc/index.html#/content?noticeId=2000376870309748738&noticeType=01&bid=1996759401458167809',
      query: '电梯',
    }) as Array<Record<string, unknown>>;

    expect(fetchMock).toHaveBeenCalledWith(
      'https://scm.esinochem.com/gateway/obs/business/notice/outer/query/getDetail',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ noticeId: '2000376870309748738' }),
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: '融科橄榄家园3号楼5号楼8台电梯更新项目招标公告',
      publish_time: '2025-12-15',
      source_site: 'cnce',
      content_type: 'notice',
      url: 'https://scm.esinochem.com/hpc/index.html#/content?noticeId=2000376870309748738&noticeType=01&bid=1996759401458167809',
    });
    expect(rows[0].detail_text).toContain('0747-2560SCCZG467/01');
    expect(rows[0].detail_text).toContain('投标文件递交截止时间');
  });
});
