import mixpanel from 'mixpanel-browser';
import { EVENT_PURCHASE } from './constants.js';

export function trackPurchase(order) {
  // Event: purchase — kept in dual-write for a staged roll-out
  mixpanel.track(EVENT_PURCHASE, { order_id: order.id, amount: order.total });
}
