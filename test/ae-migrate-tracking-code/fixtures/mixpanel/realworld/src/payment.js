import mixpanel from 'mixpanel-browser';
import { EVENT_PURCHASE } from './constants.js';

export function trackPurchase(order) {
  // Event name from a module constant; dynamic property values from the order object
  mixpanel.track(EVENT_PURCHASE, { order_id: order.id, amount: order.total });
}
