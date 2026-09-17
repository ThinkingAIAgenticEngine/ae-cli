import ta from "thinkingdata-browser";

// Initialize AE (client SDK)
ta.init({
  appId: "APP_ID",
  serverUrl: "https://YOUR_SERVER_URL/sync_js",
  autoTrack: {
    pageShow: true,
    pageHide: true
  }
});

// @tracking sign_up
ta.track("sign_up", { signup_method: user.signupMethod });

// User properties → AE user property APIs
ta.userSet({ plan: account.plan });
