import * as amplitude from '@amplitude/analytics-browser';

// Initialize Amplitude (client SDK)
amplitude.init('YOUR_AMPLITUDE_API_KEY');

// Logged-in user identity
amplitude.setUserId(user.id);

// Event: user login
amplitude.track('user_login', { method: 'phone' });

// Event: view item
amplitude.track('view_item', { item_id: 'sku-123', price: 9.99, in_stock: true });

// Event: add to cart
amplitude.track('add_to_cart', { item_id: 'sku-123', quantity: 1 });

// Event: purchase
amplitude.track('purchase', { item_id: 'sku-123', price: 9.99, quantity: 2, currency: 'USD' });

// User properties via Identify
const identify = new amplitude.Identify();
identify.set('plan', 'pro');
identify.setOnce('signup_source', 'organic');
identify.add('logins', 1);
amplitude.identify(identify);
