package com.example.analytics

import android.content.Context
import cn.thinkingdata.android.TDAnalytics
import org.json.JSONObject

class AnalyticsTracker(context: Context) {
    init {
        TDAnalytics.init(context.applicationContext, "APP_ID", "https://YOUR_SERVER_URL")
    }

    fun onUserLogin(userId: String) {
        TDAnalytics.login(userId)

        // @tracking select_content
        val properties = JSONObject()
        properties.put("method", "phone")
        TDAnalytics.track("select_content", properties)
    }

    fun onUpgrade(plan: String) {
        val userProperties = JSONObject()
        userProperties.put("plan", plan)
        TDAnalytics.userSet(userProperties)
    }
}
