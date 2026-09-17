const amplitude = require('@amplitude/analytics-node');

// Initialize Amplitude (server SDK)
amplitude.init('YOUR_AMPLITUDE_API_KEY');

// user_signup — identity rides on the event (server SDK has no global setUserId)
function handleSignup(user) {
  amplitude.track('user_signup', { plan: 'pro' }, { user_id: user.id });
}

// purchase — identity rides on the event
function handlePurchase(user, order) {
  amplitude.track('purchase', { order_id: order.id, amount: order.amount }, { user_id: user.id });
}
