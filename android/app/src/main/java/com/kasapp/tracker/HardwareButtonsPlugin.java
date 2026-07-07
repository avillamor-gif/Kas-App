package com.kasapp.tracker;

import android.content.SharedPreferences;
import android.view.KeyEvent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * HardwareButtonsPlugin - Tracks hardware button state
 * When tracking is active, the frontend is prevented from allowing certain actions.
 */
@CapacitorPlugin(name = "HardwareButtons")
public class HardwareButtonsPlugin extends Plugin {

    private static final String TRACKING_ACTIVE_KEY = "tracking_active";
    private static final String PREFS_NAME = "kas_app_prefs";
    private boolean trackingActive = false;

    @Override
    public void load() {
        super.load();
        // Load tracking status from SharedPreferences
        loadTrackingStatus();
    }

    @PluginMethod
    public void setTrackingActive(PluginCall call) {
        boolean active = call.getBoolean("active", false);
        trackingActive = active;
        
        // Save to SharedPreferences
        saveTrackingStatus(active);
        
        JSObject result = new JSObject();
        result.put("trackingActive", active);
        result.put("message", active ? "Tracking locked" : "Tracking unlocked");
        call.resolve(result);
    }

    @PluginMethod
    public void getTrackingActive(PluginCall call) {
        JSObject result = new JSObject();
        result.put("trackingActive", trackingActive);
        call.resolve(result);
    }

    private void saveTrackingStatus(boolean active) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        prefs.edit().putBoolean(TRACKING_ACTIVE_KEY, active).apply();
    }

    private void loadTrackingStatus() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        trackingActive = prefs.getBoolean(TRACKING_ACTIVE_KEY, false);
    }
}
