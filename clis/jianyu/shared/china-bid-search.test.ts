import { describe, expect, it } from 'vitest';
import { __test__, searchRowsFromEntries } from './china-bid-search.js';

describe('china-bid-search shared helpers', () => {
  it('classifies detached context failures as retryable', () => {
    expect(__test__.isRetryableSearchError(new Error('Detached while handling command.'))).toBe(true);
    expect(__test__.isRetryableSearchError(new Error('Execution context was destroyed'))).toBe(true);
    expect(__test__.isRetryableSearchError(new Error('some other error'))).toBe(false);
  });

  it('retries search extraction after detached context errors', async () => {
    let evaluateAttempts = 0;
    const page = {
      goto: async () => {},
      wait: async () => {},
      evaluate: async () => {
        evaluateAttempts += 1;
        if (evaluateAttempts === 1) {
          throw new Error('Detached while handling command.');
        }
        return [];
      },
    };

    const rows = await searchRowsFromEntries(page as never, {
      query: '电梯',
      candidateUrls: ['https://bid.powerchina.cn/search?keyword=%E7%94%B5%E6%A2%AF'],
      allowedHostFragments: ['bid.powerchina.cn'],
      limit: 20,
    });

    expect(rows).toEqual([]);
    expect(evaluateAttempts).toBe(2);
  });

  it('throws non-retryable extraction errors immediately', async () => {
    const page = {
      goto: async () => {},
      wait: async () => {},
      evaluate: async () => {
        throw new Error('fatal parser error');
      },
    };

    await expect(searchRowsFromEntries(page as never, {
      query: '电梯',
      candidateUrls: ['https://bid.powerchina.cn/search?keyword=%E7%94%B5%E6%A2%AF'],
      allowedHostFragments: ['bid.powerchina.cn'],
      limit: 20,
    })).rejects.toThrow('fatal parser error');
  });
});
