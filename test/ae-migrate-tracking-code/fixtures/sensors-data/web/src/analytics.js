import sensors from 'sensorsdata';

// Initialize Sensors Data (client SDK)
sensors.init({ server_url: 'https://YOUR_SENSORS_URL', is_track_single_page: true });

// Logged-in user identity
sensors.login(user.id);

// Event: user login
sensors.track('user_login', { method: 'phone' });

// Event: view item
sensors.track('view_item', { item_id: 'sku-123', price: 9.99 });

// User properties (new naming)
sensors.profileSet({ plan: 'pro' });
