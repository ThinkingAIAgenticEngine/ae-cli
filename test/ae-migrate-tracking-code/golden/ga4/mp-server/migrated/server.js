const MEASUREMENT_ID = 'G-XXXXXXX';
const API_SECRET = 'YOUR_API_SECRET';
const ThinkingData = require('thinkingdata-node');

// Initialize AE (server SDK)
let teSDK = null;
try {
  teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', { filePrefix: 'test' });
} catch (e) {
  // AE unavailable — its writes below no-op; Measurement Protocol still runs
}

function mpSend(body) {
  // POST to the GA4 Measurement Protocol endpoint
  return fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// user_signup — user_id rides inside the Measurement Protocol payload
function handleSignup(user) {
  try {
    mpSend({ client_id: 'anon-1', user_id: user.id, name: 'user_signup', plan: 'pro' });
  } catch (e) {
    // Measurement Protocol unavailable — swallow; AE write still runs
  }
  try {
    // @tracking user_signup
    teSDK.track({ accountId: user.id, event: 'user_signup', properties: { plan: 'pro' } });
  } catch (e) {
    // AE unavailable — swallow
  }
}

// purchase — user_id rides inside the Measurement Protocol payload
function handlePurchase(user, order) {
  try {
    mpSend({ client_id: 'anon-1', user_id: user.id, name: 'purchase', order_id: order.id, amount: order.amount });
  } catch (e) {
    // Measurement Protocol unavailable — swallow; AE write still runs
  }
  try {
    // @tracking purchase
    teSDK.track({ accountId: user.id, event: 'purchase', properties: { order_id: order.id, amount: order.amount } });
  } catch (e) {
    // AE unavailable — swallow
  }
}
