import { logEvent } from 'firebase/analytics';
import { analytics } from './analytics.js';
import { EVENT_ADD_TO_CART } from './constants.js';

export function addToCart(item) {
  // Event: add to cart — name from a module constant, values from the item object
  logEvent(analytics, EVENT_ADD_TO_CART, { item_id: item.id, price: item.price, quantity: item.qty });
}
