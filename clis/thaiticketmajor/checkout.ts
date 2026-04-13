import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { buildFlowStatus, clickAnyByText, extractAvailableCheckoutOptions, maybePassEnterSite, normalizeDeliveryMethod, normalizePaymentMethod, probeCurrentPage } from './shared.js';

cli({
  site: 'thaiticketmajor',
  name: 'checkout',
  description: 'Prepare ThaiTicketMajor checkout by selecting payment and delivery options',
  domain: 'booking.thaiticketmajor.com',
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [
    { name: 'url', required: true, positional: true, help: 'Checkout page URL' },
    { name: 'payment', default: 'auto', help: 'Payment method: auto, alipay, visa, wechat' },
    { name: 'delivery', default: 'venue-pickup', help: 'Delivery method: auto, venue-pickup, delivery' },
    { name: 'confirm', type: 'boolean', default: false, help: 'Attempt the final confirm click' },
  ],
  columns: ['stage', 'selected_payment', 'selected_delivery', 'confirm_attempted', 'confirm_ready', 'url'],
  func: async (page, kwargs) => {
    const url = String(kwargs.url || '').trim();
    const payment = normalizePaymentMethod(String(kwargs.payment || 'auto'));
    const delivery = normalizeDeliveryMethod(String(kwargs.delivery || 'venue-pickup'));
    const confirm = kwargs.confirm === true || kwargs.confirm === 'true';

    await page.goto(url);
    await page.wait({ time: 2 });
    await maybePassEnterSite(page);

    let probe = await probeCurrentPage(page, 180);
    let status = buildFlowStatus(probe);
    if (status.stage !== 'checkout') {
      throw new CommandExecutionError(
        `ThaiTicketMajor checkout requires a payment page, but the current stage is ${status.stage}`,
        'Advance the booking flow to the payment page, then retry this command.',
      );
    }

    if (payment !== 'auto') {
      await clickAnyByText(page, [payment]);
      await page.wait({ time: 0.5 });
    }
    if (delivery !== 'auto') {
      await clickAnyByText(page, [delivery, '现场取票', 'venue pickup']);
      await page.wait({ time: 0.5 });
    }
    if (confirm) {
      await clickAnyByText(page, ['pay now', 'confirm', 'submit payment', 'continue']);
      await page.wait({ time: 1 });
    }

    probe = await probeCurrentPage(page, 180);
    status = buildFlowStatus(probe);
    return [{
      ...status,
      selected_payment: payment,
      selected_delivery: delivery,
      available_payment_methods: extractAvailableCheckoutOptions(probe, 'payment'),
      available_delivery_methods: extractAvailableCheckoutOptions(probe, 'delivery'),
      confirm_attempted: confirm,
      confirm_ready: status.stage === 'checkout',
      url: probe.url,
    }];
  },
});

export const __test__ = {
  normalizePaymentMethod,
  normalizeDeliveryMethod,
};

