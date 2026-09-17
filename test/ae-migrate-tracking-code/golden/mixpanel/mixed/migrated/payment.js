import mixpanel from 'mixpanel-browser';
import ta from "thinkingdata-browser";
import { EVENT_PURCHASE } from './constants.js';

export function trackPurchase(order) {
  // Event: purchase — kept in dual-write for a staged roll-out
  try {
    mixpanel.track(EVENT_PURCHASE, { order_id: order.id, amount: order.total });
  } catch (e) {
    // Mixpanel unavailable — swallow; AE write still runs
  }
  try {
    // @tracking purchase
    ta.track("purchase", { order_id: order.id, amount: order.total });
  } catch (e) {
    // AE unavailable — swallow
  }
}
