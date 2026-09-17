const amplitude = require('@amplitude/analytics-node');
const { EVENT_PURCHASE } = require('./constants.js');

function handlePurchase(user, order) {
  amplitude.track(EVENT_PURCHASE, { order_id: order.id, amount: order.amount }, { user_id: user.id });
}
