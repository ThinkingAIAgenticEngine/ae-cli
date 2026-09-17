const amplitude = require('@amplitude/analytics-node');
const ThinkingData = require('thinkingdata-node');

// Initialize Amplitude (server SDK) — kept for dual-write (add mode)
try {
  amplitude.init('YOUR_AMPLITUDE_API_KEY');
} catch (e) {
  // Amplitude unavailable — its writes below no-op; AE still runs
}

// Initialize AE (server SDK)
let teSDK = null;
try {
  teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', { filePrefix: 'test' });
} catch (e) {
  // AE unavailable — its writes below no-op; Amplitude still runs
}

// user_signup — identity rides on the event (server SDK has no global setUserId)
function handleSignup(user) {
  try {
    amplitude.track('user_signup', { plan: 'pro' }, { user_id: user.id });
  } catch (e) {
    // Amplitude unavailable — swallow; AE write still runs
  }
  try {
    // @tracking user_signup
    teSDK.track({ accountId: user.id, event: 'user_signup', properties: { plan: 'pro' } });
  } catch (e) {
    // AE unavailable — swallow
  }
}

// purchase — identity rides on the event
function handlePurchase(user, order) {
  try {
    amplitude.track('purchase', { order_id: order.id, amount: order.amount }, { user_id: user.id });
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
