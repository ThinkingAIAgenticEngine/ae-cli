import com.sensorsdata.analytics.javasdk.SensorsAnalytics;
import java.util.HashMap;
import java.util.Map;

public class AnalyticsService {
    private final SensorsAnalytics sa;

    public AnalyticsService(String logPath) {
        this.sa = new SensorsAnalytics(new SensorsAnalytics.ConcurrentLoggingConsumer(logPath));
    }

    public void onSignup(String userId, String plan) {
        Map<String, Object> props = new HashMap<>();
        props.put("plan", plan);
        sa.track(userId, true, "user_signup", props);
    }

    public void onPurchase(String userId, String orderId, double amount) {
        Map<String, Object> props = new HashMap<>();
        props.put("order_id", orderId);
        props.put("amount", amount);
        sa.track(userId, true, "purchase", props);
    }
}
