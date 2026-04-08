import { describe, expect, it } from 'vitest';
import { __test__ } from './search.js';

describe('ggzy search helpers', () => {
  it('builds candidate URLs with keyword params', () => {
    const candidates = __test__.buildSearchCandidates('elevator');
    expect(candidates.some((item) => item.includes('keyword=elevator'))).toBe(true);
    expect(candidates.some((item) => item.includes('ggzy.gov.cn'))).toBe(true);
  });

  it('normalizes date text', () => {
    expect(__test__.normalizeDate('2026-4-8')).toBe('2026-04-08');
    expect(__test__.normalizeDate('发布时间：2026年04月08日')).toBe('2026-04-08');
  });

  it('deduplicates title/url pairs', () => {
    const deduped = __test__.dedupeCandidates([
      { title: 'A', url: 'https://a.com/1', date: '2026-04-08' },
      { title: 'A', url: 'https://a.com/1', date: '2026-04-08' },
      { title: 'A', url: 'https://a.com/2', date: '2026-04-08' },
    ]);
    expect(deduped).toHaveLength(2);
  });
});
