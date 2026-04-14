import { CommandExecutionError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';

export const TTM_HOME_URL = 'https://www.thaiticketmajor.com/';
export const TTM_LOGIN_URL = 'https://booking.thaiticketmajor.com/tickets/register/?la=en';
export const TTM_HOSTS = ['www.thaiticketmajor.com', 'booking.thaiticketmajor.com'];
export const TTM_QUEUE_HOST_HINTS = ['queue-it.net', 'thaiticketmajor.queue-it.net'];

export type TicketStage =
  | 'enter-site'
  | 'login'
  | 'captcha'
  | 'event-detail'
  | 'session-list'
  | 'queue-countdown'
  | 'queue-progress'
  | 'zone-map'
  | 'seat-map'
  | 'checkout'
  | 'access-restricted'
  | 'unknown';

export interface PageActionCandidate {
  text: string;
  href: string;
  tag: string;
  disabled: boolean;
  ariaLabel: string;
  className: string;
}

export interface PageProbe {
  url: string;
  title: string;
  text: string;
  actions: PageActionCandidate[];
}

export interface FlowStatus {
  ok: boolean;
  stage: TicketStage;
  url: string;
  requires_login?: boolean;
  requires_captcha?: boolean;
  access_restricted?: boolean;
  hint?: string;
}

export interface SearchRow {
  rank: number;
  title: string;
  venue: string;
  sale_status: string;
  show_count: number;
  url: string;
  source_page: string;
}

export interface ShowEntry {
  label: string;
  date: string;
  time: string;
}

export interface DetailRow extends FlowStatus {
  title: string;
  venue: string;
  booking_url: string;
  buy_button_state: string;
  price_tiers: string[];
  shows: ShowEntry[];
  show_count: number;
  payment_methods: string[];
}

export interface QueueState extends FlowStatus {
  countdown: string;
  progress_percent: number | null;
  message: string;
}

export interface ZoneRow {
  zone: string;
  available: boolean;
  price_hint: string;
  action_url: string;
}

export interface RetryDecisionInput {
  attempts: number;
  maxAttempts: number;
  lastReason?: string;
  hasFallbackZone?: boolean;
}

export type RetryDecision = 'retry' | 'switch-zone' | 'give-up';

interface DetailInput {
  url: string;
  title: string;
  text: string;
  actions: PageActionCandidate[];
}

const BUY_HINT = /(buy ticket|book now|book ticket|ticket|reserve|purchase)/i;
const SOLD_OUT_HINT = /(sold out|coming soon|not on sale|waitlist|full|unavailable|หมด|售罄)/i;
const PAYMENT_HINT = /(payment method|visa|mastercard|wechat|alipay|card number|security code|pay now|现场取票|venue pickup|delivery method|pick up ticket)/i;
const CHECKOUT_FORM_HINT = /(payment method|delivery method|card number|security code|pay now|checkout|billing|order summary|confirm payment|place order|pick up ticket)/i;
const SEAT_HINT = /(select seat|seat map|available seat|seat plan|choose seat|row [a-z]|\bseat\b)/i;
const ZONE_HINT = /(\bzone\b|\bsection\b|\barea\b|price zone|seating area|ticket zone)/i;
const EVENT_PATH_HINT = /(concert|event|show|performance|sport|ละคร|seminar|exhibition)/i;
const LOGIN_HINT = /(login|log in|sign in|password|email|member login|register)/i;
const SHOW_HINT = /(show time|showtime|session|performance|รอบการแสดง|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}:\d{2})/i;

export function normalizeText(input: unknown): string {
  return String(input ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function normalizeInline(input: unknown): string {
  return normalizeText(input).replace(/\n+/g, ' ').trim();
}

function normalizeForMatch(input: unknown): string {
  return normalizeInline(input).toLowerCase();
}

function splitLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function titleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split('/').filter(Boolean).pop() || '';
    return slug
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

export function absolutizeUrl(url: string, base = TTM_HOME_URL): string {
  const raw = normalizeInline(url);
  if (!raw) return '';
  try {
    return new URL(raw, base).toString();
  } catch {
    return raw;
  }
}

export function isThaiticketmajorUrl(url: string): boolean {
  try {
    const host = new URL(absolutizeUrl(url)).hostname.toLowerCase();
    return [...TTM_HOSTS, ...TTM_QUEUE_HOST_HINTS].some((fragment) => host.includes(fragment));
  } catch {
    return false;
  }
}

export function looksLikeEventUrl(url: string): boolean {
  try {
    const parsed = new URL(absolutizeUrl(url));
    return EVENT_PATH_HINT.test(parsed.pathname.toLowerCase()) && !/(register|login|queue|checkout|payment|cart)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function queryTokens(query: string): string[] {
  return normalizeForMatch(query)
    .split(/[^a-z0-9\u0e00-\u0e7f]+/i)
    .filter((token) => token.length >= 2);
}

export function matchesQuery(text: string, query: string): boolean {
  const tokens = queryTokens(query);
  if (!tokens.length) return true;
  const haystack = normalizeForMatch(text);
  return tokens.every((token) => haystack.includes(token));
}

export function detectCaptcha(text: string): boolean {
  return /(captcha|recaptcha|verify you are human|human verification|security check|security verification|prove you are human|bot check|robot check|人机验证|机器验证|系统检测到您是机器|检测到您是机器|图片验证|图片排序|验证码|滑动验证|กรุณายืนยันตัวตน|ยืนยันว่าคุณเป็นมนุษย์)/i.test(normalizeText(text));
}

export function detectAccessRestricted(text: string, url: string): boolean {
  const haystack = `${normalizeText(text)}\n${normalizeInline(url)}`;
  return /(访问受到限制|sorry[, ]+your access|access(?: is)? restricted|restricted access|why do i see this|ip地址|ip address|gatekeeper|too many requests|rate limit|request blocked|forbidden|temporarily unavailable)/i.test(haystack);
}

export function extractCountdownText(text: string): string {
  const countdown = normalizeText(text).match(/\b\d{1,2}:\d{2}:\d{2}\b/);
  return countdown?.[0] || '';
}

function extractProgressPercent(text: string): number | null {
  const match = normalizeText(text).match(/(\d{1,3})\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

function inferTitleFromCandidate(candidate: PageActionCandidate): string {
  const lines = splitLines(candidate.text);
  for (const line of lines) {
    if (BUY_HINT.test(line) || SOLD_OUT_HINT.test(line)) continue;
    if (line.length >= 6) return line;
  }
  return normalizeInline(candidate.text) || titleFromUrl(candidate.href);
}

function inferVenue(text: string): string {
  for (const line of splitLines(text)) {
    if (/(venue|hall|arena|stadium|theatre|theater|center|centre|dome|bangkok|impact|show dc)/i.test(line)) {
      return line;
    }
  }
  return '';
}

function inferSaleStatus(text: string, actions: PageActionCandidate[]): string {
  for (const action of actions) {
    for (const line of splitLines(action.text)) {
      if (SOLD_OUT_HINT.test(line)) return 'Sold Out';
      if (BUY_HINT.test(line)) return normalizeInline(line);
    }
  }
  if (SOLD_OUT_HINT.test(text)) return 'Sold Out';
  if (BUY_HINT.test(text)) return 'Buy Ticket';
  if (/on sale soon|presale|pre-sale/i.test(text)) return 'Coming Soon';
  return '';
}

export function parsePriceTiers(text: string): string[] {
  const candidates = new Set<string>();
  const lines = splitLines(text);
  const scopedLines = lines.filter((line) => /(price|ticket|บาท|baht|thb|฿)/i.test(line));
  const source = scopedLines.length > 0 ? scopedLines : lines;

  for (const line of source) {
    for (const match of line.matchAll(/(?:฿|THB|Baht|บาท)?\s*(\d{3,5}(?:,\d{3})?)/gi)) {
      const digits = match[1].replace(/,/g, '');
      const value = Number(digits);
      if (!Number.isFinite(value) || value < 300 || value > 100000) continue;
      candidates.add(String(value));
    }
  }

  return [...candidates].sort((left, right) => Number(left) - Number(right));
}

export function extractShowsFromText(text: string): ShowEntry[] {
  const results: ShowEntry[] = [];
  const seen = new Set<string>();

  for (const line of splitLines(text)) {
    if (!SHOW_HINT.test(line)) continue;
    const dateMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/);
    const timeMatch = line.match(/\b\d{1,2}:\d{2}\b/);
    const label = normalizeInline(line);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    results.push({
      label,
      date: dateMatch?.[1] || '',
      time: timeMatch?.[0] || '',
    });
  }

  return results.slice(0, 20);
}

export function detectTicketStage(snapshot: { url: string; text: string; title?: string }): TicketStage {
  const url = normalizeInline(snapshot.url);
  const text = normalizeText(snapshot.text);
  const title = normalizeInline(snapshot.title);
  const combined = `${title}\n${text}`;

  if (detectAccessRestricted(combined, url)) return 'access-restricted';
  if (/enter site/i.test(combined)) return 'enter-site';

  const isLoginPage = /\/register\/|\/login\b/i.test(url) || LOGIN_HINT.test(combined);
  if (isLoginPage && detectCaptcha(combined)) return 'captcha';
  if (isLoginPage) return 'login';
  if (detectCaptcha(combined)) return 'captcha';

  if (TTM_QUEUE_HOST_HINTS.some((fragment) => url.includes(fragment)) || /\bqueue\b|estimated wait|waiting room|progress bar|countdown/i.test(combined)) {
    return extractCountdownText(combined) ? 'queue-countdown' : 'queue-progress';
  }

  const bookingHost = /booking\.thaiticketmajor\.com/i.test(url);
  if (CHECKOUT_FORM_HINT.test(combined) || (bookingHost && PAYMENT_HINT.test(combined))) return 'checkout';
  if (SEAT_HINT.test(combined)) return 'seat-map';
  if (ZONE_HINT.test(combined) && !SEAT_HINT.test(combined)) return 'zone-map';
  if (SHOW_HINT.test(combined) && BUY_HINT.test(combined)) return 'session-list';
  if (looksLikeEventUrl(url) || BUY_HINT.test(combined)) return 'event-detail';
  return 'unknown';
}

export function buildFlowStatus(probe: PageProbe): FlowStatus {
  const stage = detectTicketStage(probe);
  const requiresCaptcha = stage === 'captcha' || detectCaptcha(probe.text);
  const requiresLogin = stage === 'login' || /member login|log in|sign in|password|email/i.test(probe.text);
  const accessRestricted = stage === 'access-restricted';

  let hint = '';
  if (stage === 'enter-site') {
    hint = 'Open the site landing page and click Enter Site before continuing.';
  } else if (stage === 'login') {
    hint = 'Complete ThaiTicketMajor login in the shared Chrome session, then rerun the command.';
  } else if (stage === 'captcha') {
    hint = 'A human verification challenge is blocking progress. Solve it in Chrome, then retry.';
  } else if (stage === 'access-restricted') {
    hint = 'The site is restricting this IP/session. Thai or Southeast Asia IPs are usually more reliable.';
  }

  return {
    ok: stage !== 'access-restricted' && stage !== 'captcha',
    stage,
    url: probe.url,
    requires_login: requiresLogin || undefined,
    requires_captcha: requiresCaptcha || undefined,
    access_restricted: accessRestricted || undefined,
    hint: hint || undefined,
  };
}

export function mapSearchCards(actions: PageActionCandidate[], limit: number, query: string): SearchRow[] {
  const rows: SearchRow[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const href = absolutizeUrl(action.href);
    const text = normalizeText(action.text);
    if (!href || !text) continue;
    if (!looksLikeEventUrl(href) && !BUY_HINT.test(text)) continue;

    const title = inferTitleFromCandidate(action);
    const sourceText = `${title}\n${text}\n${href}`;
    if (!matchesQuery(sourceText, query)) continue;

    const key = `${title}\t${href}`;
    if (!title || seen.has(key)) continue;
    seen.add(key);

    rows.push({
      rank: rows.length + 1,
      title,
      venue: inferVenue(text),
      sale_status: inferSaleStatus(text, [action]),
      show_count: extractShowsFromText(text).length,
      url: href,
      source_page: href,
    });

    if (rows.length >= limit) break;
  }

  return rows;
}

function extractBookingUrl(actions: PageActionCandidate[]): string {
  const direct = actions.find((action) => action.href && /booking\.thaiticketmajor\.com|queue-it|gatekeeper/i.test(action.href));
  if (direct) return absolutizeUrl(direct.href);

  const buyAction = actions.find((action) => BUY_HINT.test(action.text) && action.href);
  return buyAction ? absolutizeUrl(buyAction.href) : '';
}

export function parseDetailSnapshot(input: DetailInput): DetailRow {
  const probe: PageProbe = {
    url: input.url,
    title: input.title,
    text: input.text,
    actions: input.actions,
  };
  const status = buildFlowStatus(probe);
  const title = normalizeInline(input.title) || inferTitleFromCandidate(input.actions[0] || {
    text: input.text,
    href: input.url,
    tag: 'div',
    disabled: false,
    ariaLabel: '',
    className: '',
  });
  const priceTiers = parsePriceTiers(input.text);
  const shows = extractShowsFromText(`${input.text}\n${input.actions.map((action) => action.text).join('\n')}`);

  return {
    ...status,
    title,
    venue: inferVenue(input.text),
    booking_url: extractBookingUrl(input.actions),
    buy_button_state: inferSaleStatus(input.text, input.actions),
    price_tiers: priceTiers,
    shows,
    show_count: shows.length,
    payment_methods: Array.from(new Set(splitLines(input.text)
      .filter((line) => /(visa|mastercard|wechat|alipay|支付宝|微信)/i.test(line))
      .flatMap((line) => {
        const methods: string[] = [];
        if (/alipay|支付宝/i.test(line)) methods.push('alipay');
        if (/visa|mastercard/i.test(line)) methods.push('visa');
        if (/wechat|微信/i.test(line)) methods.push('wechat');
        return methods;
      }))),
  };
}

export function parseQueueState(probe: PageProbe): QueueState {
  const status = buildFlowStatus(probe);
  const lines = splitLines(probe.text);
  const message = lines.find((line) => /\bqueue\b|wait|progress|estimated|refresh|countdown|验证|限制/i.test(line)) || '';
  return {
    ...status,
    countdown: extractCountdownText(probe.text),
    progress_percent: extractProgressPercent(probe.text),
    message,
  };
}

export function parseZones(probe: PageProbe): ZoneRow[] {
  const rows: ZoneRow[] = [];
  const seen = new Set<string>();

  for (const action of probe.actions) {
    const text = normalizeText(action.text);
    if (!text) continue;
    const normalized = normalizeInline(text);
    if (!ZONE_HINT.test(normalized) && !(/\b[A-Z]\b/.test(normalized) && /\d{3,5}/.test(normalized))) {
      continue;
    }

    const zone = splitLines(text)[0] || normalized;
    if (!zone || seen.has(zone)) continue;
    seen.add(zone);

    const priceHint = parsePriceTiers(text)[0] || '';
    rows.push({
      zone,
      available: !action.disabled && !SOLD_OUT_HINT.test(text),
      price_hint: priceHint,
      action_url: absolutizeUrl(action.href),
    });
  }

  return rows;
}

export function nextSeatRetryDecision(input: RetryDecisionInput): RetryDecision {
  const attempts = Math.max(0, Math.floor(input.attempts));
  const maxAttempts = Math.max(1, Math.floor(input.maxAttempts));
  if (attempts + 1 < maxAttempts) return 'retry';

  if (input.hasFallbackZone && /(seat-locked|selection-not-confirmed|no-seat-candidates)/i.test(input.lastReason || '')) {
    return 'switch-zone';
  }

  return 'give-up';
}

export function normalizePaymentMethod(value: string): string {
  const normalized = normalizeForMatch(value);
  if (!normalized || normalized === 'auto') return 'auto';
  if (/alipay|支付宝/.test(normalized)) return 'alipay';
  if (/visa|mastercard|credit card|card/.test(normalized)) return 'visa';
  if (/wechat|微信/.test(normalized)) return 'wechat';
  return normalized;
}

export function normalizeDeliveryMethod(value: string): string {
  const normalized = normalizeForMatch(value);
  if (!normalized || normalized === 'auto') return 'auto';
  if (/venue|pickup|pick up|现场取票|counter/.test(normalized)) return 'venue-pickup';
  if (/mail|shipping|delivery/.test(normalized)) return 'delivery';
  return normalized;
}

export function extractAvailableCheckoutOptions(probe: PageProbe, kind: 'payment' | 'delivery'): string[] {
  const values = new Set<string>();
  const lines = splitLines(probe.text);
  const scope = kind === 'payment'
    ? /(alipay|visa|mastercard|wechat|支付宝|微信)/i
    : /(venue|pickup|现场取票|delivery|mail|shipping)/i;

  for (const line of lines) {
    if (!scope.test(line)) continue;
    if (kind === 'payment') {
      if (/alipay|支付宝/i.test(line)) values.add('alipay');
      if (/visa|mastercard/i.test(line)) values.add('visa');
      if (/wechat|微信/i.test(line)) values.add('wechat');
    } else {
      if (/venue|pickup|现场取票|counter/i.test(line)) values.add('venue-pickup');
      if (/delivery|mail|shipping/i.test(line)) values.add('delivery');
    }
  }

  return [...values];
}

export function buildPageProbeEvaluate(actionLimit = 120): string {
  return `
    (() => {
      const clean = (value) => String(value ?? '')
        .replace(/\\u00a0/g, ' ')
        .replace(/[ \\t\\r\\f\\v]+/g, ' ')
        .replace(/\\n{3,}/g, '\\n\\n')
        .split('\\n')
        .map((line) => line.trim())
        .join('\\n')
        .trim();
      const actionLimit = ${Math.max(1, actionLimit)};
      const nodes = Array.from(document.querySelectorAll('a[href], button, [role="button"], input[type="button"], input[type="submit"]'));
      const seen = new Set();
      const actions = [];

      for (const node of nodes) {
        if (actions.length >= actionLimit) break;
        const text = clean(node.innerText || node.textContent || node.value || node.getAttribute('aria-label') || node.getAttribute('title') || '');
        const href = clean(node.href || node.getAttribute('href') || node.getAttribute('data-href') || '');
        const ariaLabel = clean(node.getAttribute('aria-label') || '');
        const className = clean(node.getAttribute('class') || '');
        const disabled = Boolean(node.disabled || node.getAttribute('aria-disabled') === 'true' || /disabled/.test(className));
        const tag = String(node.tagName || '').toLowerCase();
        const key = [text, href, tag].join('::');
        if (!text && !href) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        actions.push({ text, href, tag, disabled, ariaLabel, className });
      }

      return {
        url: location.href,
        title: clean(document.title || document.querySelector('h1')?.textContent || ''),
        text: clean(document.body?.innerText || ''),
        actions,
      };
    })()
  `;
}

export async function probeCurrentPage(page: IPage, actionLimit = 120): Promise<PageProbe> {
  const raw = await page.evaluate(buildPageProbeEvaluate(actionLimit)) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') {
    throw new CommandExecutionError('ThaiTicketMajor page probe returned an invalid payload');
  }

  const actions = Array.isArray(raw.actions) ? raw.actions : [];
  return {
    url: normalizeInline(raw.url),
    title: normalizeInline(raw.title),
    text: normalizeText(raw.text),
    actions: actions
      .filter((action): action is Record<string, unknown> => !!action && typeof action === 'object')
      .map((action) => ({
        text: normalizeText(action.text),
        href: absolutizeUrl(normalizeInline(action.href)),
        tag: normalizeInline(action.tag),
        disabled: Boolean(action.disabled),
        ariaLabel: normalizeInline(action.ariaLabel),
        className: normalizeInline(action.className),
      })),
  };
}

export function buildClickAnyByTextEvaluate(patterns: string[]): string {
  return `
    (() => {
      const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const patterns = ${JSON.stringify(patterns)}.map((value) => normalize(value)).filter(Boolean);
      const elements = Array.from(document.querySelectorAll('a[href], button, [role="button"], input[type="button"], input[type="submit"]'));
      let best = null;

      for (const element of elements) {
        const text = normalize(element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (!text) continue;
        const disabled = Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true');
        if (disabled) continue;

        let score = -1;
        for (const pattern of patterns) {
          const tokens = pattern.split(/\\s+/).filter(Boolean);
          if (!tokens.length) continue;
          if (!tokens.every((token) => text.includes(token))) continue;
          score = Math.max(score, tokens.length * 10 - Math.abs(text.length - pattern.length));
        }

        if (score > -1 && (!best || score > best.score)) {
          best = {
            element,
            score,
            text,
            href: element.href || element.getAttribute('href') || '',
          };
        }
      }

      if (!best) {
        return { ok: false, reason: 'not-found' };
      }

      best.element.click();
      return {
        ok: true,
        text: best.text,
        href: best.href,
      };
    })()
  `;
}

export async function clickAnyByText(page: IPage, patterns: string[]): Promise<{ ok: boolean; text?: string; href?: string }> {
  const result = await page.evaluate(buildClickAnyByTextEvaluate(patterns)) as Record<string, unknown>;
  return {
    ok: Boolean(result?.ok),
    text: normalizeInline(result?.text),
    href: absolutizeUrl(normalizeInline(result?.href)),
  };
}

export function buildWaitAndClickAnyByTextEvaluate(patterns: string[], timeoutMs = 1200): string {
  return `
    (() => new Promise((resolve) => {
      const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const timeoutMs = Math.max(50, Math.min(5000, ${Math.floor(timeoutMs)}));
      const patterns = ${JSON.stringify(patterns)}.map((value) => normalize(value)).filter(Boolean);
      const selector = 'a[href], button, [role="button"], input[type="button"], input[type="submit"]';
      let done = false;
      let observer = null;
      let timer = null;
      let ticker = null;

      const cleanup = () => {
        if (observer) observer.disconnect();
        if (timer) clearTimeout(timer);
        if (ticker) clearInterval(ticker);
      };

      const resolveOnce = (payload) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(payload);
      };

      const scoreCandidate = (text, href, className, ariaLabel) => {
        let score = -1;
        for (const pattern of patterns) {
          const tokens = pattern.split(/\\s+/).filter(Boolean);
          if (!tokens.length) continue;
          if (!tokens.every((token) => text.includes(token))) continue;
          score = Math.max(score, tokens.length * 10 - Math.abs(text.length - pattern.length));
        }
        if (score < 0) return score;
        if (/booking\\.thaiticketmajor\\.com|queue-it|zones\\.php|verify_condition/i.test(href || '')) score += 8;
        if (/(join|queue|buy|book|ticket|เข้าคิว|เข้าร่วม)/i.test(text || '')) score += 4;
        if (/(join|queue|buy|book|ticket)/i.test((className || '') + ' ' + (ariaLabel || ''))) score += 2;
        return score;
      };

      const pickBest = () => {
        const elements = Array.from(document.querySelectorAll(selector));
        let best = null;
        for (const element of elements) {
          const text = normalize(element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || element.getAttribute('title') || '');
          if (!text) continue;
          const disabled = Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true');
          if (disabled) continue;
          const href = normalize(element.href || element.getAttribute('href') || '');
          const className = normalize(element.getAttribute('class') || '');
          const ariaLabel = normalize(element.getAttribute('aria-label') || '');
          const score = scoreCandidate(text, href, className, ariaLabel);
          if (score < 0) continue;
          if (!best || score > best.score) {
            best = { element, score, text, href };
          }
        }
        return best;
      };

      const tryClick = () => {
        const best = pickBest();
        if (!best) return false;
        best.element.click();
        resolveOnce({ ok: true, text: best.text, href: best.href });
        return true;
      };

      if (tryClick()) return;

      observer = new MutationObserver(() => {
        tryClick();
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      ticker = setInterval(() => {
        tryClick();
      }, 120);

      timer = setTimeout(() => {
        resolveOnce({ ok: false, reason: 'not-found-timeout' });
      }, timeoutMs);
    }))()
  `;
}

export async function waitAndClickAnyByText(
  page: IPage,
  patterns: string[],
  timeoutMs = 1200,
): Promise<{ ok: boolean; text?: string; href?: string }> {
  const result = await page.evaluate(buildWaitAndClickAnyByTextEvaluate(patterns, timeoutMs)) as Record<string, unknown>;
  return {
    ok: Boolean(result?.ok),
    text: normalizeInline(result?.text),
    href: absolutizeUrl(normalizeInline(result?.href)),
  };
}

export async function maybePassEnterSite(page: IPage): Promise<boolean> {
  const probe = await probeCurrentPage(page);
  if (detectTicketStage(probe) !== 'enter-site') return false;
  const clicked = await clickAnyByText(page, ['enter site']);
  if (clicked.ok) {
    await page.wait({ time: 1.5 });
    return true;
  }
  return false;
}
