package com.example.analytics

import android.content.Context
import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics

class AnalyticsTracker(context: Context) {
    private val firebaseAnalytics = FirebaseAnalytics.getInstance(context)

    fun onUserLogin(userId: String) {
        firebaseAnalytics.setUserId(userId)

        val bundle = Bundle()
        bundle.putString("method", "phone")
        firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SELECT_CONTENT, bundle)
    }

    fun onUpgrade(plan: String) {
        firebaseAnalytics.setUserProperty("plan", plan)
    }
}
