const authorizeResponse = {
  device_code: 'workbuddy-device-code',
  user_code: 'WB-123',
  verification_uri: 'https://ignored.example.com/device-activate',
  verification_uri_complete: 'https://ignored.example.com/device-activate?user_code=WB-123',
  expires_in: 0.05,
  interval: 0.001,
};

globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.endsWith('/api/auth/device/authorize')) {
    return new Response(JSON.stringify(authorizeResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.endsWith('/api/auth/device/token')) {
    return new Response(JSON.stringify({
      access_token: 'workbuddy-access-token',
      refresh_token: 'workbuddy-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.endsWith('/v1/ta/cli/token/generate')) {
    return new Response(JSON.stringify({
      return_code: 0,
      data: { userSecret: 'workbuddy-cli-token' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  throw new Error(`Unexpected test request: ${url}`);
};
