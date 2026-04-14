import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { isThaiticketmajorUrl, looksLikeEventUrl, maybePassEnterSite, parseQueueState, probeCurrentPage, waitAndClickAnyByText } from './shared.js';

function normalizePolls(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(7200, Math.floor(parsed)));
}

function shouldAttemptJoinClick(stage: string): boolean {
  return ['event-detail', 'session-list', 'queue-countdown'].includes(stage);
}

function shouldReturnNow(stage: string, wait: boolean): boolean {
  if (!wait) return true;
  return ['captcha', 'queue-progress', 'zone-map', 'seat-map', 'checkout', 'login', 'access-restricted'].includes(stage);
}

function pickLoopWaitSeconds(stage: string, wait: boolean, joinClicked: boolean): number {
  if (!wait) return 1;
  if (!joinClicked && shouldAttemptJoinClick(stage)) return 0.2;
  if (stage === 'queue-progress') return 5;
  if (stage === 'queue-countdown') return 2;
  if (stage === 'event-detail' || stage === 'session-list') return 1;
  return 2;
}

function pickJoinProbeTimeoutMs(stage: string): number {
  if (stage === 'queue-countdown') return 400;
  if (stage === 'event-detail' || stage === 'session-list') return 1200;
  return 600;
}

function shouldNavigateToTarget(currentUrl: string, targetUrl: string, wait: boolean): boolean {
  const current = String(currentUrl || '').trim();
  const target = String(targetUrl || '').trim();
  if (!target) return false;
  if (!wait) return true;
  if (!current) return true;
  if (!isThaiticketmajorUrl(current)) return true;

  if (
    /booking\.thaiticketmajor\.com|queue-it|gatekeeper/i.test(current)
    || looksLikeEventUrl(current)
  ) {
    return false;
  }

  try {
    const currentParsed = new URL(current);
    const targetParsed = new URL(target);
    if (currentParsed.href === targetParsed.href) return false;
    if (currentParsed.hostname === 'www.thaiticketmajor.com' && currentParsed.pathname === '/') {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

cli({
  site: 'thaiticketmajor',
  name: 'queue',
  description: 'Observe ThaiTicketMajor queue, countdown, and waiting-room states',
  domain: 'booking.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'Event or booking URL' },
    { name: 'show', help: 'Preferred show label to click before entering queue' },
    { name: 'wait', type: 'boolean', default: false, help: 'Keep polling for queue state transitions' },
    { name: 'polls', type: 'int', default: 10, help: 'Maximum probe count while waiting' },
  ],
  columns: ['stage', 'countdown', 'progress_percent', 'requires_captcha', 'access_restricted', 'join_clicked', 'attempt', 'url'],
  func: async (page, kwargs) => {
    const url = String(kwargs.url || '').trim();
    const show = String(kwargs.show || '').trim();
    const shouldWait = kwargs.wait === true || kwargs.wait === 'true';
    const polls = normalizePolls(kwargs.polls);
    const actionPatterns = show
      ? [show, 'join in', 'join queue', 'buy ticket', 'book now']
      : ['join in', 'join queue', 'buy ticket', 'book now'];

    const currentUrl = await page.getCurrentUrl?.();
    if (shouldNavigateToTarget(String(currentUrl || ''), url, shouldWait)) {
      await page.goto(url);
      await page.wait({ time: 2 });
    }
    await maybePassEnterSite(page);

    let state = parseQueueState(await probeCurrentPage(page, 180));
    let joinClicked = false;
    let clickedAction = '';

    for (let attempt = 0; attempt < polls; attempt += 1) {
      if (shouldAttemptJoinClick(state.stage) && !joinClicked) {
        const clicked = await waitAndClickAnyByText(page, actionPatterns, pickJoinProbeTimeoutMs(state.stage));
        if (clicked.ok) {
          joinClicked = true;
          clickedAction = String(clicked.text || clicked.href || '').trim();
          await page.wait({ time: 0.4 });
        }
      }

      state = parseQueueState(await probeCurrentPage(page, 180));
      if (state.access_restricted) {
        throw new CommandExecutionError('ThaiTicketMajor queue is blocked by an access restriction page', state.hint);
      }
      if (shouldReturnNow(state.stage, shouldWait)) {
        return [{
          ...state,
          join_clicked: joinClicked || undefined,
          clicked_action: clickedAction || undefined,
          attempt: attempt + 1,
        }];
      }
      await page.wait({ time: pickLoopWaitSeconds(state.stage, shouldWait, joinClicked) });
    }

    return [{
      ...state,
      join_clicked: joinClicked || undefined,
      clicked_action: clickedAction || undefined,
      attempt: polls,
    }];
  },
});

export const __test__ = {
  normalizePolls,
  shouldAttemptJoinClick,
  shouldReturnNow,
  pickLoopWaitSeconds,
  shouldNavigateToTarget,
  parseQueueState,
};
