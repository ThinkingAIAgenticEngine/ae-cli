package com.example.analytics

import com.sensorsdata.analytics.android.sdk.SensorsDataAPI
import org.json.JSONObject

class AnalyticsHelper {
    private val sa: SensorsDataAPI
        get() = SensorsDataAPI.sharedInstance()

    fun onLogin(userId: String) {
        sa.login(userId)
    }

    fun onViewItem(itemId: String, price: Double) {
        val props = JSONObject()
        props.put("item_id", itemId)
        props.put("price", price)
        sa.track("view_item", props)
    }

    fun onSetPlan(plan: String) {
        val props = JSONObject()
        props.put("plan", plan)
        sa.profileSet(props)
    }
}
