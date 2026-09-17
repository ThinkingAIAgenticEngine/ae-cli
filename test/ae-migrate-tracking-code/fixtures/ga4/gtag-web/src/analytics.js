// gtag.js loaded via <script> (GA4 enhanced measurement snippet)
gtag('js', new Date());
gtag('config', 'G-XXXXXXX');

// Logged-in user identity
gtag('set', 'user_id', user.id);

// Event: sign up
gtag('event', 'sign_up', { method: 'phone' });

// Event: purchase
gtag('event', 'purchase', { order_id: 'ord-1', amount: 99.0, currency: 'USD' });
