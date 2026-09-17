import { trackEvent } from './analytics.js';

export function checkout(order) {
  trackEvent('purchase', { order_id: order.id, amount: order.total });
}
