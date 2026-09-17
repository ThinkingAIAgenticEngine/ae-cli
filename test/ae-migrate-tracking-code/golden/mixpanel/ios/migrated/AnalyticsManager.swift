import ThinkingSDK

class AnalyticsManager {
    init() {
        TDAnalytics.start(withAppId: "APP_ID", serverUrl: "https://YOUR_SERVER_URL")
    }

    func onLogin(userId: String) {
        TDAnalytics.login(userId)
    }

    func onViewItem(itemId: String, price: Double) {
        // @tracking view_item
        let properties: [String: Any] = ["item_id": itemId, "price": price]
        TDAnalytics.track("view_item", properties: properties)
    }

    func onSetPlan(plan: String) {
        TDAnalytics.userSet(["plan": plan])
    }
}
