const amplitude = require('@amplitude/analytics-node');
const ThinkingData = require('thinkingdata-node');
const { EVENT_PURCHASE } = require('./constants.js');

// Initialize AE (server SDK)
let teSDK = null;
try {
  teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', { filePrefix: 'test' });
} catch (e) {
  // AE unavailable — its writes below no-op; Amplitude still runs
}

function handlePurchase(user, order) {
  try {
    amplitude.track(EVENT_PURCHASE, { order_id: order.id, amount: order.amount }, { user_id: user.id });
  } catch (e) {
    // Amplitude unavailable — swallow; AE write still runs
  }
  try {
    // @tracking purchase
    teSDK.track({ accountId: user.id, event: 'purchase', properties: { order_id: order.id, amount: order.amount } });
  } catch (e) {
    // AE unavailable — swallow
  }
}
