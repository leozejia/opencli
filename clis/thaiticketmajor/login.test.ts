import { describe, expect, it } from 'vitest';
import { __test__ } from './login.js';

describe('thaiticketmajor login helpers', () => {
  it('masks email safely', () => {
    expect(__test__.maskEmail('yswuqingping@163.com')).toBe('ys***@163.com');
    expect(__test__.maskEmail('a@b.com')).toBe('**@b.com');
    expect(__test__.maskEmail('bad-format')).toBe('***');
  });

  it('embeds escaped credentials into fill script', () => {
    const script = __test__.buildLoginFillEvaluate('x"y@z.com', 'pa"ss');
    expect(script).toContain('x\\"y@z.com');
    expect(script).toContain('pa\\"ss');
    expect(script).toContain('input[name="username"]');
    expect(script).toContain('credential-input-not-found');
  });

  it('builds a submit fallback script', () => {
    expect(__test__.buildSubmitFallbackEvaluate()).toContain('submit-control-not-found');
  });
});
