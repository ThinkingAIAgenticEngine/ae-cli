import analytics from '@react-native-firebase/analytics';

async function initUser(user) {
  await analytics().setUserId(user.id);
  await analytics().setUserProperties({ plan: 'pro' });
}

async function logSignUp(user) {
  await analytics().logEvent('sign_up', { method: 'phone' });
}

async function logPurchase(user, order) {
  await analytics().logEvent('purchase', { order_id: order.id, amount: order.amount, currency: 'USD' });
}
