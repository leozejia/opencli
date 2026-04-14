import { CliError, CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  TTM_LOGIN_URL,
  buildFlowStatus,
  clickAnyByText,
  maybePassEnterSite,
  probeCurrentPage,
} from './shared.js';

function maskEmail(value: string): string {
  const raw = String(value || '').trim();
  const [local, domain] = raw.split('@');
  if (!local || !domain) return '***';
  if (local.length <= 2) return `**@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function buildLoginFillEvaluate(email: string, password: string): string {
  return `
    (() => {
      const clean = (v) => String(v ?? '').trim();
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.disabled) return false;
        return true;
      };
      const setNativeValue = (el, value) => {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && typeof desc.set === 'function') {
          desc.set.call(el, value);
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const pickFirst = (root, selectors) => {
        for (const selector of selectors) {
          const found = root.querySelector(selector);
          if (found && isVisible(found)) return found;
        }
        return null;
      };

      const allInputs = Array.from(document.querySelectorAll('input'));
      const passwordInput = allInputs.find((el) => {
        const text = clean((el.getAttribute('name') || '') + ' ' + (el.getAttribute('id') || '') + ' ' + (el.getAttribute('placeholder') || ''));
        return isVisible(el) && ((el.type || '').toLowerCase() === 'password' || /pass|pwd/i.test(text));
      });
      if (!passwordInput) {
        return { ok: false, reason: 'password-input-not-found' };
      }

      const scope = passwordInput.form || passwordInput.closest('form') || document;
      const credentialSelectors = [
        'input[type="email"]',
        'input[name="username"]',
        'input[id="username"]',
        'input[name*="email" i]',
        'input[id*="email" i]',
        'input[name*="user" i]',
        'input[id*="user" i]',
        'input[placeholder*="mail" i]',
        'input[placeholder*="user" i]',
      ];
      const credentialInput =
        pickFirst(scope, credentialSelectors)
        || pickFirst(document, credentialSelectors);
      if (!credentialInput) {
        return { ok: false, reason: 'credential-input-not-found' };
      }

      setNativeValue(credentialInput, ${JSON.stringify(email)});
      setNativeValue(passwordInput, ${JSON.stringify(password)});
      return { ok: true, reason: 'credentials-filled' };
    })()
  `;
}

function buildSubmitFallbackEvaluate(): string {
  return `
    (() => {
      const clean = (v) => String(v ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
        return true;
      };
      const passwordInput = Array.from(document.querySelectorAll('input')).find((el) => {
        const text = clean((el.getAttribute('name') || '') + ' ' + (el.getAttribute('id') || '') + ' ' + (el.getAttribute('placeholder') || ''));
        return isVisible(el) && (((el.type || '').toLowerCase() === 'password') || /pass|pwd/.test(text));
      });
      const form = passwordInput?.form || passwordInput?.closest('form') || null;
      const scope = form || document;
      const candidates = Array.from(scope.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]'));
      const picked = candidates.find((el) => {
        if (!isVisible(el)) return false;
        const text = clean(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '');
        return /login|log in|sign in|member login|submit|continue|เข้าสู่ระบบ|登录|登入/.test(text);
      });
      if (picked) {
        picked.click();
        return { ok: true, reason: 'clicked-submit-candidate' };
      }
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return { ok: true, reason: 'request-submit' };
      }
      return { ok: false, reason: 'submit-control-not-found' };
    })()
  `;
}

cli({
  site: 'thaiticketmajor',
  name: 'login',
  description: 'Fill ThaiTicketMajor login form and submit with account credentials',
  domain: 'booking.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'email', type: 'str', required: false, help: 'Login email (or set TTM_EMAIL)' },
    { name: 'password', type: 'str', required: false, help: 'Login password (or set TTM_PASSWORD)' },
  ],
  columns: ['stage', 'submitted', 'requires_login', 'requires_captcha', 'access_restricted', 'email_masked', 'url'],
  func: async (page, kwargs) => {
    const email = String((kwargs.email as string | undefined) || process.env.TTM_EMAIL || '').trim();
    const password = String((kwargs.password as string | undefined) || process.env.TTM_PASSWORD || '');
    if (!email) {
      throw new CliError('CONFIG', 'Email required', 'Pass --email or set TTM_EMAIL.');
    }
    if (!password) {
      throw new CliError('CONFIG', 'Password required', 'Pass --password or set TTM_PASSWORD.');
    }

    await page.goto(TTM_LOGIN_URL);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);

    const fill = await page.evaluate(buildLoginFillEvaluate(email, password)) as { ok?: boolean; reason?: string };
    if (!fill?.ok) {
      throw new CommandExecutionError('ThaiTicketMajor login form fill failed', fill?.reason || 'unknown-fill-failure');
    }

    let submitted = false;
    const submitByText = await clickAnyByText(page, ['member login', 'login', 'log in', 'sign in', 'เข้าสู่ระบบ', '登录']);
    if (submitByText.ok) {
      submitted = true;
    } else {
      const fallback = await page.evaluate(buildSubmitFallbackEvaluate()) as { ok?: boolean; reason?: string };
      submitted = Boolean(fallback?.ok);
      if (!submitted) {
        throw new CommandExecutionError('ThaiTicketMajor login submit failed', fallback?.reason || 'submit-not-found');
      }
    }
    await page.wait({ time: 2.5 });

    const status = buildFlowStatus(await probeCurrentPage(page, 160));
    return [{
      ...status,
      submitted,
      email_masked: maskEmail(email),
      url: status.url || TTM_LOGIN_URL,
    }];
  },
});

export const __test__ = {
  maskEmail,
  buildLoginFillEvaluate,
  buildSubmitFallbackEvaluate,
};
