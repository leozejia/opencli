import { describe, expect, it } from 'vitest';
import { __test__ } from './search.js';

describe('jianyu search helpers', () => {
  it('builds candidate URLs with supsearch as preferred entry', () => {
    const candidates = __test__.buildSearchCandidates('procurement');
    expect(candidates[0]).toContain('/jylab/supsearch/index.html');
    expect(candidates[0]).toContain('keywords=procurement');
    expect(candidates[0]).toContain('selectType=title');
    expect(candidates[0]).toContain('searchGroup=1');
  });

  it('builds supsearch URL with required query params', () => {
    const url = __test__.buildSearchUrl('procurement');
    expect(url).toContain('keywords=procurement');
    expect(url).toContain('selectType=title');
    expect(url).toContain('searchGroup=1');
  });

  it('normalizes common date formats', () => {
    expect(__test__.normalizeDate('2026-4-7')).toBe('2026-04-07');
    expect(__test__.normalizeDate('2026年4月7日')).toBe('2026-04-07');
    expect(__test__.normalizeDate('发布时间: 2026/04/07 09:00')).toBe('2026-04-07');
  });

  it('deduplicates by title and url', () => {
    const deduped = __test__.dedupeCandidates([
      { title: 'A', url: 'https://example.com/1', date: '2026-04-07' },
      { title: 'A', url: 'https://example.com/1', date: '2026-04-07' },
      { title: 'A', url: 'https://example.com/2', date: '2026-04-07' },
    ]);
    expect(deduped).toHaveLength(2);
  });

  it('filters obvious navigation rows before quality gate', () => {
    const filtered = __test__.filterNavigationRows('电梯', [
      { title: '招标公告', url: 'https://www.jianyu360.cn/list/stype/ZBGG.html', date: '' },
      { title: '帮助中心', url: 'https://www.jianyu360.cn/helpCenter/index', date: '' },
      { title: '某项目电梯采购公告', url: 'https://www.jianyu360.cn/notice/detail/123', date: '2026-04-07' },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('电梯采购公告');
  });
});
