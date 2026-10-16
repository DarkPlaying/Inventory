package com.inventoryapp.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StockWidgetPlugin")
public class StockWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(StockWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("totalItemsCount")) {
                editor.putInt("total_items_count", call.getInt("totalItemsCount", 0));
            }
            if (call.hasOption("lowStockCount")) {
                editor.putInt("low_stock_count", call.getInt("lowStockCount", 0));
            }
            if (call.hasOption("outOfStockCount")) {
                editor.putInt("out_of_stock_count", call.getInt("outOfStockCount", 0));
            }
            if (call.hasOption("tasksCount")) {
                editor.putInt("tasks_count", call.getInt("tasksCount", 0));
            }
            if (call.hasOption("nominalBalance")) {
                editor.putInt("nominal_balance", call.getInt("nominalBalance", 0));
            }
            if (call.hasOption("nominalRevenue")) {
                editor.putInt("nominal_revenue", call.getInt("nominalRevenue", 0));
            }
            if (call.hasOption("todayTasksText")) {
                editor.putString("today_tasks_text", call.getString("todayTasksText", "No pending tasks today."));
            }
            if (call.hasOption("tomorrowTasksText")) {
                editor.putString("tomorrow_tasks_text", call.getString("tomorrowTasksText", "All clear for tomorrow."));
            }
            if (call.hasOption("widgetTheme")) {
                editor.putString("widget_theme", call.getString("widgetTheme", "light"));
            }

            editor.apply();

            // Refresh all active widgets immediately
            StockWidgetProvider.notifyDataChanged(context);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPinWidget(PluginCall call) {
        try {
            Context context = getContext();
            String size = call.getString("size", "large");

            SharedPreferences prefs = context.getSharedPreferences(StockWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("preferred_widget_size", size).apply();
            StockWidgetProvider.notifyDataChanged(context);

            JSObject ret = new JSObject();
            ret.put("size", size);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
                ComponentName myProvider = new ComponentName(context, StockWidgetProvider.class);

                if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                    Bundle extras = new Bundle();
                    extras.putString("widget_size", size);

                    Intent pinnedWidgetCallbackIntent = new Intent(context, StockWidgetProvider.class);
                    pinnedWidgetCallbackIntent.setAction("com.inventoryapp.app.PIN_WIDGET_RESULT");

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }

                    PendingIntent successCallback = PendingIntent.getBroadcast(
                        context, 0, pinnedWidgetCallbackIntent, flags
                    );

                    boolean pinned = appWidgetManager.requestPinAppWidget(myProvider, extras, successCallback);
                    ret.put("supported", true);
                    ret.put("pinned", pinned);
                    call.resolve(ret);
                    return;
                }
            }

            ret.put("supported", false);
            ret.put("message", "Direct pinning is not supported by your launcher. You can add it manually by holding your home screen.");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request pin widget: " + e.getMessage());
        }
    }
}
