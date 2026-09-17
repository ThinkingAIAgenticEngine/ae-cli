const Mixpanel = require('mixpanel');
const ThinkingData = require('thinkingdata-node');

// Initialize Mixpanel (server SDK) — kept for dual-write (add mode)
let mixpanel = null;
try {
  mixpanel = Mixpanel.init('YOUR_MIXPANEL_TOKEN');
} catch (e) {
  // Mixpanel unavailable — its writes below no-op; AE still runs
}

// Initialize AE (server SDK)
let teSDK = null;
try {
  teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', { filePrefix: 'test' });
} catch (e) {
  // AE unavailable — its writes below no-op; Mixpanel still runs
}

// user_signup — distinct_id rides inside the event properties (server SDK)
function handleSignup(user) {
  try {
    mixpanel.track('user_signup', { distinct_id: user.id, plan: 'pro' });
  } catch (e) {
    // Mixpanel unavailable — swallow; AE write still runs
  }
  try {
    // @tracking user_signup
    teSDK.track({ accountId: user.id, event: 'user_signup', properties: { plan: 'pro' } });
  } catch (e) {
    // AE unavailable — swallow
  }
}

// purchase — distinct_id rides inside the event properties
function handlePurchase(user, order) {
  try {
    mixpanel.track('purchase', { distinct_id: user.id, order_id: order.id, amount: order.amount });
  } catch (e) {
    // Mixpanel unavailable — swallow; AE write still runs
  }
  try {
    // @tracking purchase
    teSDK.track({ accountId: user.id, event: 'purchase', properties: { order_id: order.id, amount: order.amount } });
  } catch (e) {
    // AE unavailable — swallow
  }
}
