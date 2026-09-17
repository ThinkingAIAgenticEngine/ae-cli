package com.example.analytics

import android.content.Context
import cn.thinkingdata.android.TDAnalytics
import org.json.JSONObject

class AnalyticsHelper(context: Context) {
    init {
        TDAnalytics.init(context.applicationContext, "APP_ID", "https://YOUR_SERVER_URL")
    }

    fun onLogin(userId: String) {
        TDAnalytics.login(userId)
    }

    fun onViewItem(itemId: String, price: Double) {
        // @tracking view_item
        val properties = JSONObject()
        properties.put("item_id", itemId)
        properties.put("price", price)
        TDAnalytics.track("view_item", properties)
    }

    fun onSetPlan(plan: String) {
        val userProperties = JSONObject()
        userProperties.put("plan", plan)
        TDAnalytics.userSet(userProperties)
    }
}
