import Mixpanel

class AnalyticsManager {
    func onLogin(userId: String) {
        Mixpanel.mainInstance().identify(distinctId: userId)
    }

    func onViewItem(itemId: String, price: Double) {
        let props: [String: Any] = ["item_id": itemId, "price": price]
        Mixpanel.mainInstance().track(event: "view_item", properties: props)
    }

    func onSetPlan(plan: String) {
        Mixpanel.mainInstance().people.set(properties: ["plan": plan])
    }
}
