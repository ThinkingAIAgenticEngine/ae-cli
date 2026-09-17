import com.sensorsdata.analytics.javasdk.SensorsAnalytics;
import cn.thinkingdata.java.TDAnalytics;
import cn.thinkingdata.java.TDLoggerConsumer;
import java.util.HashMap;
import java.util.Map;

public class AnalyticsService {
    private final SensorsAnalytics sa;
    private final TDAnalytics te;

    public AnalyticsService(String logPath) {
        SensorsAnalytics sa = null;
        TDAnalytics te = null;
        try {
            sa = new SensorsAnalytics(new SensorsAnalytics.ConcurrentLoggingConsumer(logPath));
        } catch (Exception e) {
            // Sensors Data unavailable — its writes below no-op; AE still runs
        }
        try {
            te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);
        } catch (Exception e) {
            // AE unavailable — its writes below no-op; Sensors Data still runs
        }
        this.sa = sa;
        this.te = te;
    }

    public void onSignup(String userId, String plan) {
        Map<String, Object> props = new HashMap<>();
        props.put("plan", plan);
        try {
            sa.track(userId, true, "user_signup", props);
        } catch (Exception e) {
            // Sensors Data unavailable — swallow; AE write still runs
        }
        try {
            // @tracking user_signup
            te.track(userId, null, "user_signup", props);
        } catch (Exception e) {
            // AE unavailable — swallow
        }
    }

    public void onPurchase(String userId, String orderId, double amount) {
        Map<String, Object> props = new HashMap<>();
        props.put("order_id", orderId);
        props.put("amount", amount);
        try {
            sa.track(userId, true, "purchase", props);
        } catch (Exception e) {
            // Sensors Data unavailable — swallow; AE write still runs
        }
        try {
            // @tracking purchase
            te.track(userId, null, "purchase", props);
        } catch (Exception e) {
            // AE unavailable — swallow
        }
    }
}
